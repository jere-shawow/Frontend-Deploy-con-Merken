import { loadMerkenTelemetry } from '../../../lib/merken-telemetry';
import { buildDashboardCrew } from '../../../lib/dashboard-crew';
export const dynamic = 'force-dynamic';
const observedHistory = new Map();

export async function GET() {
  const base=process.env.MERKEN_ASTRONAUTS_URL;
  if (!base && process.env.NODE_ENV === 'development') {
    const {demo} = await import('../../../lib/demo');
    return Response.json(demo, {headers:{'Cache-Control':'no-store'}});
  }
  if (!base) return Response.json({error:'Astronaut backend is not configured.'},{status:503});
  try {
    const response=await fetch(new URL('/api/astronauts',base),{
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),
      headers:{Accept:'application/json'},
    });
    if (!response.ok) throw new Error('Astronaut API request failed');
    const rows=await response.json();
    if (!Array.isArray(rows)) throw new Error('Expected astronaut list');
    let simulatedCrew = [], telemetryWarning;
    if (process.env.MERKEN_TELEMETRY_URL && process.env.MERKEN_TELEMETRY_TOKEN) {
      try {
        const telemetry = await loadMerkenTelemetry(process.env.MERKEN_TELEMETRY_URL, process.env.MERKEN_TELEMETRY_TOKEN);
        if (telemetry.upstreamSimulation) simulatedCrew = telemetry.crew;
      } catch { telemetryWarning = 'Simulator history is temporarily unavailable. Showing backend observations.'; }
    }
    const observedAt = new Date().toISOString();
    const crew = buildDashboardCrew(rows, simulatedCrew, observedHistory, observedAt);
    return Response.json({source:'backend',crew, observedAt, telemetryWarning},{headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({error:'Astronaut backend is unreachable.'},{status:502});
  }
}
