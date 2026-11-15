import {useEffect,useId,useRef,useState} from 'react';
import Image from 'next/image';
import { readingWindow } from '../lib/reading-window';
import {metricState,states} from '../lib/metric-status';
import {readingRange,rangeLabels} from '../lib/reading-range';
export {metricState,states} from '../lib/metric-status';
import {Activity, ArrowDownRight, ArrowRight, ArrowUpRight, HeartPulse, Wind, Moon, Waves, Footprints} from 'lucide-react';

const regions = {
  sleep: [62, 8, Moon],
  stress: [38, 14, Waves],
  oxygen: [65, 26, Wind],
  heart: [44, 24, HeartPulse],
  hrv: [50, 36, Activity],
  steps: [54, 92, Footprints],
};

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
        return <button key={key} data-status={status} data-range={readingRange(metric)} aria-pressed={key===active} onClick={()=>onSelect(key)}>
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

      <div className="body-stage body-reference-stage">
        <Image className="body-reference-image" src="/resources/person-example.png" width={986} height={1594}
          sizes="(max-width: 600px) 180px, 200px" alt="" aria-hidden="true" draggable="false"/>
        {metrics.filter(metric => regions[metric[0]]).map(metric => {
          const [key,label] = metric;
          const [left,top,Icon] = regions[key];
          const status = metricState(metric, statuses);
          const description = label + ' · ' + states[status];
          return <button key={key} title={description} aria-label={description} aria-pressed={key===active}
            className="hotspot" data-status={status} data-range={readingRange(metric)} style={{left:left+'%',top:top+'%'}} onClick={()=>onSelect(key)}>
            <Icon size={15}/>
          </button>;
        })}
      </div>
      {renderSignals(metrics)}
    </div>
    <div className="body-legend" aria-label="Signal status colors">
      {Object.entries(states).map(([status,label]) => <span key={status} data-status={status}><i/>{label}</span>)}
    </div>
  </section>;
}




const timeLabel = new Intl.DateTimeFormat('en-GB', {hour:'2-digit', minute:'2-digit', timeZone:'UTC'});
const datedLabel = new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'UTC'});
const interval = 20 * 60 * 1000;

export function Trend({metric, statuses, compact=false, featured=false, onSelectReading, selectedReading}) {
  const [metricId,label,value,unit,samples]=metric;
  const gradient=useId();
  const plotRef=useRef(null);
  const [plotWidth,setPlotWidth]=useState(632);
  const [limit,setLimit]=useState(14);
  const [reading,setReading]=useState(null);
  const {points, offset, period, dates} = readingWindow(samples, metric[6], limit);
  const hasPoints = points.length > 0;
  useEffect(() => {
    if (!plotRef.current) return;
    const observer = new ResizeObserver(([entry]) => setPlotWidth(Math.max(220, Math.round(entry.contentRect.width))));
    observer.observe(plotRef.current);
    return () => observer.disconnect();
  }, [hasPoints]);
  const min=Math.min(...points), max=Math.max(...points);
  const mean=points.reduce((total,point)=>total+point,0)/points.length;
  const delta=points.at(-1)-points[0];
  const status = metricState(metric, statuses);
  const Direction = delta < 0 ? ArrowDownRight : delta > 0 ? ArrowUpRight : ArrowRight;
  const spread = max - min;
  const varies = points.length > 1 && spread > 0;
  const fractionDigits = varies ? Math.min(12, Math.max(2, Math.ceil(-Math.log10(spread / 4)))) : 2;
  const number = new Intl.NumberFormat('en-US', {maximumFractionDigits: fractionDigits});
  const minIndex = points.indexOf(min);
  const maxIndex = points.indexOf(max);
  const pad = spread * .18 || Math.max(Math.abs(min) * .02, .1);
  const low=min-pad, high=max+pad;
  const plotRight=plotWidth-22;
  const first = dates[0];
  const last = dates.at(-1);
  const timed = last > first;
  const axisStart = timed ? Math.floor(first / interval) * interval : 0;
  const axisEnd = timed ? Math.ceil(last / interval) * interval : 0;
  const plotSpan = plotRight - 58;
  const ticks = timed ? Math.round((axisEnd - axisStart) / interval) : 0;
  const labelEvery = Math.max(1, Math.ceil(ticks / Math.max(1, Math.floor(plotSpan / 86))));
  const timeX = timestamp => 58 + (timestamp - axisStart) / (axisEnd - axisStart) * plotSpan;
  const x = index => timed ? timeX(dates[index])
    : points.length === 1 ? 58 + plotSpan / 2 : 58 + index * plotSpan / (points.length - 1);
  const formatTime = (axisEnd - axisStart >= 86400000 ? datedLabel : timeLabel).format;
  const axisTicks = timed ? Array.from({length:Math.floor(ticks / labelEvery) + 1}, (_,i)=>axisStart+i*labelEvery*interval) : [];
  const y=val=>20+(high-val)/(high-low)*160;
  const line=points.map((val,i)=>x(i)+','+y(val)).join(' ');
  const hovered = reading !== null && reading < points.length ? reading : null;
  const tooltipValue = hovered === null ? '' : number.format(points[hovered]) + (unit ? ' ' + unit : '');
  const tooltipWidth = Math.min(plotWidth-16, Math.max(108, tooltipValue.length*7+24));
  const tooltipX = hovered === null ? 0 : Math.max(8, Math.min(plotWidth-tooltipWidth-8, x(hovered)-tooltipWidth/2));
  const tooltipY = hovered === null ? 0 : y(points[hovered])+12;
  function inspectPointer(event) {
    const svg = plotRef.current;
    const matrix = svg?.getScreenCTM();
    if (!matrix || !points.length) return;
    const pointer = svg.createSVGPoint();
    pointer.x = event.clientX; pointer.y = event.clientY;
    const position = pointer.matrixTransform(matrix.inverse());
    if (position.x < 58 || position.x > plotRight || position.y < 10 || position.y > 190) {
      setReading(null); return;
    }
    const index = timed ? dates.reduce((closest, _, i) =>
      Math.abs(x(i)-position.x) < Math.abs(x(closest)-position.x) ? i : closest, 0)
      : Math.round((position.x-58)/plotSpan*Math.max(points.length-1,0));
    setReading(index);
  }
  return <section className={compact?"panel trend compact-trend":"panel trend"} data-status={status} data-range={readingRange(metric)} aria-label={label + ' trend'}>
    <div className="panel-heading"><div><div className="eyebrow">{featured?"PRIMARY TREND":"TELEMETRY TREND"}</div><h2>{label}</h2></div><label className="trend-window">Show <select value={limit} onChange={e=>{setLimit(Number(e.target.value));setReading(null);}}><option value={7}>Last 7 readings</option><option value={14}>Last 14 readings</option><option value={0}>All readings</option></select></label></div>
    {points.length > 0 && <p className="trend-period">{points.length} {metric[7] === 'observed' ? points.length === 1 ? 'observed snapshot' : 'observed snapshots' : points.length === 1 ? 'reading' : 'readings'} · {period}
      {metric[7] === 'observed' && <><br/>Live observations collected by this dashboard. History starts when connected.</>}</p>}
    {readingRange(metric)&&<span className="reading-range-label">Reference range · {rangeLabels[readingRange(metric)]}</span>}
    <div className="trend-summary">
      <div className="trend-current"><span>Current</span><strong>{value ?? 'No reading'} <small>{unit}</small></strong><span className="reading-status"><i/>{states[status]}</span></div>
      {points.length>0&&[['Minimum',min],['Average',mean],['Maximum',max]].map(([name,val])=><div key={name}><span>{name}</span><strong>{number.format(val)} <small>{unit}</small></strong></div>)}
      {points.length>1 && <div className="trend-change"><span>{delta < 0 ? 'Falling' : delta > 0 ? 'Rising' : 'Unchanged'}</span><strong><Direction size={16} aria-hidden="true"/>{delta > 0 ? '+' : ''}{number.format(delta)} <small>{unit}</small></strong></div>}
    </div>
    {points.length > 0 && <p className="trend-period">
      {points.length === 1 ? 'Only one reading available for this metric.'
        : varies ? 'Window variation (max − min): ' + number.format(spread) + (unit ? ' ' + unit : '')
        : 'No variation across these readings.'}
    </p>}
    {points.length>0?<><svg ref={plotRef} className="plot detailed-plot" viewBox={`0 0 ${plotWidth} 216`} role="group" aria-label={label+' trend in '+unit}
      onPointerMove={inspectPointer} onPointerDown={inspectPointer} onPointerLeave={()=>setReading(null)}>
      <defs><linearGradient id={gradient} x2="0" y2="100%"><stop stopColor="var(--chart-color, #8cc1cb)" stopOpacity=".25"/><stop offset="1" stopColor="var(--chart-color, #8cc1cb)" stopOpacity="0"/></linearGradient></defs>
      {[0,1,2,3,4].map(i=>{const position=20+i*40;return <g key={i}><line x1="58" x2={plotRight} y1={position} y2={position} stroke="#354553" strokeDasharray="3 5"/><text x="48" y={position+4} textAnchor="end">{number.format(high-i*(high-low)/4)}</text></g>;})}
      {axisTicks.map(tick => <g key={tick}>
        <line x1={timeX(tick)} x2={timeX(tick)} y1="20" y2="180" stroke="#354553" strokeDasharray="3 5"/>
        <text x={timeX(tick)} y="201" textAnchor={tick===axisStart?'start':tick===axisEnd?'end':'middle'}>{formatTime(tick)}</text>
      </g>)}
      {varies && <line className="average-line" x1="58" x2={plotRight} y1={y(mean)} y2={y(mean)}/>}
      {varies && <polygon points={`${x(0)},180 ${line} ${x(points.length-1)},180`} fill={"url(#"+gradient+")"}/>}{points.length>1 && <polyline points={line} fill="none" stroke="var(--chart-color, #8cc1cb)" strokeWidth="2.5" strokeLinejoin="round"/>}
      {hovered !== null && <line className="chart-cursor-guide" x1={x(hovered)} x2={x(hovered)} y1="20" y2="180"/>}
      {points.map((val,i)=>{
        const index=offset+i+1;
        const selected=selectedReading?.index===index && selectedReading.value===val;
        const extremum = varies && (i === minIndex ? 'Min' : i === maxIndex ? 'Max' : null);
        const pick=()=>onSelectReading?.({metricId,label,unit,index,value:val});
        return <g key={i}>
          <circle cx={x(i)} cy={y(val)} r={selected?7:hovered===i||extremum||points.length===1?5:3} fill={selected?'var(--warn)':'var(--chart-color, #a4d4dd)'}/>
          <circle cx={x(i)} cy={y(val)} r="12" fill="transparent" className={onSelectReading?'reading-point':undefined}
            role={onSelectReading?'button':'img'} tabIndex={0}
            onFocus={()=>setReading(i)} onBlur={()=>setReading(null)}
            aria-label={'Reading '+index+': '+val+' '+unit} aria-pressed={onSelectReading?selected:undefined}
            onClick={onSelectReading?pick:undefined}
            onKeyDown={onSelectReading?event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();pick();}}:undefined}>
          </circle>
          {extremum && <text x={x(i)} y={y(val)+(extremum==="Min"?17:-10)} textAnchor={i===0?"start":i===points.length-1?"end":"middle"}>{extremum}</text>}
          {!timed && (i===0||i===points.length-1||i%Math.ceil(points.length/6)===0)&&<text x={x(i)} y="201" textAnchor="middle">{index}</text>}
        </g>;
      })}
      {hovered !== null && <g className="chart-tooltip" pointerEvents="none" role="tooltip" aria-label={tooltipValue}>
        <path d={`M${x(hovered)},${tooltipY-7} l-6,8 h12 Z`}/>
        <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height="38" rx="7"/>
        <text className="chart-tooltip-value" x={tooltipX+tooltipWidth/2} y={tooltipY+16} textAnchor="middle">{tooltipValue}</text>
        <text className="chart-tooltip-reading" x={tooltipX+tooltipWidth/2} y={tooltipY+29} textAnchor="middle">{dates.length ? formatTime(dates[hovered]) + ' UTC' : 'Reading ' + (offset+hovered+1)}</text>
      </g>}
    </svg><div className="chart-caption">{varies && <span><i/> Window average</span>}<span>{hovered===null?timed ? 'Time (UTC)' : 'Reading sequence · oldest to newest':`Reading ${offset+hovered+1} · ${number.format(points[hovered])} ${unit}`}</span></div>
    <details className="readings"><summary>View readings ({points.length})</summary><ol start={offset+1}>{points.map((val,i)=><li key={i}>{number.format(val)} {unit}</li>)}</ol></details></>:<p className="muted">No readings available for this metric.</p>}
  </section>;
}
