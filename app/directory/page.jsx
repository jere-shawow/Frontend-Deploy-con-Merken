'use client';
import {useEffect,useRef,useState} from 'react';
import Registration from './registration';
import GarminDialog from './garmin-dialog';
import './directory.css';

export default function Directory() {
  const [registering,setRegistering]=useState(false);
  const [deviceAstronaut,setDeviceAstronaut]=useState(null);
  const dialogRef=useRef(null);
  const [name,setName]=useState('');
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
  }
  async function run(action) {
    setBusy(true); setMessage('');
    try { await action(); } catch(error) { setMessage(error.message); }
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
    return run(async()=>{
      const created=await request('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      setRegistering(false);
      setName('');
      if(created?.id!=null) setRows(previous=>previous.some(row=>row.id===created.id)?previous:[...previous,created]);
      const result=created?.garminLinkError ? 'Astronaut registered. Garmin could not be linked. You can retry using Link device.' : 'Astronaut registered.';
      try {await list();setMessage(result);}
      catch {setMessage(result+' Refresh the list to see all records.');}
    });
  }

  async function linkGarmin(id,apiKey) {
    await request('/'+encodeURIComponent(id)+'/garmin',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey})});
    setRows(previous=>previous.map(row=>row.id===id?{...row,garminLinked:true}:row));
    setMessage('Garmin device linked.');
  }

  return <main>
    <a href="/">Back to dashboard</a><h1>Astronaut directory</h1>
    <form className="review-form" onSubmit={event=>{event.preventDefault();run(()=>list(name));}}>
      <label>Search by name<input value={name} onChange={event=>setName(event.target.value)}/></label>
      <button disabled={busy}>Search</button>
    </form>
    {message&&<p role="status">{message}</p>}
    <button type="button" disabled={busy} onClick={()=>{setDraft('');setRegistering(true);}}>Register astronaut</button>
    {registering&&<Registration busy={busy} onSave={register} onCancel={()=>setRegistering(false)}/> }
    <div className="table-scroll"><table><thead><tr><th>ID</th><th>Name</th><th>Details</th><th>Device</th></tr></thead>
      <tbody>{rows.map(row=><tr key={row.id}><td>{row.id}</td><td>{row.astronautName??row.name??row.displayName??row.display_name??'—'}</td>
        <td><button disabled={busy} onClick={()=>run(async()=>{const record=await request('/'+encodeURIComponent(row.id));setRegistering(false);setSelected(row.id);const {id,...fields}=record;setDraft(JSON.stringify(fields,null,2));})}>Open</button></td>
        <td><button type="button" disabled={busy} onClick={()=>{setDeviceAstronaut(row);dialogRef.current.showModal();}}>{row.garminLinked ? 'Update Garmin link' : 'Link device'}</button></td>
      </tr>)}</tbody></table></div>
    {draft!==''&&<form className="review-form" onSubmit={save}>
      <label>Astronaut fields (JSON)<textarea rows={10} required value={draft} onChange={event=>setDraft(event.target.value)}/></label>
      <button disabled={busy}>Save astronaut</button>
      {selected!==null&&<button type="button" disabled={busy} onClick={()=>{
        if(!window.confirm('Delete this astronaut and the Garmin link?')) return;
        run(async()=>{await request('/'+encodeURIComponent(selected),{method:'DELETE'});setSelected(null);setDraft('');try{await list(name);setMessage('Astronaut deleted.');}catch{setMessage('Astronaut deleted. Refresh the list to see the change.');}});
      }}>Delete astronaut</button>}
    </form>}
    <GarminDialog dialogRef={dialogRef} astronaut={deviceAstronaut} save={linkGarmin} onClose={()=>setDeviceAstronaut(null)}/>
  </main>;
}
