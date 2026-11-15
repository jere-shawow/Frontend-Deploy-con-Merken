import { Orbit } from 'lucide-react';

export default async function Login({searchParams}) {
  const {error}=await searchParams;
  return <main className="demo-login">
    <section className="panel">
      <div className="logo"><Orbit size={23}/></div>
      <h1>PULSYS</h1>
      <p className="muted">Mission control · Demo access</p>
      <form action="/api/demo-session" method="post" className="review-form">
        <label>Username<input name="username" autoComplete="username" required/></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required/></label>
        {error&&<p role="alert">Invalid username or password.</p>}
        <button className="primary-action" type="submit">Enter dashboard</button>
      </form>
    </section>
  </main>;
}
