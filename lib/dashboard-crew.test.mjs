import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDashboardCrew} from './dashboard-crew.js';

const at = '2026-11-15T12:00:00Z';
const simulated = name => ({id:name, name, metrics:[['heart','Heart rate',120,'bpm',[100,110,120],[],[at,at,at]]], alerts:[], metricStatuses:{}});

test('Garmin values and histories never inherit simulated readings with the same name', () => {
  const [gabo] = buildDashboardCrew([{id:1, astronautName:'Gabo', garminLinked:true, heartRate:72}], [simulated('Gabo')], new Map(), at);
  assert.equal(gabo.telemetrySource, 'garmin');
  assert.equal(gabo.metrics[0][2], 72);
  assert.deepEqual(gabo.metrics[0][4], [72]);
  assert.equal(gabo.metrics[0][7], 'observed');
});

test('simulated astronauts use the existing EC2 history matched by name', () => {
  const [person] = buildDashboardCrew([{id:2, astronautName:'Alex Morgan', garminLinked:false, heartRate:80}], [simulated('Alex Morgan')], new Map(), at);
  assert.equal(person.id, '2');
  assert.deepEqual(person.metrics[0][4], [100,110,120]);
  assert.equal(person.historySource, 'simulator');
});

test('simulator-only astronauts retain their own names and identifiers', () => {
  const crew = buildDashboardCrew([{id:1, astronautName:'Gabo', garminLinked:true, heartRate:72}], [simulated('Casey Parker')], new Map(), at);
  assert.equal(crew.length, 2);
  assert.equal(crew[1].name, 'Casey Parker');
  assert.equal(crew[1].id, 'simulation:Casey Parker');
  assert.equal(crew[1].telemetrySource, 'simulation');
});

test('live history adds actual changes and preserves timestamps without invented backfill', () => {
  const history = new Map();
  const row = {id:1, astronautName:'Gabo', garminLinked:true, heartRate:72};
  buildDashboardCrew([row], [], history, at);
  const [unchanged] = buildDashboardCrew([row], [], history, '2026-11-15T12:01:00Z');
  assert.deepEqual(unchanged.metrics[0][4], [72]);
  const [updated] = buildDashboardCrew([{...row,heartRate:74}], [], history, '2026-11-15T12:02:00Z');
  assert.deepEqual(updated.metrics[0][4], [72,74]);
  assert.deepEqual(updated.metrics[0][6], [at,'2026-11-15T12:02:00Z']);
});

test('non-numeric backend values do not become numeric chart points', () => {
  const [person] = buildDashboardCrew([{id:3,astronautName:'Priya',garminLinked:false,bloodPressure:'120/80'}], [], new Map(), at);
  assert.equal(person.metrics[0][2], '120/80');
  assert.deepEqual(person.metrics[0][4], []);
});

test('backend mood labels are translated for display without modifying source data', () => {
  const row = {id:1,astronautName:'Gabo',garminLinked:true,mood:'CANSADO'};
  const [person] = buildDashboardCrew([row], [], new Map(), at);
  assert.equal(person.metrics.find(metric=>metric[0]==='mood')[2], 'Tired');
  assert.equal(row.mood,'CANSADO');
});
