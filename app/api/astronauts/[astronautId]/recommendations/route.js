import {cookies} from 'next/headers';
import {cookieName,validSession} from '../../../../../lib/demo-auth';
import {requestRecommendations} from '../../../../../lib/recommendations-api';
export const dynamic='force-dynamic';
export async function POST(request,{params}) {
  if (!validSession((await cookies()).get(cookieName)?.value)) return Response.json({error:'Sign in required.'},{status:401});
  const {astronautId}=await params;
  return requestRecommendations(request,astronautId,{
    base:process.env.MERKEN_ANALYSIS_URL||process.env.MERKEN_ASTRONAUTS_URL,
    token:process.env.BEDROCK_ANALYSIS_API_TOKEN,origin:process.env.ORBIT_PUBLIC_ORIGIN,
  });
}
