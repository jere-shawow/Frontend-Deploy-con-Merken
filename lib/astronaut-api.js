export async function forwardAstronaut(request, path = []) {
  const garmin = path.length === 2 && path[1] === 'garmin';
  const allowed = garmin ? ['PUT'] : path.length === 0 ? ['GET','POST'] : ['GET','PUT','DELETE'];
  if ((path.length > 1 && !garmin) || !allowed.includes(request.method)) {
    return Response.json({error:'Unsupported operation.'},{status:405});
  }
  if (request.method !== 'GET' && process.env.MERKEN_ASTRONAUTS_WRITE_ENABLED !== 'true') {
    return Response.json({error:'Astronaut editing requires a protected deployment.'},{status:403});
  }
  const base = process.env.MERKEN_ASTRONAUTS_URL;
  if (!base) return Response.json({error:'Astronaut API is not configured.'},{status:503});
  try {
    const target = new URL('/api/astronauts'+(path.length?'/'+path.map(encodeURIComponent).join('/'):''),base);
    const name = new URL(request.url).searchParams.get('name');
    if (!path.length && request.method==='GET' && name) target.searchParams.set('name',name);
    const options = {method:request.method,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}};
    if (['POST','PUT'].includes(request.method)) {
      const body = await request.json().catch(()=>null);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({error:'Expected a JSON object.'},{status:400});
      options.headers['Content-Type']='application/json';
      const apiKey=garmin && typeof body.apiKey==='string' ? body.apiKey.trim() : '';
      if (garmin && !apiKey) return Response.json({error:'Enter a Garmin API key.'},{status:400});
      options.body=JSON.stringify(garmin?{apiKey}:body);
    }
    const response=await fetch(target,options);
    if (garmin) {
      if (response.ok) return Response.json({linked:true},{headers:{'Cache-Control':'no-store'}});
      const error=response.status===404 ? 'Astronaut not found.' : 'Garmin could not be linked. Check the key and try again.';
      return Response.json({error},{status:response.status,headers:{'Cache-Control':'no-store'}});
    }
    return new Response(response.status===204?null:await response.text(),{
      status:response.status,
      headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
    });
  } catch {
    return Response.json({error:'Astronaut backend is unreachable.'},{status:502});
  }
}
