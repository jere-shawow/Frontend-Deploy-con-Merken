import { loadMerkenTelemetry } from '../../../lib/merken-telemetry';
import { demo } from '../../../lib/demo';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (process.env.MERKEN_TELEMETRY_URL) {
    const token=process.env.MERKEN_TELEMETRY_TOKEN;
    if(!token) return Response.json({error:'Merken telemetry token is missing.'},{status:503});
    try {
      return Response.json(await loadMerkenTelemetry(process.env.MERKEN_TELEMETRY_URL,token),
        {headers:{'Cache-Control':'no-store'}});
    } catch {
      return Response.json({error:'Merken telemetry is temporarily unavailable.'},{status:502});
    }
  }
  if (!process.env.DASHBOARD_BACKEND_URL) return Response.json(demo);
  try {
    const response = await fetch(process.env.DASHBOARD_BACKEND_URL, {
      cache:'no-store', signal:AbortSignal.timeout(8000),
      headers:{Accept:'application/json'}
    });
    if (!response.ok) throw new Error('Upstream request failed');
    const data = await response.json();
    if (!Array.isArray(data.crew)) throw new Error('Invalid crew data');
    return Response.json({ ...data, source:'backend' });
  } catch {
    return Response.json({error:'Crew telemetry is temporarily unavailable.'},{status:502});
  }
}
