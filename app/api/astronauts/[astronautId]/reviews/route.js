const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const json = (data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export const dynamic = 'force-dynamic';

async function forward(request,context) {
  const {astronautId} = await context.params;
  if (!uuid.test(astronautId)) return json({error:'A backend astronaut ID is required.'},400);
  const token=request.headers.get('authorization');
  if (!token?.startsWith('Bearer ')) return json({error:'A reviewer access token is required.'},401);
  const base=process.env.MERKEN_API_URL;
  if (!base) return json({error:'Review storage is not configured.'},503);

  try {
    const upstream = new URL('/v1/astronauts/'+astronautId+'/specialist-reviews',base);
    if (upstream.protocol!=='https:') return json({error:'Review storage requires HTTPS.'},503);
    const headers={Authorization:token,Accept:'application/json'};
    const options={method:request.method,headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)};
    if (request.method==='POST') {
      const id=request.headers.get('Idempotency-Key');
      if (!id || !uuid.test(id)) return json({error:'A valid operation ID is required.'},400);
      const body=await request.json().catch(()=>null);
      if (!body || typeof body.summary!=='string' || !body.summary.trim() || body.summary.length>4000
        || !['routine','soon'].includes(body.attention_level)
        || !Array.isArray(body.recommendations) || body.recommendations.length>1
        || body.recommendations.some(text=>typeof text!=='string'||text.length>500)
        || !Array.isArray(body.about?.record_ids) || body.about.record_ids.length>1
        || body.about.record_ids.some(id=>typeof id!=='string'||!uuid.test(id))) return json({error:'Invalid review fields.'},400);
      headers['Content-Type']='application/json';
      headers['Idempotency-Key']=id;
      options.body=JSON.stringify({
        summary:body.summary, attention_level:body.attention_level, recommendations:body.recommendations,
        about:{record_ids:body.about.record_ids,event_ids:[],evaluation_ids:[],suggestion_ids:[]}
      });
    } else {
      upstream.searchParams.set('limit','50');
      const cursor=new URL(request.url).searchParams.get('cursor');
      if (cursor) upstream.searchParams.set('cursor',cursor);
    }
    const result=await fetch(upstream,options);
    if (!result.ok) {
      const errors={401:'The reviewer session expired or the token is invalid.',403:'This account cannot access these reviews.',404:'Astronaut or referenced reading not found.',409:'The review service rejected a conflicting operation.'};
      if (result.status in errors) return json({error:errors[result.status]},result.status);
      return json({error:'The review service could not process the review request.'},result.status>=500?502:400);
    }
    if (request.method==='POST') return json({saved:true},result.status===201?201:200);
    const page=await result.json();
    if (!Array.isArray(page.reviews) || (page.next_cursor != null
      && (typeof page.next_cursor!=='string' || !page.next_cursor))) throw new Error('Invalid review page');
    return json({
      reviews:page.reviews.map(review=>({
        id:review.review_id, seq:review.seq, summary:review.summary, createdAt:review.created_at,
        kind:review.attention_level, recommendations:review.recommendations??[],
        recordIds:review.about?.record_ids??[],
      })),
      nextCursor:page.next_cursor??null,
    });
  } catch {
    return json({error:'Review storage is temporarily unavailable.'},502);
  }
}
export const GET = forward;
export const POST = forward;
