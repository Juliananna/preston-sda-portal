import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login({ ctx }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (ctx.user) window.location.hash = '#/admin';

  async function login(e) {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.hash = '#/admin';
    } catch (err) { setError('Login failed. Check your email and password.'); }
  }

  async function reset() {
    setError(''); setMessage('');
    if (!email) return setError('Enter your email first.');
    await sendPasswordResetEmail(auth, email);
    setMessage('Password reset email sent.');
  }

  return (
    <main className="container" style={{ maxWidth: 480, padding: '60px 0' }}>
      <div className="card">
        <h1>Leader Login</h1>
        <form onSubmit={login}>
          <div className="form-row"><label className="label">Email</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="form-row"><label className="label">Password</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
          <div className="actions"><button className="btn btn-primary">Login</button><button type="button" className="btn btn-light" onClick={reset}>Forgot Password</button><a className="btn btn-light" href="#/">Back</a></div>
        </form>
      </div>
    </main>
  );
}
