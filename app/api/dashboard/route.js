export const dynamic = 'force-dynamic';

const fields = [
  ['heart','Heart rate','heartRate','bpm'],
  ['oxygen','Blood oxygen','oxygenInBlood','%'],
  ['temperature','Body temperature','bodyTemperature','°C'],
  ['sleep','Sleep','sleepHours','h'],
  ['radiation','Space radiation','spaceRadiation',''],
  ['glucose','Blood glucose','bloodSugar',''],
  ['distance','Distance from Earth','distanceFromEarth',''],
  ['nutrition','Nutrition','nutrition',''],
  ['pressure','Blood pressure','bloodPressure',''],
  ['mood','Mood','mood',''],
];

export async function GET() {
  const base=process.env.MERKEN_ASTRONAUTS_URL;
  if (!base) return Response.json({error:'Astronaut backend is not configured.'},{status:503});
  try {
    const response=await fetch(new URL('/api/astronauts',base),{
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),
      headers:{Accept:'application/json'},
    });
    if (!response.ok) throw new Error('Astronaut API request failed');
    const rows=await response.json();
    if (!Array.isArray(rows)) throw new Error('Expected astronaut list');
    const crew=rows.map(row=>({
      id:String(row.id),
      name:row.astronautName,
      initials:row.astronautName.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join(''),
      metrics:fields.flatMap(([id,label,field,unit])=>{
        const value=row[field];
        return value==null || value==='' ? [] : [[id,label,value,unit,[]]];
      }),
      alerts:[],
      metricStatuses:{},
    }));
    return Response.json({source:'backend',crew},{headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({error:'Astronaut backend is unreachable.'},{status:502});
  }
}
