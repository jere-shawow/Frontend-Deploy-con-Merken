'use client';
import {useEffect,useState} from 'react';

export default function Directory() {
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
    if(!response.ok) throw new Error(data.error||data.message||'HTTP '+response.status);
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
  return <main>
    <a href="/">Back to dashboard</a><h1>Astronaut directory</h1>
    <form className="review-form" onSubmit={event=>{event.preventDefault();run(()=>list(name));}}>
      <label>Search by name<input value={name} onChange={event=>setName(event.target.value)}/></label>
      <button disabled={busy}>Search</button>
    </form>
    {message&&<p role="status">{message}</p>}
    <button type="button" disabled={busy} onClick={()=>{setSelected(null);setDraft(JSON.stringify({astronautName:''},null,2));}}>New astronaut</button>
    <div className="table-scroll"><table><thead><tr><th>ID</th><th>Name</th><th>Details</th></tr></thead>
      <tbody>{rows.map(row=><tr key={row.id}><td>{row.id}</td><td>{row.astronautName??row.name??row.displayName??row.display_name??'—'}</td>
        <td><button disabled={busy} onClick={()=>run(async()=>{const record=await request('/'+encodeURIComponent(row.id));setSelected(row.id);const {id,...fields}=record;setDraft(JSON.stringify(fields,null,2));})}>Open</button></td>
      </tr>)}</tbody></table></div>
    {draft!==''&&<form className="review-form" onSubmit={save}>
      <label>Astronaut fields (JSON)<textarea rows={10} required value={draft} onChange={event=>setDraft(event.target.value)}/></label>
      <button disabled={busy}>Save astronaut</button>
      {selected!==null&&<button type="button" disabled={busy} onClick={()=>{
        if(!window.confirm('Delete this astronaut and the Garmin link?')) return;
        run(async()=>{await request('/'+encodeURIComponent(selected),{method:'DELETE'});setSelected(null);setDraft('');try{await list(name);setMessage('Astronaut deleted.');}catch{setMessage('Astronaut deleted. Refresh the list to see the change.');}});
      }}>Delete astronaut</button>}
    </form>}
  </main>;
}
