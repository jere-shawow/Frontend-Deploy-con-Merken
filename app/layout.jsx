import './styles.css';
import './reference-effects.css';
export const metadata = { title: 'PULSYS | Mission Control', description: 'Astronaut telemetry and crew health alerts' };
export default function Layout({children}) {
  return <html lang="en"><body>{children}</body></html>;
}
