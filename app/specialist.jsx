'use client';

import {useEffect,useState} from 'react';
import {ClipboardList, FilePlus2} from 'lucide-react';
import {Trend} from './telemetry';
import MerkenReviews from './merken-reviews';

const format = new Intl.NumberFormat('en-US', {maximumFractionDigits: 2});
const labels = {normal:'Normal', warning:'Warning', critical:'Critical'};

function TelemetryTable({metrics, statuses}) {
  if (!metrics.length) return <p className="muted">No telemetry available.</p>;
  return <div className="table-scroll" tabIndex={0} aria-label="Detailed telemetry">
    <table>
      <thead><tr>{['Metric','Current','Status','Minimum','Average','Maximum','Readings'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{metrics.map(([id,label,value,unit,samples])=>{
        const readings = Array.isArray(samples) ? samples.filter(Number.isFinite) : [];
        const average = readings.reduce((sum,reading)=>sum+reading,0)/readings.length;
        return <tr key={id}>
          <th scope="row">{label} <small>{unit}</small></th>
          <td>{value ?? '—'}</td><td>{value == null ? 'Not assessed' : labels[statuses?.[id]] ?? 'Not assessed'}</td>
          {[Math.min(...readings),average,Math.max(...readings)].map((number,index)=><td key={index}>{readings.length?format.format(number):'—'}</td>)}
          <td>{readings.length?<details><summary>{readings.length} readings</summary><ol>{readings.map((reading,index)=><li key={index}>{format.format(reading)} {unit}</li>)}</ol></details>:'—'}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

function AlertLog({alerts}) {
  return alerts.length ? <ul className="specialist-alerts">{alerts.map((alert,index)=><li key={alert.id??index}>
    <strong>{alert.title}</strong> <span className="muted">{alert.level} · {alert.time}</span>
    <p>{alert.detail}</p>{alert.recommendation&&<p><b>Recommended action</b> {alert.recommendation}</p>}
  </li>)}</ul> : <p className="muted">No alerts available.</p>;
}

export default function Specialist({person,source,scenario}) {
  const key = 'orbit:crew-reviews:' + source + ':' + encodeURIComponent(person.id);
  const [records,setRecords] = useState(null);
  const [message,setMessage] = useState('');
  const [title,setTitle] = useState('');
  const [notes,setNotes] = useState('');
  const [followUp,setFollowUp] = useState('');

  const [metricId,setMetricId] = useState('');
  const [annotation,setAnnotation] = useState(null);
  const [kind,setKind] = useState('note');
  const metric = person.metrics.find(item=>item[0]===metricId) ?? person.metrics[0];

  function selectReading(reading) {
    const metric = person.metrics.find(item=>item[0]===reading.metricId);
    const samples = Array.isArray(metric?.[4]) ? metric[4] : [];
    const sampleIndex = samples.map((value,index)=>Number.isFinite(value)?index:-1).filter(index=>index>=0)[reading.index-1];
    const recordId = metric?.[5]?.[sampleIndex];
    setAnnotation({...reading, recordId, scenario, selectedAt:new Date().toISOString()});
  }

  function loadRecords() {
    const stored = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(stored)) throw new Error('Invalid records');
    return stored;
  }

  useEffect(()=>{
    if (source !== 'demo') return;

    try {
      setRecords(loadRecords());
    } catch {
      setMessage('Saved reviews could not be loaded in this browser.');
    }
  },[key,source]);

  function saveReview(event) {
    event.preventDefault();
    if (!title.trim() || !notes.trim()) {
      setMessage('Enter a title and assessment to save the review.');
      return;
    }
    const record = {
      id:crypto.randomUUID(), createdAt:new Date().toISOString(),
      title:title.trim(), notes:notes.trim(), followUp:followUp.trim(), scenario, kind, annotation,
      weightKg:person.weightKg, heightCm:person.heightCm,
      metrics:person.metrics, statuses:person.metricStatuses, alerts:person.alerts ?? [],
    };
    try {
      const next = [record,...loadRecords()];
      window.localStorage.setItem(key,JSON.stringify(next));
      setRecords(next);
      setTitle(''); setNotes(''); setFollowUp(''); setAnnotation(null); setKind('note');
      setMessage('Review saved in this browser.');
    } catch {
      setMessage('This browser could not save the review. Your draft is still here.');
    }
  }

  return <div className="panel specialist">
    <h2><ClipboardList size={18}/> Crew review</h2>
    <div className="specialist-content">
      {metric&&<section className="specialist-chart">
        <label>Metric <select value={metric[0]} onChange={event=>setMetricId(event.target.value)}>
          {person.metrics.map(([id,label])=><option key={id} value={id}>{label}</option>)}
        </select></label>
        <p className="muted">Select a chart point to attach it to your note or warning.</p>
        <Trend key={metric[0]} metric={metric} statuses={person.metricStatuses} onSelectReading={selectReading}
          selectedReading={annotation?.metricId===metric[0]&&annotation.scenario===scenario?annotation:null}/>
      </section>}
      <section>
        <h3>Detailed telemetry · {person.name}</h3>
        <TelemetryTable metrics={person.metrics} statuses={person.metricStatuses}/>
      </section>
      <section>
        <h3>Alert log</h3><AlertLog alerts={person.alerts ?? []}/>
      </section>
      {source==='backend'?<>
        {annotation&&<div className="attached-reading">
          <span>Selected reading · {annotation.label} · {format.format(annotation.value)} {annotation.unit}</span>
          <button type="button" onClick={()=>setAnnotation(null)}>Remove</button>
        </div>}
        <MerkenReviews person={person} annotation={annotation}/>
      </>:<>
      <section>
        <h3><FilePlus2 size={16}/> Create crew review</h3>
        <p className="muted">Reviews and telemetry snapshots are saved in this browser for this crew member.</p>
        <form className="review-form" onSubmit={saveReview}>
          <label>Review type<select value={kind} onChange={event=>setKind(event.target.value)}><option value="note">Note</option><option value="warning">Warning</option></select></label>
          {annotation&&<div className="attached-reading" role="status">
            <span>Attached reading · {annotation.label} #{annotation.index} · {format.format(annotation.value)} {annotation.unit}{annotation.scenario&&' · '+annotation.scenario}</span>
            <button type="button" onClick={()=>setAnnotation(null)}>Remove</button>
          </div>}
          <label>Title<input required maxLength={100} value={title} onChange={event=>setTitle(event.target.value)}/></label>
          <label>Assessment<textarea required maxLength={3000} rows={4} value={notes} onChange={event=>setNotes(event.target.value)}/></label>
          <label>Follow-up <small>(optional)</small><textarea maxLength={1500} rows={2} value={followUp} onChange={event=>setFollowUp(event.target.value)}/></label>
          <button type="submit">Save review</button>
        </form>
        {message&&<p className="muted" role="status">{message}</p>}
      </section>
      <section>
        <h3>Saved reviews</h3>
        {records?.length===0&&<p className="muted">No saved reviews for this crew member.</p>}
        {records?.map(record=><details key={record.id} className="saved-review">
          <summary>{record.title} <time dateTime={record.createdAt}>{new Date(record.createdAt).toLocaleString('en-US')}</time></summary>
          {record.scenario&&<p className="muted">Demo snapshot · {record.scenario}</p>}
          <p className="muted">{record.kind === 'warning' ? 'Warning' : 'Note'}</p>
          {record.annotation&&<p className="attached-reading">{record.annotation.label} #{record.annotation.index} · {format.format(record.annotation.value)} {record.annotation.unit}
            {record.annotation.scenario&&' · '+record.annotation.scenario} · Selected {new Date(record.annotation.selectedAt).toLocaleString('en-US')}</p>}
          <p className="review-notes">{record.notes}</p>
          {record.followUp&&<p className="review-notes"><b>Follow-up</b> {record.followUp}</p>}
          <p className="muted">Weight {record.weightKg == null ? '—' : record.weightKg+' kg'} · Height {record.heightCm == null ? '—' : record.heightCm+' cm'}</p>
          <TelemetryTable metrics={record.metrics} statuses={record.statuses}/>
          <AlertLog alerts={record.alerts}/>
        </details>)}
      </section>
      </>}
    </div>
  </div>;
}
