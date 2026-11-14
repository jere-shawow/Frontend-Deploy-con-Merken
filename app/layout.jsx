import './styles.css';
export const metadata = { title: 'Orbit | Crew Health', description: 'Astronaut telemetry and crew health alerts' };
export default function Layout({children}) {
  return <html lang="en"><body>{children}</body></html>;
}