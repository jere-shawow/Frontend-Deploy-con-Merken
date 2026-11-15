'use client';
import {useEffect,useRef,useState} from 'react';

const sources={
  'nasa-sleep':['NASA sleep and mission performance','https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/'],
  'nasa-exercise':['NASA astronaut exercise','https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/'],
  'csa-leisure':['CSA life and leisure in space','https://www.asc-csa.gc.ca/eng/astronauts/living-in-space/relaxing-in-space.asp'],
  'jaxa-life':['JAXA life on the ISS','https://humans-in-space.jaxa.jp/en/life/health-in-space/life/'],
};
export default function Recommendations({person}) {
  const [busy,setBusy]=useState(false),[result,setResult]=useState(null),[snapshot,setSnapshot]=useState(null),[error,setError]=useState('');
  const active=useRef(null);
  useEffect(()=>()=>active.current?.abort(),[]);
  const supported=/^\d{1,18}$/.test(String(person.id));
  async function generate() {
    if(active.current)return;
    const controller=new AbortController();active.current=controller;setBusy(true);setError('');setResult(null);setSnapshot(null);
    const url='/api/astronauts/'+encodeURIComponent(person.id)+'/recommendations';
    try {
      const context=await fetch(url,{cache:'no-store',signal:controller.signal});
      if(context.ok&&!controller.signal.aborted)setSnapshot(await context.json());
      const response=await fetch(url,{method:'POST',cache:'no-store',signal:controller.signal,
        headers:{'Content-Type':'application/json'},body:JSON.stringify({allowRemoteAnalysis:true})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Recommendations are temporarily unavailable.');
      if(!controller.signal.aborted)setResult(body);
    } catch(e){if(!controller.signal.aborted)setError(e.message||'Recommendations are temporarily unavailable.');}
    finally{if(active.current===controller){active.current=null;setBusy(false);}}
  }
  const context=result?.context??snapshot;
  const refs=(result?.narrative?.sourceIds??[]).filter(id=>sources[id]);
  return <section className="panel" aria-label="Astronaut recommendations">
    <h2>Recommendations</h2>
    <button type="button" onClick={generate} disabled={busy||!supported}>{busy?'Preparing your recommendations…':'Recommendations'}</button>
    {!supported&&<p className="muted">Select a stored backend astronaut.</p>}
    <div aria-live="polite" aria-busy={busy}>
      {error&&<p role="alert">{error}</p>}
      {result&&<div className="specialist-content">
        <p className="muted">{person.name} · {result.provider==='AWS_BEDROCK'?'Nova Pro':'Monitor guidance'} · {new Date(result.generatedAt).toLocaleString('en-US')}</p>
        {result.narrative.summary.split(/\n+/).filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>)}
        {!!refs.length&&<p className="muted">References: {refs.map((id,i)=><span key={id}>{i>0?' · ':''}<a href={sources[id][1]} target="_blank" rel="noreferrer">{sources[id][0]}</a></span>)}</p>}
      </div>}
      {context&&<details><summary>Snapshot details{context.existingAlerts?.length?' · monitor flags present':''}</summary>
        <p className="muted">{context.readings.length} stored readings · {context.history?.length??0} saved snapshots. Simulation support; follow the current mission procedures.</p>
        {!!context.existingAlerts?.length&&<><p>Existing monitor flags remain independent of the explanation:</p><ul>{context.existingAlerts.map((flag,i)=><li key={i}>{flag}</li>)}</ul></>}
        {result?.narrative?.uncertainties?.map((item,i)=><p className="muted" key={i}>{item}</p>)}
        <p className="muted">Generated from this snapshot. A later request may use updated data.</p>
      </details>}
    </div>
  </section>;
}
