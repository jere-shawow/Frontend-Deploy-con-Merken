export const dynamic = 'force-dynamic';
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

async function forward(request,context) {
  const {astronautId,operation=[]}=await context.params;
  if (!uuid.test(astronautId) || operation.length>1 || (operation.length===1 && operation[0]!=='retry')) {
    return Response.json({error:'Invalid report path.'},{status:400});
  }
  if (operation.length && request.method!=='POST') return new Response(null,{status:405});
  const base=process.env.MERKEN_TELEMETRY_URL;
  if (!base) return Response.json({error:'Report backend is not configured.'},{status:503});
  try {
    const target=new URL('/v1/astronauts/'+astronautId+'/reports'+(operation.length?'/retry':''),base);
    const headers={Accept:'application/json'};
    if (process.env.MERKEN_TELEMETRY_TOKEN) headers.Authorization='Bearer '+process.env.MERKEN_TELEMETRY_TOKEN;
    const options={method:request.method,headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)};
    if (request.method==='POST' && !operation.length) {
      const body=await request.json();
      const text=JSON.stringify({snapshot:body.snapshot});
      if (Buffer.byteLength(text)>310*1024) return Response.json({error:'Report is too large.'},{status:413});
      options.body=text;
      headers['Content-Type']='application/json';
    }
    const response=await fetch(target,options);
    const result=await response.json();
    return Response.json(response.ok?result:{error:'Report backend rejected the request.'},
      {status:response.status,headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({error:'Report backend is unavailable. Download the JSON to keep a local copy.'},{status:502});
  }
}
export const GET=forward;
export const POST=forward;
