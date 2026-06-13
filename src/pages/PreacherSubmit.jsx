import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export default function PreacherSubmit({ token }) {
  const [form, setForm] = useState({ sermonTitle: '', scripture: '', theme: '', summary: '', notes: '', mediaNotes: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault(); setError(''); setStatus('Submitting...');
    try {
      const fn = httpsCallable(functions, 'submitPreacherDetails');
      await fn({ token, ...form });
      setStatus('Thank you. Your sermon details have been submitted.');
    } catch (err) { setStatus(''); setError(err.message || 'Could not submit details.'); }
  }

  return <main className="container" style={{ maxWidth: 760, padding: '48px 0' }}>
    <div className="card">
      <h1>Preacher Sermon Details</h1>
      <p className="small">Submit your sermon details for the bulletin. No login is required, but this link is unique.</p>
      {!token && <p className="error">Missing submission token. Please use the link sent by the church admin.</p>}
      <form onSubmit={submit}>
        <div className="form-row"><label className="label">Sermon Title</label><input className="input" value={form.sermonTitle} onChange={e=>update('sermonTitle',e.target.value)} required /></div>
        <div className="form-row"><label className="label">Scripture / Bible Passage</label><input className="input" value={form.scripture} onChange={e=>update('scripture',e.target.value)} /></div>
        <div className="form-row"><label className="label">Theme</label><input className="input" value={form.theme} onChange={e=>update('theme',e.target.value)} /></div>
        <div className="form-row"><label className="label">Short Summary for Bulletin</label><textarea className="textarea" value={form.summary} onChange={e=>update('summary',e.target.value)} /></div>
        <div className="form-row"><label className="label">Media / PowerPoint Notes</label><textarea className="textarea" value={form.mediaNotes} onChange={e=>update('mediaNotes',e.target.value)} /></div>
        <div className="form-row"><label className="label">Other Notes</label><textarea className="textarea" value={form.notes} onChange={e=>update('notes',e.target.value)} /></div>
        {status && <p className="success">{status}</p>}{error && <p className="error">{error}</p>}
        <div className="actions"><button className="btn btn-primary" disabled={!token}>Submit Details</button><a className="btn btn-light" href="#/">Back to Church Site</a></div>
      </form>
    </div>
  </main>;
}
