'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft, ArrowUpRight, Link2, Plus, Search, Users} from 'lucide-react';
import Link from 'next/link';
import Registration from './registration';
import GarminDialog from './garmin-dialog';
import './directory.css';

export default function Directory() {
  const [registrationError,setRegistrationError]=useState('');
  const registrationRef=useRef(null);
  const [deviceAstronaut,setDeviceAstronaut]=useState(null);
  const dialogRef=useRef(null);
  const [name,setName]=useState('');
  const [query,setQuery]=useState('');
  const [loaded,setLoaded]=useState(false);
  const [rows,setRows]=useState([]);
  const [selected,setSelected]=useState(null);
  const [draft,setDraft]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function request(path='',options={}) {
    const response=await fetch('/api/astronauts'+path,options);
    if(response.status===204) return null;
    const data=await response.json();
    if(!response.ok) throw new Error(Object.values(data.errors ?? {}).join(' · ') || data.error || data.message || 'HTTP '+response.status);
    return data;
  }
  async function list(term='') {
    const data=await request(term?'?name='+encodeURIComponent(term):'');
    if(!Array.isArray(data)) throw new Error('The backend did not return an astronaut list.');
    setRows(data);
    setQuery(term);
    setLoaded(true);
  }
  async function run(action, onError=setMessage) {
    setBusy(true); setMessage('');
    try { await action(); } catch(error) { onError(error.message); }
    finally { setBusy(false); }
  }
  useEffect(()=>{run(()=>list());},[]);
  async function save(event) {
    event.preventDefault();
    await run(async()=>{
      const edit=selected!==null;
      await request(edit?'/'+encodeURIComponent(selected):'',{method:edit?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(JSON.parse(draft))});
      setSelected(null); setDraft('');
      try {await list(name);setMessage('Astronaut saved.');} catch {setMessage('Astronaut saved. Refresh the list to see the change.');}
    });
  }
  function register(payload) {
    setRegistrationError('');
    return run(async()=>{
      const created=await request('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      registrationRef.current.close();
      setName('');
      if(created?.id!=null) setRows(previous=>previous.some(row=>row.id===created.id)?previous:[...previous,created]);
      const result=created?.garminLinkError ? 'Astronaut registered. Garmin could not be linked. You can retry using Link device.' : 'Astronaut registered.';
      try {await list();setMessage(result);}
      catch {setMessage(result+' Refresh the list to see all records.');}
    },setRegistrationError);
  }

  async function linkGarmin(id,apiKey) {
    await request('/'+encodeURIComponent(id)+'/garmin',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey})});
    setRows(previous=>previous.map(row=>row.id===id?{...row,garminLinked:true}:row));
    setMessage('Garmin device linked.');
  }

  return <main className="directory-page">
    <header className="directory-header">
      <Link className="directory-back" href="/"><ArrowLeft size={16}/> Dashboard</Link>
      <div className="directory-title">
        <div><h1>Astronaut directory</h1><p className="muted">Manage crew profiles and Garmin connections.</p></div>
        <button className="primary-action directory-button" type="button" disabled={busy} aria-haspopup="dialog"
          onClick={()=>{setRegistrationError('');registrationRef.current.showModal();}}><Plus size={17}/> Register astronaut</button>
      </div>
    </header>
    <section className="panel directory-roster" aria-labelledby="directory-roster-heading">
      <div className="directory-toolbar">
        <div><h2 id="directory-roster-heading"><Users size={19}/> Crew roster</h2>
          {loaded && <p className="muted">{rows.length} {rows.length === 1 ? 'astronaut' : 'astronauts'}{query ? ' matching “' + query + '”' : ''}</p>}
        </div>
        <form className="directory-search" role="search" onSubmit={event=>{event.preventDefault();run(()=>list(name.trim()));}}>
          <label><Search size={16}/><input aria-label="Search by name" placeholder="Search by name" value={name} onChange={event=>setName(event.target.value)}/></label>
          <button className="directory-button" disabled={busy}>Search</button>
          {query && <button className="directory-button" type="button" disabled={busy} onClick={()=>{setName('');run(()=>list());}}>Clear</button>}
        </form>
      </div>
      {message && <p className="directory-message" role="status">{message}</p>}
      {rows.length > 0 ? <div className="table-scroll"><table className="directory-table">
        <thead><tr><th scope="col">Astronaut</th><th scope="col">Device status</th><th scope="col">Actions</th></tr></thead>
        <tbody>{rows.map(row=>{
          const displayName = row.astronautName ?? row.name ?? row.displayName ?? row.display_name ?? '—';
          const initials = displayName.trim().split(/\s+/).slice(0,2).map(part=>part.charAt(0)).join('');
          const isSelected = selected === row.id;
          return <tr key={row.id} data-selected={isSelected}>
            <th scope="row"><span className="directory-identity"><span className="directory-avatar" aria-hidden="true">{initials}</span>
              <span>{displayName}<small>ID {row.id}</small></span></span></th>
            <td><span className="directory-device" data-linked={row.garminLinked === true}>
              {row.garminLinked === true ? 'Garmin linked' : row.garminLinked === false ? 'Not linked' : 'Unknown'}
            </span></td>
            <td><div className="directory-actions">
              <button className="directory-button" disabled={busy} aria-expanded={isSelected} onClick={()=>run(async()=>{
                const {id,...fields}=await request('/'+encodeURIComponent(row.id));
                setSelected(row.id);setDraft(JSON.stringify(fields,null,2));
              })}>Open <ArrowUpRight size={14}/></button>
              <button className="directory-button" type="button" disabled={busy} onClick={()=>{setDeviceAstronaut(row);dialogRef.current.showModal();}}><Link2 size={15}/>{row.garminLinked ? 'Update link' : 'Link device'}</button>
            </div></td>
          </tr>;
        })}</tbody>
      </table></div> : <p className="directory-empty muted">{busy ? 'Loading astronauts…' : loaded ? query ? 'No astronauts match this search.' : 'No astronauts registered.' : 'Crew roster unavailable.'}</p>}
    </section>
    <dialog ref={registrationRef} className="panel registration-dialog" aria-labelledby="registration-title"
      onCancel={event=>{if(busy) event.preventDefault();}}
      onClose={event=>event.currentTarget.querySelector('form').reset()}>
      <Registration busy={busy} error={registrationError} onSave={register} onCancel={()=>registrationRef.current.close()}/>
    </dialog>
    {draft!==''&&<section className="panel directory-editor"><h2>Edit astronaut</h2><form className="review-form" onSubmit={save}>
      <label>Astronaut fields (JSON)<textarea rows={10} required value={draft} onChange={event=>setDraft(event.target.value)}/></label>
      <div className="directory-actions"><button className="primary-action directory-button" disabled={busy}>Save astronaut</button>
      <button className="directory-button" type="button" disabled={busy} onClick={()=>{setSelected(null);setDraft('');}}>Cancel</button>
      {selected!==null&&<button type="button" disabled={busy} onClick={()=>{
        if(!window.confirm('Delete this astronaut and the Garmin link?')) return;
        run(async()=>{await request('/'+encodeURIComponent(selected),{method:'DELETE'});setSelected(null);setDraft('');try{await list(name);setMessage('Astronaut deleted.');}catch{setMessage('Astronaut deleted. Refresh the list to see the change.');}});
      }} className="directory-button directory-delete">Delete astronaut</button>}</div>
    </form></section>}
    <GarminDialog dialogRef={dialogRef} astronaut={deviceAstronaut} save={linkGarmin} onClose={()=>setDeviceAstronaut(null)}/>
  </main>;
}
