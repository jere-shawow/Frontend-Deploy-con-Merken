import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadObservationHistory,saveObservationHistory} from './observation-history.js';
import {buildDashboardCrew} from './dashboard-crew.js';

function fixture(t){const dir=mkdtempSync(join(tmpdir(),'pulsys-history-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return {dir,file:join(dir,'history.json')};}
test('restarting restores original observed values and dates without adding a duplicate',t=>{
  const {file}=fixture(t),key=JSON.stringify(['1','heart']);
  const points=[{value:70,time:'2026-11-15T12:00:00Z',sync:'2026-11-15T12:00:00Z'},
    {value:72,time:'2026-11-15T12:01:00Z',sync:'2026-11-15T12:01:00Z'}];
  saveObservationHistory(file,new Map([[key,points]]));
  const restored=loadObservationHistory(file);
  const [person]=buildDashboardCrew([{id:1,astronautName:'Synthetic crew',garminLinked:true,heartRate:72,garminLastSync:points[1].sync}],[],restored,'2026-11-15T12:02:00Z');
  assert.deepEqual(person.metrics[0][4],[70,72]);assert.deepEqual(person.metrics[0][6],points.map(p=>p.time));
  assert.equal(person.metrics[0][7],'observed');
  assert.equal(JSON.parse(readFileSync(file,'utf8')).sensorMeasurementTimesVerified,false);
});
test('retention keeps the latest 288 original observations and separate crew keys',t=>{
  const {file}=fixture(t);const rows=Array.from({length:300},(_,i)=>({value:i,time:new Date(Date.UTC(2026,0,1,0,i)).toISOString(),sync:null}));
  saveObservationHistory(file,new Map([[JSON.stringify(['1','heart']),rows],[JSON.stringify(['2','heart']),rows.slice(0,2)]]));
  const restored=loadObservationHistory(file);assert.equal(restored.get('["1","heart"]').length,288);assert.equal(restored.get('["1","heart"]')[0].value,12);assert.equal(restored.get('["2","heart"]').length,2);
});
test('invalid or corrupt history is rejected without changing the existing file',t=>{
  const {file}=fixture(t);writeFileSync(file,'broken-json');assert.throws(()=>loadObservationHistory(file));assert.equal(readFileSync(file,'utf8'),'broken-json');
  writeFileSync(file,JSON.stringify({version:1,entries:[['["1","heart"]',[{value:71,time:'not-a-timestamp',sync:null}]]]}));assert.throws(()=>loadObservationHistory(file));
});
test('failed persistence does not modify another history or leave partial snapshots',t=>{
  const {file,dir}=fixture(t);saveObservationHistory(file,new Map());const before=readFileSync(file,'utf8');
  writeFileSync(join(dir,'blocked'),'regular file');assert.throws(()=>saveObservationHistory(join(dir,'blocked','history.json'),new Map()));
  assert.equal(readFileSync(file,'utf8'),before);assert.equal(readdirSync(dir).some(n=>n.endsWith('.pending')),false);
});
test('the existing in-memory mode still works when no file is configured',()=>{
  assert.equal(loadObservationHistory(undefined).size,0);assert.doesNotThrow(()=>saveObservationHistory(undefined,new Map()));
});
