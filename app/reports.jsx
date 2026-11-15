'use client';
import {useState} from 'react';

export default function Reports({person}) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [entries,setEntries]=useState([]);
  const endpoint='/api/astronauts/'+encodeURIComponent(person.astronaut_id??person.id)+'/reports';
  function download(data,name) {
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link=document.createElement('a');
    link.href=url; link.download=name; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function run(action) {
    setBusy(true); setMessage('');
    try {
      const response=await fetch(endpoint+(action==='retry'?'/retry':''),{
        method:action==='load'?'GET':'POST',
        headers:{'Content-Type':'application/json'},
        ...(action==='save'?{body:JSON.stringify({snapshot:person})}:{}),
      });
      const data=await response.json();
      if (!response.ok) throw new Error(data.error || 'Report request failed.');
      if (action==='save') {
        setEntries(previous=>[data,...previous]);
        setMessage(data.pending?'JSON saved on the server. DynamoDB upload is pending.':'Report saved locally and uploaded to DynamoDB.');
      } else {
        setEntries(data.reports);
        setMessage(action==='retry'?(data.reports.some(entry=>entry.pending)?'Some reports are still pending.':'All saved reports are uploaded.'):'Report history loaded.');
      }
    } catch(error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <section>
    <h3>JSON reports</h3>
    <p className="muted">Save the displayed telemetry and alerts. Pending server copies can be uploaded later.</p>
    <div className="review-form">
      <button disabled={busy} onClick={()=>run('save')}>Save current report</button>
      <button disabled={busy} onClick={()=>run('load')}>Load saved reports</button>
      <button disabled={busy} onClick={()=>run('retry')}>Retry pending uploads</button>
      <button onClick={()=>download({astronaut_id:person.astronaut_id??person.id,created_at:new Date().toISOString(),snapshot:person},'crew-report.json')}>Download current JSON</button>
    </div>
    {message&&<p role="status" className="muted">{message}</p>}
    {entries.map(entry=><article className="saved-review" key={entry.report.report_id}>
      <time>{entry.report.created_at}</time> · {entry.pending?'Pending upload':'Uploaded'}{' '}
      <button onClick={()=>download(entry.report,entry.report.report_id+'.json')}>Download JSON</button>
    </article>)}
  </section>;
}
