'use client';

import { Orbit } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  function enter(event) {
    event.preventDefault();
    sessionStorage.setItem('merken-demo-session', '1');
    router.replace('/');
  }
  return <main className="demo-login">
    <section className="panel">
      <div className="logo"><Orbit size={23}/></div>
      <h1>Merken</h1>
      <p className="muted">Mission control · Demo access</p>
      <form onSubmit={enter} className="review-form">
        <label>Username<input name="username" autoComplete="off" required/></label>
        <label>Password<input name="password" type="password" autoComplete="off" required/></label>
        <button className="primary-action" type="submit">Enter dashboard</button>
      </form>
    </section>
  </main>;
}
