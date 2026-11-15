'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Notifications from './notifications';
import { BodyMap, Trend } from './telemetry';
import Specialist from './specialist';
import Overview from './overview';
import MissionOverview from './mission-overview';
import Navbar, { sections } from './navbar';
import CrewRecords from './crew-records';
import { useLocalState } from './use-local-state';

import { simulateCrew, scenarioCount, scenarioLabel } from '../lib/simulation';

function ProfileFacts({person}) {
  const stress = person.metrics.find(metric => metric[0] === 'stress');
  return <span className="profile-facts">
    <span>Weight <strong>{person.weightKg == null ? '—' : person.weightKg + ' kg'}</strong></span>
    <span>Height <strong>{person.heightCm == null ? '—' : person.heightCm + ' cm'}</strong></span>
    <span>Stress <strong>{stress?.[2] == null ? '—' : stress[2] + ' / 100'}</strong></span>
  </span>;
}

const severity = {critical:0, warning:1, suggestion:2};

function noticeKey(source, person, alert) {
  return JSON.stringify([source, person.id, alert.id ?? [alert.level, alert.title, alert.time, alert.detail]]);
}

export default function Dashboard() {
  const router = useRouter();
  const [dismissed, updateDismissed] = useLocalState('merken-dismissed-notifications-v1');
  const [groundAlerts, updateGroundAlerts] = useLocalState('merken-ground-notifications-v1');
  const [received, updateReceived] = useLocalState('merken-received-notifications-v1');
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [dismissError, setDismissError] = useState('');
  const request = useRef(null);
  const [section,setSection] = useState('overview');
  const current = sections[section];
  const [overviewMetric,setOverviewMetric] = useState('heart');
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
  async function load({ quiet = false } = {}) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    if (!quiet) setBusy(true);
    try {
      const response=await fetch('/api/dashboard',{cache:'no-store', signal:controller.signal});
      if(!response.ok) throw new Error();
      const payload = await response.json();
      if (controller.signal.aborted) return;
      setData(payload);
      setError('');
    } catch {
      if (!controller.signal.aborted) setError('Crew telemetry is temporarily unavailable.');
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }
  useEffect(() => {
    load();
    const timer = setInterval(() => load({ quiet: true }), 60000);
    return () => {
      clearInterval(timer);
      request.current?.abort();
      request.current = null;
    };
  }, []);
  const crew = useMemo(() => demoMode ? simulateCrew(data.crew, phase) : (data?.crew ?? []), [data, demoMode, phase]);
  const selected=crew.find(person=>person.id===crewId) ?? crew[0];
  const metrics = selected?.metrics ?? [];
  const metric = metrics.find(item => item[0] === metricId)
    ?? metrics.find(item => selected.metricStatuses?.[item[0]] === 'critical')
    ?? metrics.find(item => selected.metricStatuses?.[item[0]] === 'warning')
    ?? metrics.find(item => item[0] === 'heart')
    ?? metrics[0];
  const dismissedKeys = new Set(dismissed ?? []);
  const source = data?.upstreamSimulation ? 'merken-test' : data?.source;
  useEffect(() => {
    if (!received || !source) return;
    const known = new Set(received.map(item => item.key));
    const incoming = crew.flatMap(person => (person.alerts ?? []).map(alert => ({
      source, crewId: person.id, alert, key: noticeKey(source, person, alert),
    }))).filter(item => !known.has(item.key));
    if (!incoming.length) return;
    try {
      updateReceived(current => [...new Map([...current, ...incoming].map(item => [item.key, item])).values()]);
    } catch {
      setDismissError('Could not keep notification history in this browser.');
    }
  }, [crew, received, source]);

  const notificationCrew = crew.map(person => {
    const local = (groundAlerts ?? []).filter(alert => alert.source === source && alert.crewId === person.id);
    return { ...person, alerts: [...(person.alerts ?? []), ...local].filter(alert =>
      !dismissedKeys.has(noticeKey(source, person, alert))) };
  });
  const currentNotices = notificationCrew.flatMap(person => person.alerts.map(alert => {
    const key = noticeKey(source, person, alert);
    return [key, { person, alert, key }];
  }));
  const savedNotices = (received ?? []).flatMap(({source: savedSource, crewId, alert, key}) => {
    const person = crew.find(member => member.id === crewId);
    return savedSource === source && person && !dismissedKeys.has(key) ? [[key, { person, alert, key }]] : [];
  });
  const notifications = [...new Map([...savedNotices, ...currentNotices]).values()];
  const visible = notifications.filter(({alert}) => filter === 'all' || alert.level === filter)
    .sort((a,b) => (severity[a.alert.level] ?? 3) - (severity[b.alert.level] ?? 3));

  function dismiss(key) {
    try {
      updateDismissed(current => current.includes(key) ? current : [...current, key]);
      setDismissError('');
    } catch {
      setDismissError('Could not dismiss this notification in this browser.');
    }
  }
  function createAlert(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const crewId = form.get('crewId');
    const title = form.get('title').trim();
    const detail = form.get('detail').trim();
    if (!title || !detail || !crew.some(person => person.id === crewId)) {
      setDismissError('Choose a crew member and enter a title and a message.');
      return;
    }
    const alert = { id: 'ground-' + crypto.randomUUID(), source, crewId, title, detail, level: 'suggestion',
      time: new Date().toISOString() };
    try {
      updateGroundAlerts(current => [alert, ...current]);
      setCreatingAlert(false);
      setFilter('all');
      setDismissError('');
    } catch {
      setDismissError('Could not save the notification in this browser.');
    }
  }
  return <div className="mission-shell">
    <Navbar active={section} onSelect={setSection} busy={busy} onRefresh={load}
      notificationCount={notifications.length}
      onSignOut={async () => {
        try {
          const response = await fetch('/api/demo-session', {method:'DELETE'});
          if (!response.ok) throw new Error();
          router.replace('/login'); router.refresh();
        } catch { setError('Could not sign out. Please try again.'); }
      }}
      sourceLabel={error ? 'Connection error' : demoMode ? 'Demo data' : data?.upstreamSimulation ? 'Merken test data · 24h' : data ? 'Backend connected' : 'Crew telemetry'}/>
    <main>
      <div className="intro"><h1>{current.title}</h1><p>{current.tag && <>{current.tag} · </>}<a href="/directory">Astronaut directory</a></p></div>
      {error&&<p className="error" role="alert">{error}</p>}
      {busy&&!data&&<p className="muted" role="status">Loading crew telemetry…</p>}
      {data&&!crew.length&&<p className="muted">No crew members available.</p>}
          {demoMode&&<div className="panel simulation">
            <div><strong>Telemetry simulation</strong><span aria-live="polite">{scenarioLabel(phase)}</span></div>
            <div className="simulation-actions"><button onClick={()=>setRunning(!running)}>{running?'Pause':'Resume'}</button><button onClick={nextPhase}>Next scenario</button></div>
          </div>}
      {!!crew.length&&section==='overview'&&<MissionOverview crew={notificationCrew} selected={selected} demo={demoMode} metricId={overviewMetric} onMetric={setOverviewMetric}
        onCrew={selectCrew} onDetails={openAstronaut} profile={<ProfileFacts person={selected}/>}>
        <details className="panel crew-summary"><summary>Crew averages &amp; recommendations</summary><Overview crew={crew} onSelect={openAstronaut}/></details>
      </MissionOverview>}
      {!!crew.length&&(section==='astronauts'||section==='specialist')&&<div className="details">
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
          {metric?<Trend key={selected.id+metric[0]} metric={metric} statuses={selected.metricStatuses} featured/>:<p className="muted">No metrics available for this crew member.</p>}</div>

          {selected.metrics.length>1&&<section className="more-trends" aria-label="Additional metric trends">
            <h2>Additional trends</h2>
            <div className="trend-grid">
              {selected.metrics.filter(item=>item[0]!==metric?.[0]).map(item=><Trend key={selected.id+item[0]} metric={item} statuses={selected.metricStatuses} compact/>)}
            </div>
          </section>}
          </>}
      </div>}
      {section==='notifications' && <Notifications notifications={notifications} visible={visible}
        crew={crew} selected={selected} filter={filter} onFilter={setFilter}
        creating={creatingAlert} onToggleCreate={() => setCreatingAlert(!creatingAlert)} onCreate={createAlert}
        canCreate={!!crew.length && !!groundAlerts} canDismiss={!!dismissed} error={dismissError}
        onDismiss={dismiss} onCrew={openAstronaut}/>}
      <CrewRecords active={section==='records'} crew={crew} selected={selected} onCrew={selectCrew} source={source} fresh={!!data && !error}/>
    </main>
  </div>;
}
