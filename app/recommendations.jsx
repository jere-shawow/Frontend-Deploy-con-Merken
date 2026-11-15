'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,ChevronDown,ClipboardList,LoaderCircle} from 'lucide-react';
import './recommendations.css';

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
  const refs=[...new Set((result?.narrative?.sourceIds??[]).filter(id=>Object.hasOwn(sources,id)))];
  const paragraphs=(result?.narrative?.summary ?? '').split(/\n+/).map(text=>text.trim()).filter(Boolean);
  const generatedAt=Date.parse(result?.generatedAt);
  return <section className="panel recommendations-panel" aria-labelledby="recommendations-heading">
    <header className="recommendations-header">
      <div className="recommendations-heading">
        <span className="recommendations-icon"><ClipboardList size={21} aria-hidden="true"/></span>
        <div><h2 id="recommendations-heading">Recommendations</h2><p>{person.name}</p></div>
      </div>
      <button type="button" className="primary-action recommendation-generate" onClick={generate} disabled={busy||!supported}>
        {busy?<LoaderCircle className="recommendation-spinner" size={16} aria-hidden="true"/>:<ArrowRight size={16} aria-hidden="true"/>}
        {busy?'Generating…':result?'Regenerate':'Generate recommendations'}
      </button>
    </header>
    <div className="recommendations-content" aria-live="polite" aria-busy={busy}>
      {error&&<p className="error" role="alert">{error}</p>}
      {!result&&!busy&&!error&&<p className="muted">{supported?'Generate recommendations for the selected astronaut.':'Select a stored backend astronaut to generate recommendations.'}</p>}
      {result&&<article className="recommendation-result">
        <div className="recommendation-meta">
          <span>{result.provider==='AWS_BEDROCK'?'Nova Pro':'Monitor guidance'}</span>
          {Number.isFinite(generatedAt)&&<time dateTime={result.generatedAt}>{new Date(generatedAt).toLocaleString('en-US')}</time>}
        </div>
        <div className="recommendation-narrative">
          {paragraphs.length?paragraphs.map((paragraph,i)=><p key={i}>{paragraph}</p>):<p className="muted">No recommendation text was returned.</p>}
        </div>
        {!!refs.length&&<nav className="recommendation-sources" aria-label="Recommendation sources">
          <h3>Sources</h3>
          <ul>{refs.map(id=><li key={id}><a href={sources[id][1]} target="_blank" rel="noreferrer">{sources[id][0]} <ArrowUpRight size={13} aria-hidden="true"/></a></li>)}</ul>
        </nav>}
      </article>}
      {context&&<details className="recommendation-context">
        <summary><span><ChevronDown size={14} aria-hidden="true"/> Snapshot details</span>
          {!!context.existingAlerts?.length&&<span className="recommendation-flags">Monitor flags present</span>}
        </summary>
        <div className="recommendation-context-body">
          <p className="muted">{context.readings?.length??0} stored readings · {context.history?.length??0} saved snapshots. Simulation support; follow the current mission procedures.</p>
          {!!context.existingAlerts?.length&&<ul aria-label="Existing monitor flags">{context.existingAlerts.map((flag,i)=><li key={i}>{flag}</li>)}</ul>}
          {result?.narrative?.uncertainties?.map((item,i)=><p className="muted" key={i}>{item}</p>)}
        </div>
      </details>}
    </div>
  </section>;
}
