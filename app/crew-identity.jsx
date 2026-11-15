import { Frown, HeartPulse, Meh, Moon, Smile } from 'lucide-react';
import { crewSource, moodPresentation } from '../lib/crew-display';

export function CrewVitals({person}) {
  const heart = person.metrics.find(metric => metric[0] === 'heart');
  const mood = moodPresentation(person);
  const MoodIcon = {positive:Smile,low:Frown,tired:Moon}[mood.tone] ?? Meh;
  return <span className="crew-vitals">
    <span className="crew-pulse" title="Latest heart rate"><HeartPulse size={13} aria-hidden="true"/>
      <strong>{heart?.[2] ?? '—'}</strong><small>{heart?.[3] || 'bpm'}</small></span>
    <span className="crew-mood" data-mood={mood.tone} title={mood.label ? 'Reported mood · updates with telemetry' : 'Mood not reported'}><MoodIcon size={13} aria-hidden="true"/>
      <span>{mood.label ?? 'Not reported'}</span></span>
  </span>;
}

export default function CrewIdentity({person}) {
  return <span className="crew-identity">
    <span className="crew-initials" aria-hidden="true">{person.initials}</span>
    <span className="crew-identity-text"><strong className="crew-name">{person.name}</strong>
      <span className="crew-origin" data-source={person.telemetrySource}>{crewSource(person)}</span>
    </span>
    <CrewVitals person={person}/>
  </span>;
}
