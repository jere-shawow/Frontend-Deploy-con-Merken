'use client';

import { useEffect, useState } from 'react';
import { useLocalState } from './use-local-state';
import { CalendarDays, ChevronDown } from 'lucide-react';
import CrewSwitcher from './crew-switcher';

const recordDate = new Intl.DateTimeFormat('en-US', {dateStyle:'medium', timeZone:'UTC'});
const format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

function snapshot(person, source, date, kind) {
  const capturedAt = date.toISOString();
  const day = capturedAt.slice(0, 10);
  const metrics = person.metrics.flatMap(([id, label, value, unit, series, , times]) => {
    if (!series?.length || !Array.isArray(series) || !Array.isArray(times) || times.length !== series.length) {
      const latest = typeof value === 'string' && value.trim() ? Number(value.replaceAll(',', '')) : value;
      return Number.isFinite(latest) ? [{ id, label, unit, latest }]
        : typeof value === 'string' && value.trim() ? [{ id, label, unit, latest:value }] : [];
    }
    const dayStart = Date.parse(day + 'T00:00:00Z');
    const readings = series.filter((reading, index) => {
      const measuredAt = Date.parse(times[index]);
      return Number.isFinite(reading) && measuredAt >= dayStart && measuredAt <= date.getTime();
    });
    if (!readings.length) return [];
    const total = readings.reduce((sum, reading) => sum + reading, 0);
    return [{ id, label, unit, latest: readings.at(-1), count: readings.length, average: total / readings.length }];
  });
  if (!metrics.length) return null;
  return { id: crypto.randomUUID(), crewId: person.id, day, kind, source, capturedAt, metrics };
}

export default function CrewRecords({ active, crew, selected, onCrew, source, fresh }) {
  const [records, updateRecords] = useLocalState('merken-crew-records-v1');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const ready = records !== null;

  useEffect(() => {
    if (!ready || !fresh || !crew.length) return;
    function captureDaily() {
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const sameDay = (record, crewId) => record.kind === 'daily' && record.source === source
        && record.day === day && record.crewId === crewId;
      const snapshots = crew.map(person => snapshot(person, source, now, 'daily')).filter(next => {
        if (!next) return false;
        const previous = records.find(record => sameDay(record, next.crewId));
        return !previous || (source !== 'demo' && JSON.stringify(previous.metrics) !== JSON.stringify(next.metrics));
      });
      if (!snapshots.length) return;
      try {
        updateRecords(current => {
          const nextRecords = [...current];
          for (const next of snapshots) {
            const index = nextRecords.findIndex(record => sameDay(record, next.crewId));
            if (index === -1) nextRecords.push(next);
            else if (source !== 'demo' && next.capturedAt >= nextRecords[index].capturedAt) {
              nextRecords[index] = { ...next, id: nextRecords[index].id };
            }
          }
          return nextRecords;
        });
      } catch {
        setMessage('Could not save the daily records in this browser.');
      }
    }
    captureDaily();
    const timer = setInterval(captureDaily, 60000);
    return () => clearInterval(timer);
  }, [crew, fresh, records, ready, source]);

  if (!active) return null;
  const visible = (records ?? []).filter(record => record.source === source && record.crewId === selected?.id)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  function generate(event) {
    event.preventDefault();
    const person = crew.find(item => item.id === new FormData(event.currentTarget).get('astronaut'));
    if (!person || !ready || !fresh) return;
    const record = snapshot(person, source, new Date(), 'manual');
    if (!record) {
      setMessage('No readings available for this record.');
      return;
    }
    try {
      updateRecords(current => [...current, record]);
      onCrew(person.id);
      setGenerating(false);
      setMessage('Record saved.');
    } catch {
      setMessage('Could not save the record in this browser.');
    }
  }

  return <section className="panel crew-records">
    <CrewSwitcher crew={crew} selectedId={selected?.id} onSelect={id => {onCrew(id);setMessage('');}}/>
    <div className="panel-heading">
      <div><h2>Crew records</h2>{selected && <p className="muted">{selected.name} · {visible.length} {visible.length === 1 ? 'record' : 'records'}</p>}</div>
      <button className="primary-action" onClick={() => setGenerating(!generating)} disabled={!ready || !fresh || !crew.length}
        aria-expanded={generating}>Generate record</button>
    </div>
    {generating && <form className="record-form" onSubmit={generate}>
      <input type="hidden" name="astronaut" value={selected?.id ?? ''}/>
      <p>Generate a record for <strong>{selected?.name}</strong>.</p>
      <button className="primary-action" disabled={!fresh}>Save record</button>
    </form>}
    {message && <p role="status">{message}</p>}
    <p className="muted">Daily records use UTC and update in this browser while the dashboard is open.</p>
    {visible.length ? <div className="record-list">{visible.map(record => <details className="record-entry" key={record.id}>
      <summary>
        <CalendarDays size={18} aria-hidden="true"/>
        <span><strong>{recordDate.format(new Date(record.capturedAt))}</strong><small>
          <time dateTime={record.capturedAt}>{record.capturedAt.slice(11, 16)} UTC</time> · {record.metrics.length} metrics
        </small></span>
        <span className="record-kind">{record.kind === 'daily' ? 'Daily' : 'Manual'}</span>
        <ChevronDown className="record-chevron" size={16} aria-hidden="true"/>
      </summary>
      <div className="table-scroll"><table className="record-table">
        <thead><tr><th scope="col">Metric</th><th scope="col">Latest</th><th scope="col">Daily average</th><th scope="col">Readings</th></tr></thead>
        <tbody>{record.metrics.map(metric => <tr key={metric.id}>
          <th scope="row">{metric.label}</th>
          <td>{typeof metric.latest === 'number' ? format.format(metric.latest) : metric.latest} <small>{metric.unit}</small></td>
          <td>{Number.isFinite(metric.average) ? <>{format.format(metric.average)} <small>{metric.unit}</small></> : '—'}</td>
          <td>{metric.count ?? '—'}</td>
        </tr>)}</tbody>
      </table></div>
    </details>)}</div> : <p className="muted">No records for this crew member.</p>}
  </section>;
}
