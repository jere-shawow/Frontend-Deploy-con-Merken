import {cookies} from 'next/headers';
import {cookieName,validSession} from '../../../../../lib/demo-auth';
import {requestRecommendations} from '../../../../../lib/recommendations-api';
export const dynamic='force-dynamic';
export async function GET(request,{params}) {
  if (!validSession((await cookies()).get(cookieName)?.value)) return Response.json({error:'Sign in required.'},{status:401});
  const {astronautId}=await params;
  if (!/^\d{1,18}$/.test(astronautId)) return Response.json({error:'Invalid astronaut.'},{status:400});
  const base=process.env.MERKEN_ANALYSIS_URL||process.env.MERKEN_ASTRONAUTS_URL;
  const token=process.env.BEDROCK_ANALYSIS_API_TOKEN;
  if (!base||!token)return Response.json({error:'Ground context is not configured.'},{status:503});
  try {
    const response=await fetch(new URL('/api/analysis/astronauts/'+astronautId+'/context',base),{
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'X-Analysis-Token':token,Accept:'application/json'},
    });
    if(!response.ok)return Response.json({error:'Ground context is unavailable.'},{status:response.status===404?404:503});
    return Response.json(await response.json(),{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Ground context is unreachable.'},{status:502});}
}
export async function POST(request,{params}) {
  if (!validSession((await cookies()).get(cookieName)?.value)) return Response.json({error:'Sign in required.'},{status:401});
  const {astronautId}=await params;
  return requestRecommendations(request,astronautId,{
    base:process.env.MERKEN_ANALYSIS_URL||process.env.MERKEN_ASTRONAUTS_URL,
    token:process.env.BEDROCK_ANALYSIS_API_TOKEN,origin:process.env.ORBIT_PUBLIC_ORIGIN,
  });
}
