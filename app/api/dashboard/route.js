import {loadNotifications} from '../../../lib/backend-notifications';
import { loadMerkenTelemetry } from '../../../lib/merken-telemetry';
import { buildDashboardCrew } from '../../../lib/dashboard-crew';
export const dynamic = 'force-dynamic';
const observedHistory = new Map();

export async function GET() {
  const base=process.env.MERKEN_ASTRONAUTS_URL;
  const telemetry = process.env.MERKEN_TELEMETRY_URL;
  if (!base && telemetry) {
    try {
      const data = await loadMerkenTelemetry(telemetry,process.env.MERKEN_TELEMETRY_TOKEN);
      return Response.json({...data, observedAt:new Date().toISOString(), crew:data.crew.map(person => ({...person,
        telemetrySource:data.upstreamSimulation ? 'simulation' : 'backend',
        historySource:data.upstreamSimulation ? 'simulator' : 'backend'}))}, {headers:{'Cache-Control':'no-store'}});
    } catch {
      return Response.json({error:'Merken telemetry is unavailable.'},{status:502});
    }
  }
  if (!base && process.env.NODE_ENV === 'development') {
    const {demo} = await import('../../../lib/demo');
    return Response.json(demo, {headers:{'Cache-Control':'no-store'}});
  }
  if (!base) return Response.json({error:'Astronaut backend is not configured.'},{status:503});
  try {
    const healthResult=fetch(new URL('/api/astronauts/health-status',base),{
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000),
      headers:{Accept:'application/json'},
    }).then(async response=>{
      if(!response.ok) throw new Error('Health status unavailable');
      const data=await response.json();
      if(!Array.isArray(data)) throw new Error('Invalid health status list');
      return data;
    }).catch(()=>null);
    const notificationResult=loadNotifications(process.env.MERKEN_NOTIFICATIONS_URL || base)
      .then(notifications=>({notifications}),()=>({notificationWarning:'Backend notifications are temporarily unavailable.'}));
    const response=await fetch(new URL('/api/astronauts',base),{
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),
      headers:{Accept:'application/json'},
    });
    if (!response.ok) throw new Error('Astronaut API request failed');
    const rows=await response.json();
    if (!Array.isArray(rows)) throw new Error('Expected astronaut list');
    let simulatedCrew = [], telemetryWarning;
    if (telemetry) {
      try {
        const telemetry = await loadMerkenTelemetry(process.env.MERKEN_TELEMETRY_URL, process.env.MERKEN_TELEMETRY_TOKEN);
        if (telemetry.upstreamSimulation) simulatedCrew = telemetry.crew;
      } catch { telemetryWarning = 'Simulator history is temporarily unavailable. Showing backend observations.'; }
    }
    const observedAt = new Date().toISOString();
    const health = await healthResult;
    const crew = buildDashboardCrew(rows, simulatedCrew, observedHistory, observedAt, health ?? []);
    return Response.json({source:'backend',crew, observedAt, telemetryWarning, healthWarning:health===null ? "Backend health assessments are unavailable." : undefined, ...await notificationResult},{headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({error:'Astronaut backend is unreachable.'},{status:502});
  }
}
