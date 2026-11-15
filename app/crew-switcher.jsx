import { Check } from 'lucide-react';
import CrewIdentity from './crew-identity';

export default function CrewSwitcher({crew, selectedId, onSelect, name}) {
  const active = crew.find(person => person.id === selectedId)?.id ?? crew[0]?.id ?? '';
  return <section className="crew-switcher" aria-label="Choose astronaut">
    <div className="crew-switcher-heading"><h2>Select astronaut</h2><span>{crew.length} crew members</span></div>
    {name && <input type="hidden" name={name} value={active}/>}
    <div className="crew-switcher-options" role="group" aria-label="Astronaut selection">
      {crew.map(person => <button type="button" key={person.id} className="crew-switcher-option"
        aria-label={'Select ' + person.name} aria-pressed={person.id === active} onClick={() => onSelect(person.id)}>
        <CrewIdentity person={person}/>
        {person.id === active && <Check className="crew-switcher-check" size={14} aria-hidden="true"/>}
      </button>)}
    </div>
  </section>;
}
