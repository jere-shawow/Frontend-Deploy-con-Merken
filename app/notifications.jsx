'use client';

import { ArrowUpRight, Bell, Plus, Trash2, X } from 'lucide-react';

const levels = { critical: 'Critical', warning: 'Warning', suggestion: 'Advisory' };
const timestamp = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
});

function AlertTime({value}) {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) ? Date.parse(value) : NaN;
  return Number.isFinite(date)
    ? <time dateTime={value} title={value}>{timestamp.format(date)} UTC</time>
    : <span>{value || 'Time unavailable'}</span>;
}

export default function Notifications({notifications, visible, crew, selected, filter, onFilter,
  creating, onToggleCreate, onCreate, canCreate, canDismiss, error, onDismiss, onCrew}) {
  return <section className="panel notifications" aria-label="Crew notification center">
    <header className="notification-header">
      <div><span className="eyebrow">MERKEN / COMMUNICATIONS</span><h2>Crew notifications</h2>
        <p>Health alerts and mission advisories.</p></div>
      <button className="compose-button" disabled={!canCreate} aria-expanded={creating}
        aria-controls="notification-compose" onClick={onToggleCreate}>
        {creating ? <X size={16}/> : <Plus size={16}/>}{creating ? 'Cancel' : 'New advisory'}
      </button>
    </header>
    <div className="notification-toolbar">
      <div className="notification-filters" role="group" aria-label="Filter notifications by severity">
        {['all', ...Object.keys(levels)].map(level => <button key={level} type="button"
          aria-pressed={filter === level} onClick={() => onFilter(level)}>
          {level === 'all' ? 'All' : levels[level]}<span>{notifications.filter(item => level === 'all' || item.alert.level === level).length}</span>
        </button>)}
      </div>
      <span className="notification-order">Priority first</span>
    </div>
    {creating && <form id="notification-compose" className="review-form ground-alert-form" onSubmit={onCreate}>
      <div className="compose-heading"><h3>New crew advisory</h3><span className="eyebrow">MISSION CONTROL</span></div>
      <label>Crew member<select name="crewId" defaultValue={selected?.id} required>
        {crew.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
      </select></label>
      <label>Subject<input name="title" placeholder="Brief, specific subject" maxLength={100} required/></label>
      <label>Message<textarea name="detail" placeholder="Describe the update or requested action" rows={3} maxLength={500} required/></label>
      <button className="primary-action" type="submit">Save advisory</button>
    </form>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="notification-list">
      {visible.length ? visible.map(({person, alert, key}) => <article className="notification-row" data-level={alert.level} key={key}>
        <div className="notification-severity"><i/>{levels[alert.level] ?? 'Advisory'}</div>
        <div className="notification-body">
          <div className="notification-meta"><button className="notification-person" onClick={() => onCrew(person.id)}>
            {person.name}<ArrowUpRight size={12}/></button><AlertTime value={alert.time}/></div>
          <h3>{alert.title}</h3><p>{alert.detail}</p>
          {alert.recommendation && <div className="notification-recommendation"><span>Recommended action</span><p>{alert.recommendation}</p></div>}
        </div>
        <button className="notification-dismiss" title="Dismiss notification" aria-label={`Dismiss ${alert.title} for ${person.name}`}
          disabled={!canDismiss} onClick={() => onDismiss(key)}><Trash2 size={16}/></button>
      </article>) : <div className="notification-empty"><Bell size={24}/><h3>{filter === 'all' ? 'No active notifications' : 'No ' + levels[filter].toLowerCase() + ' notifications'}</h3>
        <p>New crew updates will appear here.</p></div>}
    </div>
    <footer className="notification-footer"><span>{visible.length} {visible.length === 1 ? 'notification' : 'notifications'}</span><span>MERKEN · MISSION CONTROL</span></footer>
  </section>;
}
