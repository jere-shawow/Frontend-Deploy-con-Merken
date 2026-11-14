export async function forwardAstronaut(request, path = []) {
  const allowed = path.length === 0 ? ['GET','POST'] : ['GET','PUT','DELETE'];
  if (path.length > 1 || !allowed.includes(request.method)) {
    return Response.json({error:'Unsupported operation.'},{status:405});
  }
  if (request.method !== 'GET' && process.env.MERKEN_ASTRONAUTS_WRITE_ENABLED !== 'true') {
    return Response.json({error:'Astronaut editing requires a protected deployment.'},{status:403});
  }
  const base = process.env.MERKEN_ASTRONAUTS_URL;
  if (!base) return Response.json({error:'Astronaut API is not configured.'},{status:503});
  try {
    const target = new URL('/api/astronauts'+(path.length?'/'+encodeURIComponent(path[0]):''),base);
    const name = new URL(request.url).searchParams.get('name');
    if (!path.length && request.method==='GET' && name) target.searchParams.set('name',name);
    const options = {method:request.method,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}};
    if (['POST','PUT'].includes(request.method)) {
      const body = await request.json().catch(()=>null);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({error:'Expected a JSON object.'},{status:400});
      options.headers['Content-Type']='application/json';
      options.body=JSON.stringify(body);
    }
    const response=await fetch(target,options);
    return new Response(response.status===204?null:await response.text(),{
      status:response.status,
      headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
    });
  } catch {
    return Response.json({error:'Astronaut backend is unreachable.'},{status:502});
  }
}
