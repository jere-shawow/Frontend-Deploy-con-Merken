import {useRef,useState} from 'react';

export default function GarminDialog({dialogRef,astronaut,save,onClose}) {
  const [step,setStep]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const input=useRef(null);

  async function submit(event) {
    event.preventDefault();
    const apiKey=input.current.value.trim();
    if(!apiKey){setMessage('Enter a Garmin API key.');return;}
    setBusy(true);
    setMessage('');
    try {
      await save(astronaut.id,apiKey);
      input.current.value='';
      dialogRef.current.close();
    } catch(error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if(input.current) input.current.value='';
    setStep(false);
    setMessage('');
    onClose();
  }

  return <dialog ref={dialogRef} className="panel garmin-dialog" aria-labelledby="garmin-title"
    onClose={close} onCancel={event=>{if(busy) event.preventDefault();}}>
    <h2 id="garmin-title">Link a device</h2>
    <p className="muted">{astronaut?.astronautName ?? astronaut?.name}</p>
    {step ? <form className="review-form" onSubmit={submit}>
      <label>Garmin API key<input ref={input} type="password" autoComplete="off" required disabled={busy} autoFocus/></label>
      {message&&<p role="alert">{message}</p>}
      <button className="primary-action" disabled={busy}>{busy?'Linking…':'Link Garmin'}</button>
    </form> : <div className="review-form"><button className="primary-action" type="button" onClick={()=>setStep(true)}>Link Garmin device</button></div>}
    <button type="button" disabled={busy} onClick={()=>dialogRef.current.close()}>Cancel</button>
  </dialog>;
}
