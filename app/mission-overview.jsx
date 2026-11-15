import { Activity, ArrowUpRight, Bell, ChevronRight, Droplets, HeartPulse, Moon, Radio, Thermometer, Waves, Zap } from 'lucide-react';
import { metricState, states, Trend } from './telemetry';
import CrewIdentity, { CrewVitals } from './crew-identity';
import { crewSource } from '../lib/crew-display';

const priority = ['oxygen','sleep','battery','hrv','temperature','stress','radiation'];
const icons = {heart:HeartPulse,oxygen:Droplets,sleep:Moon,battery:Zap,hrv:Activity,temperature:Thermometer,stress:Waves};
const severity = {critical:0,warning:1,suggestion:2};
const clock = new Intl.DateTimeFormat('en-GB', {hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'});

export default function MissionOverview({crew,selected,metricId,onMetric,onCrew,onDetails,onNotifications,receivedAt}) {
  const available = selected.metrics.filter(metric => metric[2] != null && metric[0] !== 'mood');
  const active = available.find(metric => metric[0] === metricId) ?? available.find(metric => metric[0] === 'heart') ?? available[0];
  const secondary = [...available].filter(metric => metric[0] !== 'heart').sort((a,b) => {
    const rank = id => priority.includes(id) ? priority.indexOf(id) : priority.length;
    return rank(a[0])-rank(b[0]);
  }).slice(0,4);
  const alerts = crew.flatMap(person => (person.alerts ?? []).filter(alert => alert.level === 'warning' || alert.level === 'critical').map(alert => ({person,alert})))
    .sort((a,b) => severity[a.alert.level]-severity[b.alert.level]);
  const garminCount = crew.filter(person => person.telemetrySource === 'garmin').length;
  const simulatedCount = crew.filter(person => person.telemetrySource === 'simulation').length;
  const received = Date.parse(receivedAt);
  const additional = available.filter(metric => !secondary.some(item => item[0] === metric[0]) && metric[0] !== 'heart');
  return <div className="command-overview">
    <div className="command-summary" aria-label="Mission telemetry summary">
      <div><span className="summary-indicator"/><span>CREW MONITORING</span><strong>{crew.length} astronauts</strong></div>
      <div><span>Garmin linked</span><strong>{garminCount}</strong></div>
      <div><span>Simulated</span><strong>{simulatedCount}</strong></div>
      <button type="button" onClick={onNotifications}><span><Bell size={13}/> Crew alerts</span><strong>{alerts.length}</strong><ChevronRight size={14}/></button>
      <span className="summary-received"><Radio size={12}/>{Number.isFinite(received) ? <time dateTime={receivedAt}>Received {clock.format(received)}</time> : 'Waiting for telemetry'}</span>
    </div>
    <div className="mission-grid command-grid">
      <section className="panel crew-roster" aria-label="Mission crew">
        <div className="roster-heading"><div><span className="eyebrow">MISSION CREW</span><h2>Your crew <span>{String(crew.length).padStart(2,'0')}</span></h2></div></div>
        <div className="crew-roster-list">
          {crew.map(person => <button type="button" className="crew-roster-row" key={person.id}
            aria-pressed={selected.id === person.id} onClick={() => onCrew(person.id)} aria-label={'Monitor ' + person.name}>
            <CrewIdentity person={person}/><ChevronRight className="crew-row-arrow" size={14}/>
          </button>)}
        </div>
        <p className="roster-note">Select a crew member to inspect their telemetry.</p>
      </section>
      <div className="mission-board command-board">
        <header className="crew-focus-heading">
          <div className="crew-focus-identity"><span className="eyebrow">ASTRONAUT TELEMETRY</span>
            <div className="crew-focus-name"><h2>{selected.name}</h2><span className="focus-source" data-source={selected.telemetrySource}>{crewSource(selected)}</span></div>
            <CrewVitals person={selected}/>
          </div>
          <button className="detail-link" type="button" onClick={() => onDetails(selected.id)}>Full profile<ArrowUpRight size={15}/></button>
        </header>
        {!!secondary.length && <div className="crew-secondary-signals">{secondary.map(metric => {
          const [id,label,value,unit] = metric;
          const Icon = icons[id] ?? Activity;
          const status = metricState(metric, selected.metricStatuses);
          return <div className="signal-tile" key={id}><button type="button" className="crew-secondary-signal" data-status={status}
            aria-pressed={active?.[0] === id} onClick={() => onMetric(id)}>
            <span><Icon size={14}/>{label}</span><strong>{value}<small>{unit}</small></strong>
            {status !== 'unknown' && <small className="signal-state">{states[status]}</small>}
            <span className="signal-tile-footer">{metric[4]?.length ?? 0} {metric[7] === 'observed' ? 'observations' : 'readings'}</span>
          </button></div>;
        })}</div>}
        <div className="focus-content"><div className="focus-chart-column">
        <div className="focus-chart-heading"><h3>Signal history</h3>
          {active && <label>Metric<select aria-label="Chart metric" value={active[0]} onChange={event => onMetric(event.target.value)}>
            {available.map(([id,label]) => <option value={id} key={id}>{label}</option>)}
          </select></label>}
        </div>
        {active ? <Trend key={selected.id + active[0]} metric={active} statuses={selected.metricStatuses} featured/>
          : <p className="muted">No readings available for this astronaut.</p>}
        </div><aside className="crew-context-grid" aria-label="Supporting telemetry">
          <section className="crew-context-panel"><div className="context-heading"><h3>Latest readings</h3><span>{available.length} signals</span></div>
            {additional.length ? <div className="compact-readings">{additional.map(([id,label,value,unit]) =>
              <button type="button" key={id} aria-pressed={active?.[0] === id} onClick={() => onMetric(id)}><span>{label}</span><strong>{value} <small>{unit}</small></strong></button>
            )}</div> : <p className="muted">All available signals are shown above.</p>}
          </section>
          <section className="crew-context-panel"><div className="context-heading"><h3>Crew alerts</h3><button type="button" className="text-link" onClick={onNotifications}>View all<ArrowUpRight size={12}/></button></div>
            {alerts.length ? <div className="compact-alerts">{alerts.slice(0,3).map(({person,alert},index) =>
              <button type="button" key={person.id + ':' + (alert.id ?? index)} data-level={alert.level} onClick={() => onDetails(person.id)}>
                <i/><span><strong>{alert.title}</strong><small>{person.name}</small></span><ChevronRight size={13}/>
              </button>)}{alerts.length > 3 && <button type="button" className="text-link" onClick={onNotifications}>View {alerts.length - 3} more</button>}</div>
              : <div className="quiet-alert-state"><Bell size={18}/><div><strong>No active crew alerts</strong><p>New warnings will appear here.</p></div></div>}
          </section>
        </aside></div>
      </div>
    </div>
  </div>;
}
