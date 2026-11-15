const indicators = {
  heart_rate:['heart','Heart rate','bpm'],
  body_temperature:['temperature','Body temperature','celsius'],
  sleep:['sleep','Sleep','hours'],
  stress:['stress','Stress score','score'],
  radiation:['radiation','Space radiation','dose'],
  space_radiation:['radiation','Space radiation','dose'],
  oxygen_in_blood:['oxygen','Blood oxygen','percent'],
  blood_pressure:['systolic','Systolic pressure','systolic'],
  glucose:['glucose','Blood glucose','mg_dl'],
};

export async function loadMerkenTelemetry(base,token) {
  async function get(path,params={}) {
    const url=new URL(path,base);
    for(const [key,value] of Object.entries(params)) url.searchParams.set(key,String(value));
    for (let attempt=0; ; attempt++) {
      try {
    const response=await fetch(url,{
      headers:{Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{})},
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000),
    });
    if(!response.ok) throw new Error('Merken request failed');
    return await response.json();
      } catch (error) {
        if (attempt >= 2 || !(error instanceof TypeError || error.name === "TimeoutError")) throw error;
      }
    }
  }

  const list=await get('/v1/astronauts');
  if(!Array.isArray(list.astronauts)) throw new Error('Invalid Merken roster');
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const crew=await Promise.all(list.astronauts.map(async astronaut => {
    const id=astronaut.astronaut_id;
    const path='/v1/astronauts/'+encodeURIComponent(id);
    const groups=new Map();
    const seen=new Set();
    let cursor=0;
    while(cursor!==null) {
      if(seen.has(cursor)) throw new Error('Repeated Merken cursor');
      seen.add(cursor);
      const page=await get(path+'/records',{limit:100,cursor,from});
      if(!Array.isArray(page.records)) throw new Error('Invalid Merken records');
      for(const record of page.records) {
        const fields=indicators[record.indicator] ? [indicators[record.indicator]] :
          Object.keys(record.value??{}).filter(key=>Number.isFinite(record.value[key])).map(key=>[
            record.indicator+(key==='score'?'':':'+key),
            record.indicator.replaceAll('_',' ')+(key==='score'?'':' · '+key.replaceAll('_',' ')),
            key,
          ]);
        if(record.indicator==='blood_pressure') fields.push(['diastolic','Diastolic pressure','diastolic']);
        for(const [key,label,field] of fields) {
          const value=typeof record.value==='number'?record.value:record.value?.[field];
          if(!Number.isFinite(value)) continue;
          if(!groups.has(key)) groups.set(key,{label,unit:record.unit,points:[]});
          groups.get(key).points.push({value,id:record.record_id,time:record.measured_at});
        }
      }
      if(page.has_more && (page.next_cursor==null || seen.has(page.next_cursor))) throw new Error('Invalid Merken cursor');
      cursor=page.has_more?page.next_cursor:null;
    }
    const metrics=[...groups].map(([key,{label,unit,points}])=>{
      points.sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
      return [key,label,points.at(-1).value,unit,points.map(point=>point.value),points.map(point=>point.id),points.map(point=>point.time)];
    });
    return {id,astronaut_id:id,name:astronaut.display_name,initials:astronaut.display_name.split(/\s+/).map(word=>word[0]).slice(0,2).join(''),metrics,alerts:[],metricStatuses:{}};
  }));
  return {source:'backend', upstreamSimulation:list.simulation===true, crew};
}
