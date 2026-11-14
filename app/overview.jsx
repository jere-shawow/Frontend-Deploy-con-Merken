import {ArrowUpRight, Users, Activity, ListChecks} from 'lucide-react';

const format = new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
const priority = {critical:0,warning:1,suggestion:2};

function summarize(crew) {
  const groups = new Map();
  for (const person of crew) {
    const metrics = [...person.metrics, ['weight','Weight',person.weightKg,'kg'], ['height','Height',person.heightCm,'cm']];
    const seen = new Set();
    for (const [id,label,value,unit] of metrics) {
      if (typeof value !== 'number' && typeof value !== 'string') continue;
      const raw = String(value).trim().replaceAll(',','');
      const numeric = Number(raw);
      const key = JSON.stringify([id,unit]);
      if (!raw || !Number.isFinite(numeric) || seen.has(key)) continue;
      seen.add(key);
      if (!groups.has(key)) groups.set(key,{label,unit,readings:[]});
      groups.get(key).readings.push({name:person.name,value:numeric});
    }
  }
  return [...groups.values()];
}

export default function Overview({crew,onSelect}) {
  const groups = summarize(crew);
  const alerts = crew.flatMap(person => (person.alerts ?? []).map(alert => ({person,alert})));
  const recommendations = alerts.filter(({alert}) => alert.recommendation)
    .sort((a,b)=>(priority[a.alert.level]??3)-(priority[b.alert.level]??3));
  const attention = crew.filter(person =>
    person.metrics.some(([id,,value]) => value != null && ['critical','warning'].includes(person.metricStatuses?.[id]))
    || (person.alerts ?? []).some(alert => ['critical','warning'].includes(alert.level))
  ).length;
  return <div className="overview">
    <div className="overview-kpis">
      <div className="panel"><Users size={18}/><span>Crew members</span><strong>{crew.length}</strong></div>
      <div className="panel"><Activity size={18}/><span>Needs attention</span><strong>{attention}</strong></div>
      <div className="panel"><ListChecks size={18}/><span>Recommendations</span><strong>{recommendations.length}</strong></div>
    </div>
    <section className="overview-section">
      <h2>Crew averages</h2><p className="muted">Each average uses one current reading per crew member with available data.</p>
      {groups.length ? <div className="average-grid">{groups.map(({label,unit,readings})=>{
        const values=readings.map(reading=>reading.value);
        const average=values.reduce((total,value)=>total+value,0)/values.length;
        return <article className="panel average-card" key={label+unit}>
          <h3>{label}</h3><p><strong>{format.format(average)}</strong> {unit}</p>
          <small>{values.length} of {crew.length} reporting · Range {format.format(Math.min(...values))}–{format.format(Math.max(...values))}</small>
        </article>;
      })}</div>:<p className="muted">No numeric readings available.</p>}
    </section>
    <section className="panel overview-recommendations">
      <h2>Crew recommendations</h2>
      {recommendations.length ? recommendations.map(({person,alert},index)=>
        <article className={'notice '+alert.level} key={person.id+':'+(alert.id??index)}>
          <div><div className="notice-meta"><span>{alert.level}</span><time>{alert.time}</time></div>
            <h3>{alert.title}</h3><p>{alert.recommendation}</p>
            <button className="crew-link" onClick={()=>onSelect(person.id)}>{person.name}<ArrowUpRight size={13}/></button>
          </div>
        </article>
      ):<p className="muted">No current recommendations for the crew.</p>}
    </section>
  </div>;
}