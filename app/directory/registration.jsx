const metrics = [
  ['spaceRadiation','Space radiation',0],
  ['distanceFromEarth','Distance from Earth',0],
  ['heartRate','Heart rate (bpm)',20,250,1],
  ['bloodSugar','Blood glucose',0],
  ['bodyTemperature','Body temperature (°C)',30,45],
  ['sleepHours','Sleep (hours)',0,24],
  ['nutrition','Nutrition (kcal)',0,10000,1],
  ['oxygenInBlood','Blood oxygen (%)',0,100],
  ['bodyBattery','Body Battery (optional)',0,100,1,true],
  ['hrv','HRV (ms, optional)',0,300,'any',true],
];

const moods={EXCELENTE:'Excellent',BUENO:'Good',NEUTRAL:'Neutral',CANSADO:'Tired',ESTRESADO:'Stressed',ANSIOSO:'Anxious'};

export default function Registration({busy,onSave,onCancel}) {
  function submit(event) {
    event.preventDefault();
    const fields=new FormData(event.currentTarget);
    const payload={
      astronautName:fields.get('astronautName').trim(),
      bloodPressure:fields.get('bloodPressure'),
      mood:fields.get('mood'),
    };
    for(const [key] of metrics) {
      const value=fields.get(key);
      if(value!=='') payload[key]=Number(value);
    }
    const garminApiKey=fields.get('garminApiKey').trim();
    if(garminApiKey) payload.garminApiKey=garminApiKey;
    onSave(payload);
  }

  return <section className="panel astronaut-registration">
    <h2>Register astronaut</h2>
    <form className="review-form" onSubmit={submit}>
      <div className="registration-grid">
        <label>Name<input name="astronautName" required maxLength={100} pattern=".*\S.*"/></label>
        <label>Mood<select name="mood" defaultValue="" required>
          <option value="" disabled>Select mood</option>
          {Object.entries(moods).map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Blood pressure<input name="bloodPressure" placeholder="120/80" pattern="[0-9]{2,3}/[0-9]{2,3}" maxLength={7} required/></label>
        {metrics.map(([key,label,min,max,step='any',optional=false])=><label key={key}>{label}
          <input name={key} type="number" min={min} max={max} step={step} required={!optional}/>
        </label>)}
      </div>
      <label>Garmin API key (optional)<input type="password" name="garminApiKey" autoComplete="off"/></label>
      <div className="directory-actions">
        <button className="primary-action" disabled={busy}>{busy?'Saving…':'Register astronaut'}</button>
        <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  </section>;
}
