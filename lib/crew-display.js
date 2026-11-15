export function visibleCrew(crew, limit = 7) {
  const priority = person => person.telemetrySource === 'garmin' ? 0 : person.historySource === 'simulator' ? 1 : 2;
  return crew.map((person,index) => ({person,index})).sort((a,b) => priority(a.person)-priority(b.person) || a.index-b.index)
    .slice(0, limit).map(({person}) => person);
}

const moods = {
  CANSADO:'Tired', CANSADA:'Tired', TIRED:'Tired', FATIGADO:'Fatigued', FATIGADA:'Fatigued',
  AGOTADO:'Exhausted', AGOTADA:'Exhausted', EXHAUSTED:'Exhausted', FATIGUED:'Fatigued',
  FELIZ:'Happy', HAPPY:'Happy', CONTENTO:'Content', CONTENTA:'Content', CONTENT:'Content',
  MUY_FELIZ:'Very happy', VERY_HAPPY:'Very happy', TRISTE:'Sad', SAD:'Sad',
  ESTRESADO:'Stressed', ESTRESADA:'Stressed', STRESSED:'Stressed',
  TRANQUILO:'Calm', TRANQUILA:'Calm', CALMADO:'Calm', CALMADA:'Calm', CALM:'Calm',
  RELAJADO:'Relaxed', RELAJADA:'Relaxed', RELAXED:'Relaxed',
  ANSIOSO:'Anxious', ANSIOSA:'Anxious', ANXIOUS:'Anxious',
  PREOCUPADO:'Worried', PREOCUPADA:'Worried', WORRIED:'Worried',
  ENOJADO:'Angry', ENOJADA:'Angry', ANGRY:'Angry', IRRITABLE:'Irritable',
  MOTIVADO:'Motivated', MOTIVADA:'Motivated', MOTIVATED:'Motivated',
  ENERGICO:'Energetic', ENERGICA:'Energetic', ENERGETIC:'Energetic',
  ANIMADO:'Upbeat', ANIMADA:'Upbeat', UPBEAT:'Upbeat',
  ABURRIDO:'Bored', ABURRIDA:'Bored', BORED:'Bored',
  NERVIOSO:'Nervous', NERVIOSA:'Nervous', NERVOUS:'Nervous',
  BIEN:'Good', GOOD:'Good', MAL:'Unwell', UNWELL:'Unwell', NORMAL:'Neutral', NEUTRO:'Neutral', NEUTRAL:'Neutral',
};

export function translateMood(value) {
  if (typeof value !== 'string') return value;
  const key = value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[\s-]+/g,'_');
  return moods[key] ?? value.trim().replaceAll('_',' ');
}

export function moodPresentation(person) {
  const metric = person.metrics.find(metric => metric[0] === 'mood');
  const value = metric?.[2];
  if (value == null || value === '') return {label:null,tone:'unknown'};
  const scale = /^score_0_(\d+)$/.exec(metric[3] ?? '');
  const label = scale ? `${value}/${scale[1]}` : String(translateMood(value));
  let tone = 'neutral';
  if (scale && Number.isFinite(Number(value)) && Number(scale[1]) > 0) {
    const ratio = Number(value) / Number(scale[1]);
    tone = ratio >= .7 ? 'positive' : ratio < .4 ? 'low' : 'neutral';
  } else if (['Tired','Fatigued','Exhausted'].includes(label)) tone = 'tired';
  else if (['Happy','Very happy','Content','Relaxed','Calm','Motivated','Energetic','Upbeat','Good'].includes(label)) tone = 'positive';
  else if (['Sad','Stressed','Anxious','Worried','Angry','Irritable','Nervous','Unwell'].includes(label)) tone = 'low';
  return {label,tone};
}

export function reportedMood(person) {
  return moodPresentation(person).label;
}

export function crewSource(person) {
  return person.telemetrySource === 'garmin' ? 'Garmin linked' : person.telemetrySource === 'simulation' ? 'Simulated' : 'Backend';
}
