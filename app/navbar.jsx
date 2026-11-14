import {ClipboardList, LayoutDashboard, Orbit, Radio, RefreshCw, Users} from 'lucide-react';

export const sections = {
  overview:{label:'Overview', tag:'Crew averages & recommendations', title:'Crew health overview', icon:LayoutDashboard},
  astronauts:{label:'Astronauts', tag:'Profiles & telemetry', title:'Astronaut telemetry', icon:Users},
  specialist:{label:'Specialist', tag:'Detailed readings & reviews', title:'Specialist workspace', icon:ClipboardList},
};

export default function Navbar({active, onSelect, sourceLabel, busy, onRefresh}) {
  return <header className="app-navbar">
    <div className="brand"><span className="logo"><Orbit size={23}/></span><div>ORBIT<span>CREW HEALTH</span></div></div>
    <nav className="section-nav" aria-label="Dashboard navigation">
      {Object.entries(sections).map(([id,{label,tag,icon:Icon}])=><button key={id} type="button"
        aria-current={active===id?'page':undefined} onClick={()=>onSelect(id)}>
        <Icon size={17}/><span><strong>{label}</strong><small>{tag}</small></span>
      </button>)}
    </nav>
    <div className="header-actions">
      <span className="source"><Radio size={14}/>{sourceLabel}</span>
      <button type="button" className="refresh" onClick={onRefresh} disabled={busy} aria-label="Refresh telemetry"><RefreshCw size={16}/></button>
    </div>
  </header>;
}