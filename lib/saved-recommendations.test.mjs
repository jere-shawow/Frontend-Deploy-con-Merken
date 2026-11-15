import assert from 'node:assert/strict';
import test from 'node:test';
import {readRecommendations,saveRecommendation,recommendationKey,recommendationSections} from './saved-recommendations.js';

function memoryStorage(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}
function result(id='1',summary='Synthetic mission example. Contact the mission lead.'){
  return {astronautId:id,generatedAt:'2026-11-15T12:00:00Z',narrative:{summary,sourceIds:[]},context:{readings:[],existingAlerts:[]}};
}
test('saved snapshots survive rereading and remain separated by astronaut',()=>{
  const storage=memoryStorage(),original=result();
  saveRecommendation(storage,'1',original);
  assert.deepEqual(readRecommendations(storage,'1')[0].result,original);
  assert.deepEqual(readRecommendations(storage,'2'),[]);
  assert.throws(()=>saveRecommendation(storage,'2',original),/selected astronaut/);
  assert.equal(readRecommendations(storage,'1').length,1);
});
test('saving again does not duplicate or discard older results',()=>{
  const storage=memoryStorage();saveRecommendation(storage,'1',result());saveRecommendation(storage,'1',result());
  assert.equal(readRecommendations(storage,'1').length,1);
  saveRecommendation(storage,'1',{...result(),generatedAt:'2026-11-15T13:00:00Z'});
  assert.equal(readRecommendations(storage,'1').length,2);
});
test('corrupt history is preserved rather than overwritten',()=>{
  const storage=memoryStorage();storage.setItem(recommendationKey('1'),'damaged');
  assert.throws(()=>saveRecommendation(storage,'1',result()));
  assert.equal(storage.getItem(recommendationKey('1')),'damaged');
});
test('quota failure is reported without replacing existing history',()=>{
  const storage=memoryStorage();saveRecommendation(storage,'1',result());
  const before=storage.getItem(recommendationKey('1'));
  storage.setItem=()=>{throw new Error('Quota exceeded');};
  assert.throws(()=>saveRecommendation(storage,'1',{...result(),generatedAt:'2026-11-15T14:00:00Z'}));
  assert.equal(storage.getItem(recommendationKey('1')),before);
});
test('organizes original instructions and preserves conditions on later leisure',()=>{
  const text='Synthetic snapshot. Contact the mission lead. Once the medical review is complete, consider reading if your schedule permits.';
  const sections=recommendationSections(text);
  assert.deepEqual(sections.map(s=>s.title),['Mission assessment','Recommended next steps','Off-duty options']);
  assert.equal(sections.map(s=>s.text).join(' '),text);
});
test('removes repeated provider prefixes without fabricating absent next steps',()=>{
  assert.deepEqual(recommendationSections('Nova ProNova Pro: Synthetic snapshot.'),[{title:'Assessment and recommendations',text:'Synthetic snapshot.'}]);
  assert.deepEqual(recommendationSections(''),[]);
});
