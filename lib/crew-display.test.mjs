import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleCrew,reportedMood,moodPresentation,translateMood} from './crew-display.js';

test('dashboard caps every crew view at seven while keeping Garmin astronauts', () => {
  const crew = Array.from({length:11}, (_,index) => ({id:String(index),telemetrySource:'simulation',historySource:'simulator'}));
  crew[10] = {id:'gabo',telemetrySource:'garmin',historySource:'observations'};
  const visible = visibleCrew(crew);
  assert.equal(visible.length,7);
  assert.equal(visible[0].id,'gabo');
  assert.deepEqual(visible.slice(1).map(person=>person.id),['0','1','2','3','4','5']);
  assert.equal(crew[0].id,'0');
});

test('existing histories take priority over current-only simulated profiles', () => {
  assert.deepEqual(visibleCrew([{id:'latest',telemetrySource:'simulation'},{id:'history',telemetrySource:'simulation',historySource:'simulator'}],1).map(person=>person.id),['history']);
  assert.deepEqual(visibleCrew([]),[]);
});

test('mood is reported as supplied and never inferred from heart rate', () => {
  assert.equal(reportedMood({metrics:[['heart','Heart rate',120]]}),null);
  assert.equal(reportedMood({metrics:[['mood','Mood','VERY_HAPPY']]}),'Very happy');
  assert.equal(reportedMood({metrics:[['mood','Mood',0]]}),'0');
  assert.equal(reportedMood({metrics:[['mood','Mood',8,'score_0_10']]}),'8/10');
});

test('Spanish moods are displayed in English and react to changed source values', () => {
  const person = mood => ({metrics:[['mood','Mood',mood]]});
  assert.deepEqual(moodPresentation(person('CANSADO')), {label:'Tired',tone:'tired'});
  assert.deepEqual(moodPresentation(person('FELIZ')), {label:'Happy',tone:'positive'});
  assert.deepEqual(moodPresentation(person('ESTRESADO')), {label:'Stressed',tone:'low'});
  assert.equal(translateMood('  enérgica  '),'Energetic');
  assert.equal(translateMood(null),null);
});

test('mood score presentation follows incoming scores without changing the values', () => {
  const person = score => ({metrics:[['mood','Mood',score,'score_0_10']]});
  assert.deepEqual(moodPresentation(person(8)), {label:'8/10',tone:'positive'});
  assert.deepEqual(moodPresentation(person(5)), {label:'5/10',tone:'neutral'});
  assert.deepEqual(moodPresentation(person(2)), {label:'2/10',tone:'low'});
});
