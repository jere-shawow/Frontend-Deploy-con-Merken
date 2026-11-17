import {existsSync,readFileSync,mkdirSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';

const MAX_POINTS=288;
function checkedEntries(entries) {
  if(!Array.isArray(entries))throw new Error('Invalid observation history');
  return entries.map(entry=>{
    if(!Array.isArray(entry)||entry.length!==2||typeof entry[0]!=='string'||!Array.isArray(entry[1]))throw new Error('Invalid history entry');
    const [id,metric]=JSON.parse(entry[0]);
    if(!/^\d{1,18}$/.test(String(id))||!/^\w{1,40}$/.test(metric))throw new Error('Invalid history key');
    const rows=entry[1];
    if(rows.some(row=>!row||!Number.isFinite(row.value)||typeof row.time!=='string'||!Number.isFinite(Date.parse(row.time))
      || !(row.sync==null||typeof row.sync==='string')))throw new Error('Invalid observation');
    return [entry[0],[...rows].sort((a,b)=>Date.parse(a.time)-Date.parse(b.time)).slice(-MAX_POINTS)];
  });
}

export function loadObservationHistory(file) {
  if(!file||!existsSync(file))return new Map();
  const saved=JSON.parse(readFileSync(file,'utf8'));
  if(saved.version!==1)throw new Error('Unsupported observation history');
  return new Map(checkedEntries(saved.entries));
}

export function saveObservationHistory(file,history) {
  if(!file)return;
  const entries=checkedEntries([...history]);
  const content=JSON.stringify({version:1,kind:'dashboard_observations',sensorMeasurementTimesVerified:false,entries});
  mkdirSync(dirname(file),{recursive:true,mode:0o700});
  const pending=file+'.'+randomUUID()+'.pending';
  try {
    writeFileSync(pending,content,{mode:0o600,flag:'wx',flush:true});
    renameSync(pending,file);
  } catch(error) {
    if(existsSync(pending))unlinkSync(pending);
    throw error;
  }
}
