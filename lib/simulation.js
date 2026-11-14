const scenarios = [
  { label:'Baseline', readings:{} },
  { label:'Stress warning', readings:{stress:[64,'warning']}, alert:{
    level:'warning', title:'Stress above demo baseline', detail:'The simulated stress score increased.',
    recommendation:'Review the simulated telemetry trend.', time:'Simulation'
  }},
  { label:'Oxygen alert', readings:{oxygen:[92,'critical'],stress:[67,'warning']}, alert:{
    level:'critical', title:'Simulated blood oxygen drop', detail:'The demo oxygen reading dropped from its baseline.',
    recommendation:'Flag the simulated event for crew health review.', time:'Simulation'
  }},
  { label:'Recovery', readings:{stress:[42,'normal'],oxygen:[98,'normal']} },
];

export const scenarioCount = scenarios.length;

export function simulateCrew(crew, phase) {
  const scenario = scenarios[phase];
  if (!scenario) return crew;
  return crew.map(person => {
    const metricStatuses = {...person.metricStatuses};
    const metrics = person.metrics.map(metric => {
      const [id,label,value,unit,samples] = metric;
      metricStatuses[id] = scenario.readings[id]?.[1] ?? 'normal';
      const baseline = id==='oxygen' ? Math.max(Number(value),97) : value;
      const reading = scenario.readings[id]?.[0] ?? baseline;
      const numeric = Number(String(reading).replaceAll(',',''));
      return [id,label,String(reading),unit,[...samples,numeric]];
    });
    return {...person, metrics, metricStatuses, alerts:scenario.alert?[scenario.alert]:[]};
  });
}

export function scenarioLabel(phase) {
  return scenarios[phase]?.label;
}
