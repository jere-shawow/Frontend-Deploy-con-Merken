'use client';

import {useState} from 'react';

export default function MerkenReviews({person,annotation}) {
  const astronautId=person.astronaut_id ?? person.id;
  const endpoint='/api/astronauts/'+encodeURIComponent(astronautId)+'/reviews';
  const [token,setToken]=useState('');
  const [summary,setSummary]=useState('');
  const [followUp,setFollowUp]=useState('');
  const [kind,setKind]=useState('routine');
  const [pending,setPending]=useState(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [reviews,setReviews]=useState([]);
  const [cursor,setCursor]=useState(null);
  const [loaded,setLoaded]=useState(false);

  async function request(path,options={}) {
    const response=await fetch(path,{...options,headers:{...options.headers,Authorization:'Bearer '+token.trim()},cache:'no-store'});
    const result=await response.json();
    if (!response.ok) throw new Error(result.error || 'Review request failed.');
    return result;
  }

  async function readPage(next) {
    const page=await request(endpoint+(next?'?cursor='+encodeURIComponent(next):''));
    setReviews(previous=>[...(next?previous:[]),...page.reviews].sort((a,b)=>b.seq-a.seq));
    setCursor(page.nextCursor);
    setLoaded(true);
  }

  async function load(next) {
    setBusy(true); setMessage('');
    try { await readPage(next); }
    catch(error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function save(event) {
    event.preventDefault();
    if (!summary.trim()) return;
    const reading=annotation?.recordId;
    if (!pending && annotation && !reading) {
      setMessage('This chart point has no backend record ID. Remove the attachment to save a general review.');
      return;
    }
    const operation=pending ?? {id:crypto.randomUUID(), body:{
      summary:summary.trim(), attention_level:kind,
      recommendations:followUp.trim()?[followUp.trim()]:[],
      about:{record_ids:reading?[reading]:[]},
    }};
    setPending(operation); setBusy(true); setMessage('');
    try {
      await request(endpoint,{
        method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':operation.id},
        body:JSON.stringify(operation.body),
      });
    } catch(error) {
      setMessage(error.message+' Retry to use the same operation ID.');
      setBusy(false);
      return;
    }
    setPending(null); setSummary(''); setFollowUp(''); setKind('routine');
    setMessage('Review saved.');
    try { await readPage(null); }
    catch { setMessage('Review saved. History could not be refreshed.'); }
    finally { setBusy(false); }
  }

  return <section>
    <h3>Crew reviews</h3>
    <p className="muted">Use a ground reviewer access token. Reviews are stored for this astronaut.</p>
    <div className="review-form">
      <label>Reviewer access token<input type="password" autoComplete="off" value={token} disabled={busy} onChange={event=>{
        setToken(event.target.value); setReviews([]); setCursor(null); setLoaded(false);
      }}/></label>
      <button disabled={!token.trim()||busy} type="button" onClick={()=>load(null)}>Load reviews</button>
    </div>
    <form className="review-form" onSubmit={save}>
      <label>Review type<select disabled={!!pending} value={kind} onChange={event=>setKind(event.target.value)}>
        <option value="routine">Note</option><option value="soon">Warning</option>
      </select></label>
      <label>Assessment<textarea required maxLength={4000} rows={4} value={summary} disabled={!!pending} onChange={event=>setSummary(event.target.value)}/></label>
      <label>Follow-up<textarea maxLength={500} rows={2} value={followUp} disabled={!!pending} onChange={event=>setFollowUp(event.target.value)}/></label>
      <button disabled={!token.trim()||busy} type="submit">{pending?'Retry save':'Save review'}</button>
    </form>
    {message&&<p role="status" className="muted">{message}</p>}
    {loaded&&!reviews.length&&<p className="muted">{cursor?'No reviews on the loaded pages.':'No reviews found on the loaded pages.'}</p>}
    {reviews.map(review=><article key={review.id} className="saved-review">
      <strong>{({routine:'Note',soon:'Warning',urgent:'Urgent'})[review.kind] ?? 'Review'}</strong> <time dateTime={review.createdAt}>{review.createdAt}</time>
      <p className="review-notes">{review.summary}</p>
      {review.recommendations.map((text,index)=><p key={index}>{text}</p>)}
      {review.recordIds.length>0&&<p className="muted">Record IDs · {review.recordIds.join(', ')}</p>}
    </article>)}
    {cursor&&<button className="crew-link" disabled={busy} type="button" onClick={()=>load(cursor)}>Load more history</button>}
  </section>;
}
