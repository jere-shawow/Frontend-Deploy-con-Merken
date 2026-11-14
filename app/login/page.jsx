export default async function Login({searchParams}) {
  const {error}=await searchParams;
  return <main className="demo-login">
    <section className="panel">
      <h1>Sign in to Orbit</h1>
      <p className="muted">Demo access</p>
      <form action="/api/demo-session" method="post" className="review-form">
        <label>Username<input name="username" autoComplete="username" required/></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required/></label>
        {error&&<p role="alert">Invalid username or password.</p>}
        <button type="submit">Sign in</button>
      </form>
    </section>
  </main>;
}
