import { Activity, ArrowUpRight, Moon, Radiation, Waves } from 'lucide-react';
import { Trend } from './telemetry';

const signals = [
  {id:'stress',label:'Stress',icon:Waves,tone:'pink'},
  {id:'sleep',label:'Sleep',icon:Moon,tone:'lavender'},
  {id:'radiation',label:'Space radiation',icon:Radiation,tone:'peach'},
];
const severity={critical:0,warning:1,suggestion:2};

function Sparkline({samples}) {
  const points = Array.isArray(samples) ? samples.filter(Number.isFinite).slice(-12) : [];
  if (points.length < 2) return null;
  const min=Math.min(...points), range=Math.max(...points)-min;
  return <svg viewBox="0 0 160 36" preserveAspectRatio="none" aria-hidden="true">
    <polyline points={points.map((value,index)=>[index*160/(points.length-1),range?31-(value-min)*26/range:18].join(',')).join(' ')}
      fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
  </svg>;
}

function Avatar({person,demo}) {
  return <span className="portrait mission-avatar" data-portrait={demo?person.id:undefined} aria-hidden="true"><span>{person.initials}</span></span>;
}

export default function MissionOverview({crew,selected,demo,metricId,onMetric,onCrew,onDetails,profile,children}) {
  const metrics = signals.map(signal => selected.metrics.find(metric=>metric[0]===signal.id)
    ?? [signal.id,signal.label,null,'',[]]);
  const active = metrics.find(metric=>metric[0]===metricId) ?? metrics.find(metric=>metric[2]!=null) ?? metrics[0];
  const alerts=crew.flatMap(person=>(person.alerts??[]).filter(alert=>alert.level==='warning'||alert.level==='critical').map(alert=>({person,alert})))
    .sort((a,b)=>severity[a.alert.level]-severity[b.alert.level]);
  const update=alerts[0] ?? crew.flatMap(person=>(person.alerts??[]).map(alert=>({person,alert})))[0];
  return <div className="mission-grid">
    <div className="mission-board">
      <div className="mission-signals">{signals.map(({id,label,icon:Icon,tone},index)=>{
        const [, ,value,unit,samples]=metrics[index];
        return <button type="button" className="panel mission-signal" data-tone={tone} key={id}
          aria-pressed={active[0]===id} onClick={()=>onMetric(id)}>
          <span className="signal-title"><i><Icon size={16}/></i>{label}</span>
          <strong>{value ?? 'No reading'} {value!=null&&<small>{unit}</small>}</strong>
          <Sparkline samples={samples}/>
        </button>;
      })}</div>
      <Trend key={selected.id+active[0]} metric={active} featured/>
      <section className="mission-alerts"><h2>Current warnings / alerts</h2>
        {alerts.length ? alerts.map(({person,alert},index)=><article className={'notice '+alert.level} key={person.id+':'+(alert.id??index)}>
          <Activity size={18}/><div><div className="notice-meta"><span>{alert.level}</span><time>{alert.time}</time></div>
          <h3>{alert.title}</h3><p>{alert.detail}</p>
          {alert.recommendation&&<p className="mission-action">{alert.recommendation}</p>}
          <button className="crew-link" onClick={()=>onDetails(person.id)}>{person.name}<ArrowUpRight size={13}/></button></div>
        </article>):<p className="muted">No current warnings or critical alerts.</p>}
      </section>
      {children}
    </div>
    <aside className="mission-aside">
      <section><h2>Astronaut profile</h2><div className="mission-profile">
        <Avatar person={selected} demo={demo}/><div><strong>{selected.name}</strong>{profile}</div>
        <button type="button" aria-label={'Open profile for '+selected.name} onClick={()=>onDetails(selected.id)}><ArrowUpRight size={17}/></button>
      </div></section>
      <section><h2>Other astronauts</h2>
        {crew.filter(person=>person.id!==selected.id).map(person=><button type="button" className="mission-person" key={person.id} onClick={()=>onCrew(person.id)}>
          <Avatar person={person} demo={demo}/><span><strong>{person.name}</strong><small>{person.role || 'Crew member'}</small></span><ArrowUpRight size={14}/>
        </button>)}
        {crew.length===1&&<p className="muted">No other astronauts.</p>}
      </section>
      <section><h2>Mission update</h2><div className="mission-update">
        {update?<><strong>{update.alert.title}</strong><p>{update.person.name} · {update.alert.time}</p><p>{update.alert.detail}</p></>:<p>{crew.length} crew {crew.length===1?'member':'members'} reporting. No crew alerts available.</p>}
      </div></section>
    </aside>
  </div>;
}