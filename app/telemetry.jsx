import {useId,useState} from 'react';
import { readingWindow } from '../lib/reading-window';
import {Activity, ArrowDownRight, ArrowRight, ArrowUpRight, HeartPulse, Wind, Moon, Waves, Footprints} from 'lucide-react';

const regions = {
  sleep: [50, 11, Moon],
  stress: [24, 35, Waves],
  oxygen: [70, 30, Wind],
  heart: [49, 32, HeartPulse],
  hrv: [49, 48, Activity],
  steps: [55, 77, Footprints],
};

export const states = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
  unknown: 'Not assessed',
};

export function metricState(metric, statuses) {
  const [key, , value] = metric;
  const status = statuses?.[key];
  return value != null && Object.hasOwn(states, status) ? status : 'unknown';
}

export function BodyMap({metrics, statuses, active, onSelect}) {



  const levels = metrics.map(metric => metricState(metric, statuses));
  const overall = ['critical', 'warning'].find(level => levels.includes(level))
    ?? (levels.length && levels.every(level => level === 'normal') ? 'normal' : 'unknown');
  const overallLabel = {normal:'All reported metrics normal', warning:'Needs attention', critical:'Critical signal', unknown:'Assessment incomplete'}[overall];

  function renderSignals(items) {
    return <div className="signal-list">
      {items.map(metric => {
        const [key,label,value,unit] = metric;
        const status = metricState(metric, statuses);
        const Icon = regions[key]?.[2] ?? Activity;
        return <button key={key} data-status={status} aria-pressed={key===active} onClick={()=>onSelect(key)}>
          <Icon size={17} className="signal-icon"/>
          <span className="signal-name">{label}</span>
          <strong>{value ?? '—'} <small>{unit}</small></strong>
          <span className="signal-status"><i/>{states[status]}</span>
        </button>;
      })}
    </div>;
  }

  return <section className="panel body-panel">
    <div className="panel-heading">
      <h2>Body map</h2>
      <span className="health-summary" data-status={overall} role="status"><i/>{overallLabel}</span>
    </div>
    <div className="body-grid">

      <div className="body-stage">
        <svg viewBox="0 0 240 300" aria-hidden="true">
          <defs><linearGradient id="body-fill" x2="0" y2="100%"><stop stopColor="#2b4859"/><stop offset="1" stopColor="#182937"/></linearGradient></defs>
          <circle cx="120" cy="139" r="94" className="body-orbit"/>
          <circle cx="120" cy="139" r="72" className="body-orbit"/>
          <path d="M120 4V296M8 139H232" className="body-orbit"/>
          <path className="silhouette" d="M120 11C106 11 101 24 102 36c1 10 6 17 11 21v10l-27 8c-11 4-17 12-19 24l-6 33-13 39-5 18c-2 7 4 10 8 4l10-15 17-36 8-29 4 33-5 34 6 47-1 47-6 12c-3 6 0 9 7 9h13c4 0 6-5 6-11l4-49 6-48 6 48 4 49c0 6 2 11 6 11h13c7 0 10-3 7-9l-6-12-1-47 6-47-5-34 4-33 8 29 17 36 10 15c4 6 10 3 8-4l-5-18-13-39-6-33c-2-12-8-20-19-24l-27-8V57c5-4 10-11 11-21 1-12-4-25-18-25Z"/>
          <path d="M120 70v84m-31-61 31 11 31-11m-52 23 21 39 21-39m-35 47h28" className="body-detail"/>
        </svg>
        {metrics.filter(metric => regions[metric[0]]).map(metric => {
          const [key,label] = metric;
          const [left,top,Icon] = regions[key];
          const status = metricState(metric, statuses);
          const description = label + ' · ' + states[status];
          return <button key={key} title={description} aria-label={description} aria-pressed={key===active}
            className="hotspot" data-status={status} style={{left:left+'%',top:top+'%'}} onClick={()=>onSelect(key)}>
            <Icon size={15}/>
          </button>;
        })}
      </div>
      {renderSignals(metrics)}
    </div>
  </section>;
}



const number = new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
export function Trend({metric, statuses, compact=false, featured=false, onSelectReading, selectedReading}) {
  const [metricId,label,value,unit,samples]=metric;
  const gradient=useId();
  const [limit,setLimit]=useState(14);
  const [reading,setReading]=useState(null);
  const {points, offset, period} = readingWindow(samples, metric[6], limit);
  const min=Math.min(...points), max=Math.max(...points);
  const mean=points.reduce((total,point)=>total+point,0)/points.length;
  const delta=points.at(-1)-points[0];
  const status = metricState(metric, statuses);
  const Direction = delta < 0 ? ArrowDownRight : delta > 0 ? ArrowUpRight : ArrowRight;
  const pad=(max-min)*.18||1;
  const low=min-pad, high=max+pad;
  const x=index=>58+index*552/Math.max(points.length-1,1);
  const y=val=>20+(high-val)/(high-low)*160;
  const line=points.map((val,i)=>x(i)+','+y(val)).join(' ');
  return <section className={compact?"panel trend compact-trend":"panel trend"} data-status={status} aria-label={label + ' trend'}>
    <div className="panel-heading"><div><div className="eyebrow">{featured?"PRIMARY TREND":"TELEMETRY TREND"}</div><h2>{label}</h2></div><label className="trend-window">Show <select value={limit} onChange={e=>{setLimit(Number(e.target.value));setReading(null);}}><option value={7}>Last 7 readings</option><option value={14}>Last 14 readings</option><option value={0}>All readings</option></select></label></div>
    {points.length > 0 && <p className="trend-period">{points.length} readings · {period}</p>}
    <div className="trend-summary">
      <div className="trend-current"><span>Current</span><strong>{value ?? 'No reading'} <small>{unit}</small></strong><span className="reading-status"><i/>{states[status]}</span></div>
      {points.length>0&&[['Minimum',min],['Average',mean],['Maximum',max]].map(([name,val])=><div key={name}><span>{name}</span><strong>{number.format(val)} <small>{unit}</small></strong></div>)}
      {points.length>1 && <div className="trend-change"><span>{delta < 0 ? 'Falling' : delta > 0 ? 'Rising' : 'Unchanged'}</span><strong><Direction size={16} aria-hidden="true"/>{delta > 0 ? '+' : ''}{number.format(delta)} <small>{unit}</small></strong></div>}
    </div>
    {points.length>0?<><svg className="plot detailed-plot" viewBox="0 0 632 216" role={onSelectReading?"group":"img"} aria-label={label+' trend in '+unit}>
      <defs><linearGradient id={gradient} x2="0" y2="100%"><stop stopColor="var(--chart-color, #8cc1cb)" stopOpacity=".25"/><stop offset="1" stopColor="var(--chart-color, #8cc1cb)" stopOpacity="0"/></linearGradient></defs>
      {[0,1,2,3,4].map(i=>{const position=20+i*40;return <g key={i}><line x1="58" x2="610" y1={position} y2={position} stroke="#354553" strokeDasharray="3 5"/><text x="48" y={position+4} textAnchor="end">{number.format(high-i*(high-low)/4)}</text></g>;})}
      <line className="average-line" x1="58" x2="610" y1={y(mean)} y2={y(mean)}/>
      {points.length>1&&<><polygon points={`58,180 ${line} 610,180`} fill={"url(#"+gradient+")"}/><polyline points={line} fill="none" stroke="var(--chart-color, #8cc1cb)" strokeWidth="2.5" strokeLinejoin="round"/></>}
      {points.map((val,i)=>{
        const index=offset+i+1;
        const selected=selectedReading?.index===index && selectedReading.value===val;
        const pick=()=>onSelectReading?.({metricId,label,unit,index,value:val});
        return <g key={i} onPointerEnter={()=>setReading(i)} onPointerLeave={()=>setReading(null)}>
          <circle cx={x(i)} cy={y(val)} r={selected?7:reading===i?5:3} fill={selected?'var(--warn)':'var(--chart-color, #a4d4dd)'}/>
          <circle cx={x(i)} cy={y(val)} r="12" fill="transparent" className={onSelectReading?'reading-point':undefined}
            role={onSelectReading?'button':undefined} tabIndex={onSelectReading?0:undefined}
            aria-label={'Reading '+index+': '+val+' '+unit} aria-pressed={onSelectReading?selected:undefined}
            onClick={onSelectReading?pick:undefined}
            onKeyDown={onSelectReading?event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();pick();}}:undefined}>
            <title>Reading {index}: {val} {unit}</title>
          </circle>
          {(i===0||i===points.length-1||i%Math.ceil(points.length/6)===0)&&<text x={x(i)} y="201" textAnchor="middle">{index}</text>}
        </g>;
      })}
    </svg><div className="chart-caption"><span><i/> Window average</span><span>{reading===null?'Reading sequence · oldest to newest':`Reading ${offset+reading+1} · ${number.format(points[reading])} ${unit}`}</span></div>
    <details className="readings"><summary>View readings ({points.length})</summary><ol start={offset+1}>{points.map((val,i)=><li key={i}>{number.format(val)} {unit}</li>)}</ol></details></>:<p className="muted">No readings available for this metric.</p>}
  </section>;
}
