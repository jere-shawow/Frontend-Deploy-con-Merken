'use client';
import {useEffect,useRef,useState} from 'react';

// Additive panel only: existing dashboard layout, colors and typography are retained.
export default function Recommendations({person}) {
  const [busy,setBusy]=useState(false),[result,setResult]=useState(null),[error,setError]=useState('');
  const active=useRef(null);
  useEffect(()=>()=>active.current?.abort(),[]);
  const supported=/^\d{1,18}$/.test(String(person.id));
  async function generate() {
    if (active.current) return;
    const controller=new AbortController();active.current=controller;
    setBusy(true);setError('');setResult(null);
    try {
      const response=await fetch('/api/astronauts/'+encodeURIComponent(person.id)+'/recommendations',{
        method:'POST',cache:'no-store',signal:controller.signal,
        headers:{'Content-Type':'application/json'},body:JSON.stringify({allowRemoteAnalysis:true}),
      });
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||'Recommendations are unavailable.');
      if(!controller.signal.aborted)setResult(body);
    } catch(e) { if(!controller.signal.aborted)setError(e.message||'Recommendations are unavailable.'); }
    finally { if(active.current===controller){active.current=null;setBusy(false);} }
  }
  return <section className="panel" aria-label="Astronaut recommendations">
    <h2>Recommendations</h2>
    <p className="muted">Generate an English ground-station summary for {person.name} using the latest stored backend metrics. This sends those metrics to Amazon Bedrock.</p>
    <button type="button" onClick={generate} disabled={busy||!supported}>{busy?'Generating recommendations…':'Recommendations'}</button>
    {!supported&&<p className="muted">Select a stored backend astronaut to generate recommendations.</p>}
    <div aria-live="polite" aria-busy={busy}>
      {error&&<p role="alert">{error}</p>}
      {result&&<div className="specialist-content">
        <p className="muted">{result.provider==='AWS_BEDROCK'?'Amazon Nova Pro':'Core-directed action'} · Generated {new Date(result.generatedAt).toLocaleString('en-US')} · Snapshot for {person.name}</p>
        <h3>Astronaut status</h3><p>{result.narrative.summary}</p>
        <p><strong>Core action:</strong> {result.context.coreAction.replaceAll('_',' ')} · <strong>Exercise clearance:</strong> {result.context.exerciseClearance}</p>
        {!!result.context.existingAlerts?.length&&<div role="alert"><h3>Existing core alerts</h3><ul>{result.context.existingAlerts.map((a,i)=><li key={i}>{a}</li>)}</ul></div>}
        {!!result.activities?.length&&<><h3>Recommended activities</h3><ul>{result.activities.map(a=><li key={a.id}>{a.recommendation} <small>Source: {a.sourceId}</small></li>)}</ul></>}
        {!result.activities?.length&&<p>No activity recommendation was accepted for this snapshot. Follow the core-directed action.</p>}
        <details><summary>Metric explanations</summary>{result.narrative.observations.map(o=><p key={o.metric}><strong>{o.metric.replaceAll('_',' ')}:</strong> {o.explanation}</p>)}</details>
        <h3>Uncertainty</h3><ul>{result.narrative.uncertainties.map((u,i)=><li key={i}>{u}</li>)}</ul>
        <details><summary>Measurements and provenance used</summary><div className="table-scroll"><table><thead><tr><th>Metric</th><th>Value</th><th>Source</th><th>Measured at</th></tr></thead><tbody>{result.context.readings.map(r=><tr key={r.metric}><td>{r.metric}</td><td>{r.value??'Unknown'} {r.unit}</td><td>{r.source}</td><td>{r.measuredAt??'Unknown'}</td></tr>)}</tbody></table></div></details>
        <p className="muted">{result.disclaimer}</p>
        <details><summary>Exercise options on a space mission</summary><p>Cycling, treadmill and resistance equipment may be part of a reviewed mission plan. These are reference options, not a personal exercise prescription. No intensity, duration or clearance is inferred from this snapshot.</p><a href="https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/" target="_blank" rel="noreferrer">NASA exercise reference</a></details>
        <p className="muted">A saved response describes this snapshot only. Press Recommendations again to request a new one.</p>
      </div>}
    </div>
  </section>;
}
