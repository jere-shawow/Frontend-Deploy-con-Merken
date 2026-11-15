'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,ChevronDown,ClipboardList,LoaderCircle,Save} from 'lucide-react';
import {readRecommendations,saveRecommendation,recommendationKey,recommendationSections} from '../lib/saved-recommendations';
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
  const [saved,setSaved]=useState([]),[storageNotice,setStorageNotice]=useState(''),[savedView,setSavedView]=useState(false);
  useEffect(()=>()=>active.current?.abort(),[]);
  const supported=/^\d{1,18}$/.test(String(person.id));
  useEffect(()=>{
    if(!supported)return;
    function load(){
      try {setSaved(readRecommendations(window.localStorage,person.id));}
      catch {setStorageNotice('Local history is unavailable. Existing saved data has not been changed.');}
    }
    load();
    function sync(event){if(event.key===recommendationKey(person.id)||event.key===null)load();}
    window.addEventListener('storage',sync);
    return ()=>window.removeEventListener('storage',sync);
  },[person.id,supported]);
  function save(){
    try {
      setSaved(saveRecommendation(window.localStorage,person.id,result));
      setStorageNotice('Recommendation saved in this browser.');
    } catch {setStorageNotice('Could not save locally. Storage may be full, blocked or unreadable. Existing saved recommendations were preserved.');}
  }
  const alreadySaved=!!result&&saved.some(item=>item.result.generatedAt===result.generatedAt&&item.result.narrative.summary===result.narrative.summary);
  async function generate() {
    if(active.current)return;
    const controller=new AbortController();active.current=controller;setBusy(true);setError('');setStorageNotice('');
    const url='/api/astronauts/'+encodeURIComponent(person.id)+'/recommendations';
    try {
      const context=await fetch(url,{cache:'no-store',signal:controller.signal});
      if(context.ok&&!controller.signal.aborted)setSnapshot(await context.json());
      const response=await fetch(url,{method:'POST',cache:'no-store',signal:controller.signal,
        headers:{'Content-Type':'application/json'},body:JSON.stringify({allowRemoteAnalysis:true})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Recommendations are temporarily unavailable.');
      if(!controller.signal.aborted){setResult(body);setSavedView(false);}
    } catch(e){if(!controller.signal.aborted)setError(e.message||'Recommendations are temporarily unavailable.');}
    finally{if(active.current===controller){active.current=null;setBusy(false);}}
  }
  const context=result?.context??snapshot;
  const refs=[...new Set((result?.narrative?.sourceIds??[]).filter(id=>Object.hasOwn(sources,id)))];
  const sections=recommendationSections(result?.narrative?.summary);
  const generatedAt=Date.parse(result?.generatedAt);
  return <section className="panel recommendations-panel" aria-labelledby="recommendations-heading">
    <header className="recommendations-header">
      <div className="recommendations-heading">
        <span className="recommendations-icon"><ClipboardList size={21} aria-hidden="true"/></span>
        <div><h2 id="recommendations-heading">Pulsys Recommendation</h2><p>{person.name}</p></div>
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
          <span>{savedView?'Saved snapshot':'Generated recommendation'}</span>
          {Number.isFinite(generatedAt)&&<time dateTime={result.generatedAt}>{new Date(generatedAt).toLocaleString('en-US')}</time>}
        </div>
        <div className="recommendation-narrative">
          {sections.length?sections.map(section=><section key={section.title}>
            <h3>{section.title}</h3>
            {section.text.split(/\n+/).filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>)}
          </section>):<p className="muted">No recommendation text was returned.</p>}
        </div>
        <div className="recommendation-local-actions">
          <button type="button" className="recommendation-generate" onClick={save} disabled={busy||alreadySaved}><Save size={16} aria-hidden="true"/>{alreadySaved?'Saved locally':'Save recommendation'}</button>
          <p className="muted">Stored only in this browser on this device. Clearing site data removes local history.</p>
        </div>
        {savedView&&<p className="muted">This is a saved snapshot, not a new assessment. Generate again to use current backend data.</p>}
        {!!refs.length&&<nav className="recommendation-sources" aria-label="Recommendation sources">
          <h3>Sources</h3>
          <ul>{refs.map(id=><li key={id}><a href={sources[id][1]} target="_blank" rel="noreferrer">{sources[id][0]} <ArrowUpRight size={13} aria-hidden="true"/></a></li>)}</ul>
        </nav>}
      </article>}
      {storageNotice&&<p role="status" className="muted">{storageNotice}</p>}
      {!!saved.length&&<details className="recommendation-context">
        <summary><span><ChevronDown size={14} aria-hidden="true"/>Saved recommendations ({saved.length})</span></summary>
        <ul className="recommendation-saved-list">{saved.map(item=><li key={item.id}>
          <span>Saved {new Date(item.savedAt).toLocaleString('en-US')}</span>
          <button type="button" disabled={busy} onClick={()=>{setResult(item.result);setSnapshot(null);setSavedView(true);setError('');setStorageNotice('');}}>View recommendation</button>
        </li>)}</ul>
      </details>}
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
