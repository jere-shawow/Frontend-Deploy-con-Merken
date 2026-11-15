import {translateMood} from './crew-display.js';

const fields = [
  ['heart','Heart rate','heartRate','bpm'],
  ['oxygen','Blood oxygen','oxygenInBlood','%'],
  ['temperature','Body temperature','bodyTemperature','°C'],
  ['sleep','Sleep','sleepHours','h'],
  ['radiation','Space radiation','spaceRadiation','mSv/day'],
  ['glucose','Blood glucose','bloodSugar','mg/dL'],
  ['distance','Distance from Earth','distanceFromEarth','km'],
  ['nutrition','Nutrition','nutrition','kcal/day'],
  ['pressure','Blood pressure','bloodPressure','mmHg'],
  ['battery','Body battery','bodyBattery','/ 100'],
  ['hrv','Heart rate variability','hrv','ms'],
  ['mood','Mood','mood',''],
];

export function buildDashboardCrew(rows, simulatedCrew, history, observedAt, health = []) {
  const assessmentById = new Map(health.map(item => [String(item.astronautId), item.parameters ?? []]));
  const simulatedByName = new Map(simulatedCrew.map(person => [person.name.trim().toLowerCase(), person]));
  const crew = rows.map(row => {
    const id = String(row.id);
    const name = row.astronautName;
    // A Garmin-linked astronaut must never inherit synthetic history, even if names match.
    const simulated = row.garminLinked === false ? simulatedByName.get(name.trim().toLowerCase()) : undefined;
    const assessments = new Map((assessmentById.get(id) ?? []).map(item=>[item.field,item]));
    const metricStatuses={...simulated?.metricStatuses};
    const severityMap={OK:'normal',WARNING:'warning',CRITICAL:'critical'};
    const metrics = fields.flatMap(([metricId, label, field, unit]) => {
      const value = metricId === 'mood' ? translateMood(row[field]) : row[field];
      if (value == null || value === '') return [];
      const series = simulated?.metrics.find(metric => metric[0] === metricId);
      if (series?.[4]?.length) return [series];
      const numeric = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value.replaceAll(',', '')) : NaN;
      const candidate=assessments.get(field);
      const sameReading=candidate?.value!=null && (
        String(candidate.value)===String(value) || (Number.isFinite(numeric) && Number(candidate.value)===numeric)
      );
      const assessment=sameReading?candidate:undefined;
      if(assessment && Object.hasOwn(severityMap,assessment.severity)) {
        metricStatuses[metricId]=severityMap[assessment.severity];
      }
      if (!Number.isFinite(numeric)) return [[metricId, label, value, assessment?.unit || unit, [], [], [], undefined, assessment]];
      const key = JSON.stringify([id, metricId]);
      const previous = history.get(key) ?? [];
      const last = previous.at(-1);
      const sync = row.garminLastSync ?? null;
      const next = !last || last.value !== numeric || last.sync !== sync
        ? [...previous, {value:numeric, time:observedAt, sync}].slice(-288) : previous;
      history.set(key, next);
      return [[metricId, label, value, assessment?.unit || unit, next.map(point => point.value), [], next.map(point => point.time), 'observed', assessment]];
    });
    // Include simulator-only indicators such as stress without injecting any into Garmin data.
    const metricIds = new Set(metrics.map(metric => metric[0]));
    if (simulated) metrics.push(...simulated.metrics.filter(metric => !metricIds.has(metric[0])));
    return {id, name, initials:name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join(''),
      metrics, alerts:simulated?.alerts ?? [], metricStatuses,
      telemetrySource:row.garminLinked === true ? 'garmin' : row.garminLinked === false ? 'simulation' : 'backend',
      garminLastSync:row.garminLastSync ?? null, observedAt,
      historySource:simulated ? 'simulator' : 'observations'};
  });
  const existingNames = new Set(rows.map(row => row.astronautName.trim().toLowerCase()));
  for (const simulated of simulatedCrew) {
    if (existingNames.has(simulated.name.trim().toLowerCase())) continue;
    crew.push({...simulated, id:'simulation:' + simulated.id, telemetrySource:'simulation',
      historySource:'simulator', observedAt, garminLastSync:null});
  }
  return crew;
}
