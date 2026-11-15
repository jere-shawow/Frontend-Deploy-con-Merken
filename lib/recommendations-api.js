// Server-only proxy. The analysis secret is never returned to the browser.
export async function requestRecommendations(request, astronautId, {base, token, origin, fetcher=fetch}={}) {
  const headers={'Cache-Control':'no-store'};
  const fail=(error,status)=>Response.json({error},{status,headers});
  if (request.method!=='POST') return fail('Use the Recommendations button to generate an assessment.',405);
  if (!/^\d{1,18}$/.test(astronautId)) return fail('Recommendations require a stored backend astronaut record.',400);
  const allowedOrigin=origin || new URL(request.url).origin;
  if (request.headers.get('origin')!==allowedOrigin) return fail('Request origin rejected.',403);
  if (!base || !token) return fail('Ground recommendations are not configured.',503);
  if (Number(request.headers.get('content-length')||0)>2048) return fail('Request too large.',413);
  try {
    const body=await request.json();
    if (!body || body.allowRemoteAnalysis!==true || Object.keys(body).some(k=>!['allowRemoteAnalysis','reportId'].includes(k))) return fail('Explicit ground analysis authorization is required.',400);
    if (body.reportId!=null && (typeof body.reportId!=='string'||body.reportId.length>100)) return fail('Invalid report reference.',400);
    const response=await fetcher(new URL('/api/analysis/astronauts/'+astronautId,base),{
      method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(55000),
      headers:{'Content-Type':'application/json','Accept':'application/json','X-Analysis-Token':token},
      body:JSON.stringify({allowRemoteAnalysis:true,reportId:body.reportId??null}),
    });
    if (!response.ok) {
      const messages={400:'This record cannot be analyzed with the supplied context.',404:'Astronaut or report not found.',429:'An analysis is already running. Please wait and try again.',503:'Nova could not produce an accepted response. Existing alerts remain authoritative.'};
      return fail(messages[response.status]||'Ground analysis is temporarily unavailable.',[400,404,429,503].includes(response.status)?response.status:502);
    }
    const result=await response.json();
    if (!['AWS_BEDROCK','CORE_POLICY'].includes(result.provider) || !result.context || !result.narrative) return fail('Invalid analysis response.',502);
    return Response.json({...result,generatedAt:new Date().toISOString(),astronautId},{headers});
  } catch { return fail('Ground analysis could not be completed. Please retry.',502); }
}
