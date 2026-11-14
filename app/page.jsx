'use client';
import { useEffect, useState } from 'react';
import { Bell, CircleAlert, Lightbulb, TriangleAlert } from 'lucide-react';
import { BodyMap, Trend } from './telemetry';
import Specialist from './specialist';
import Overview from './overview';
import MissionOverview from './mission-overview';
import Navbar, { sections } from './navbar';

import { simulateCrew, scenarioCount, scenarioLabel } from '../lib/simulation';

function ProfileFacts({person}) {
  const stress = person.metrics.find(metric => metric[0] === 'stress');
  return <span className="profile-facts">
    <span>Weight <strong>{person.weightKg == null ? '—' : person.weightKg + ' kg'}</strong></span>
    <span>Height <strong>{person.heightCm == null ? '—' : person.heightCm + ' cm'}</strong></span>
    <span>Stress <strong>{stress?.[2] == null ? '—' : stress[2] + ' / 100'}</strong></span>
  </span>;
}

const alerts = {
  critical:{label:'Critical', icon:CircleAlert}, warning:{label:'Warning',icon:TriangleAlert}, suggestion:{label:'Suggestion',icon:Lightbulb}
};
export default function Dashboard() {
  const [section,setSection] = useState('overview');
  const current = sections[section];
  const [overviewMetric,setOverviewMetric] = useState('stress');
  function openAstronaut(id) {
    selectCrew(id); selectMetric(''); setFilter('all'); setSection('astronauts');
  }
  const [data,setData]=useState(null), [error,setError]=useState(''), [busy,setBusy]=useState(true);
  const [crewId,selectCrew]=useState(''), [metricId,selectMetric]=useState(''), [filter,setFilter]=useState('all');
  const [running,setRunning]=useState(true);
  const [phase,setPhase]=useState(0);
  const demoMode = data?.source === 'demo';
  const nextPhase = () => setPhase(current => (current + 1) % scenarioCount);
  useEffect(()=>{
    if (!demoMode || !running) return;
    const timer = setInterval(() => setPhase(current => (current + 1) % scenarioCount), 6000);
    return () => clearInterval(timer);
  },[demoMode,running]);
  async function load() {
    setBusy(true); setError('');
    try {
      const response=await fetch('/api/dashboard',{cache:'no-store'});
      if(!response.ok) throw new Error();
      setData(await response.json());
    } catch { setError('Crew telemetry is temporarily unavailable.'); }
    finally { setBusy(false); }
  }
  useEffect(()=>{load();},[]);
  const crew=demoMode ? simulateCrew(data.crew, phase) : (data?.crew ?? []);
  const selected=crew.find(person=>person.id===crewId) ?? crew[0];
  const metrics = selected?.metrics ?? [];
  const metric = metrics.find(item => item[0] === metricId)
    ?? metrics.find(item => selected.metricStatuses?.[item[0]] === 'critical')
    ?? metrics.find(item => selected.metricStatuses?.[item[0]] === 'warning')
    ?? metrics.find(item => item[0] === 'heart')
    ?? metrics[0];
  const notices=selected?.alerts ?? [];
  const severity = {critical:0, warning:1, suggestion:2};
  const visible=notices.filter(item=>filter==='all'||item.level===filter)
    .sort((a,b)=>(severity[a.level]??3)-(severity[b.level]??3));
  return <div className="mission-shell">
    <Navbar active={section} onSelect={setSection} busy={busy} onRefresh={load}
      sourceLabel={error ? 'Connection error' : demoMode ? 'Demo data' : data?.upstreamSimulation ? 'Merken test data · 24h' : data ? 'Backend connected' : 'Crew telemetry'}/>
    <main>
      <div className="intro"><h1>{current.title}</h1><p>{current.tag}</p></div>
      {error&&<p className="error" role="alert">{error}</p>}
      {busy&&!data&&<p className="muted" role="status">Loading crew telemetry…</p>}
      {data&&!crew.length&&<p className="muted">No crew members available.</p>}
          {demoMode&&<div className="panel simulation">
            <div><strong>Telemetry simulation</strong><span aria-live="polite">{scenarioLabel(phase)}</span></div>
            <div className="simulation-actions"><button onClick={()=>setRunning(!running)}>{running?'Pause':'Resume'}</button><button onClick={nextPhase}>Next scenario</button></div>
          </div>}
      {!!crew.length&&section==='overview'&&<MissionOverview crew={crew} selected={selected} demo={demoMode} metricId={overviewMetric} onMetric={setOverviewMetric}
        onCrew={selectCrew} onDetails={openAstronaut} profile={<ProfileFacts person={selected}/>}>
        <details className="panel crew-summary"><summary>Crew averages &amp; recommendations</summary><Overview crew={crew} onSelect={openAstronaut}/></details>
      </MissionOverview>}
      {!!crew.length&&section!=='overview'&&<div className="details">
          <div className="selected-heading crew-toolbar">
            <div><h2>{selected.name}</h2><ProfileFacts person={selected}/></div>
            <label className="crew-picker">
              <span>Crew member</span>
              <select value={selected.id} onChange={event=>{
                selectCrew(event.target.value);
                selectMetric('');
                setFilter('all');
              }}>
                {crew.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </label>
          </div>
          {section==='specialist' ? <Specialist key={data.source + ':' + selected.id} person={selected} source={data.source} scenario={demoMode ? scenarioLabel(phase) : undefined}/> : <>
          <div className="telemetry-focus"><BodyMap metrics={metrics} statuses={selected.metricStatuses} active={metric?.[0]} onSelect={selectMetric}/>
          {metric?<Trend key={selected.id+metric[0]} metric={metric} featured/>:<p className="muted">No metrics available for this crew member.</p>}</div>

          {selected.metrics.length>1&&<section className="more-trends" aria-label="Additional metric trends">
            <h2>Additional trends</h2>
            <div className="trend-grid">
              {selected.metrics.filter(item=>item[0]!==metric?.[0]).map(item=><Trend key={selected.id+item[0]} metric={item} compact/>)}
            </div>
          </section>}
          <section className="panel notifications"><div className="panel-heading"><h2><Bell size={17}/> Notifications <span className="pill">{notices.length}</span></h2><label><span className="sr-only">Filter notifications</span><select value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">All severities</option>{Object.entries(alerts).map(([key,item])=><option key={key} value={key}>{item.label} ({notices.filter(alert=>alert.level===key).length})</option>)}</select></label></div>
            {visible.length?visible.map((alert,index)=>{const style=alerts[alert.level] ?? alerts.suggestion; const Icon=style.icon; return <article className={'notice '+alert.level} key={alert.id??index}><Icon size={18}/><div><div className="notice-meta"><span>{style.label}</span><time>{alert.time}</time></div><h3>{alert.title}</h3><p>{alert.detail}</p>{alert.recommendation&&<div className="recommendation"><strong>Recommended action</strong><p>{alert.recommendation}</p></div>}</div></article>}):<p className="muted">No notifications for this selection.</p>}
          </section>
          </>}
      </div>}
    </main>
  </div>;
}
