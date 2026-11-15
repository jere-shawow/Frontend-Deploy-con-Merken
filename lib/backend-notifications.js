const parameters={
  PULSE:['Heart rate','bpm'], GLUCOSE:['Blood glucose','mg/dL'],
  TEMPERATURE:['Body temperature','°C'], SLEEP:['Sleep','h'],
};

export async function loadNotifications(base) {
  const url=new URL('/api/notifications',base);
  url.searchParams.set('unreadOnly','false');
  const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});
  if(!response.ok) throw new Error('Notification service unavailable');
  const rows=await response.json();
  if(!Array.isArray(rows)) throw new Error('Invalid notification list');
  return rows.map(row=>{
    const direction=row.level?.toLowerCase();
    const level=row.severity==='CRITICAL'||['very_high','very_low'].includes(direction)?'critical':
      row.severity==='WARNING'||['high','low'].includes(direction)?'warning':'suggestion';
    const [parameter,unit]=parameters[row.parameter]??[];
    return {
      crewId:String(row.astronautId),name:row.astronautName,
      alert:{id:'backend:'+row.id,title:row.title,detail:row.body,recommendation:row.annex,
        sentAt:row.createdAt,level,direction,parameter,unit,measuredValue:row.measuredValue},
    };
  });
}
