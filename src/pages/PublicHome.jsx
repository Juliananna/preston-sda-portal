import React, { useMemo, useState } from 'react';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { Church, LogIn } from 'lucide-react';
import { paths } from '../firebase';
import { useCollection } from '../utils/firestoreHooks';
import { nextSaturday, toLocalDateString, niceDate } from '../utils/date';

function Header({ ctx }) {
  return <header className="header"><div className="container header-row"><div className="brand"><Church className="brand-icon" />Preston SDA Church</div><div className="actions">{ctx.user ? <a className="btn btn-secondary" href="#/admin">Admin</a> : <a className="btn btn-primary" href="#/login"><LogIn size={18} />Leader Login</a>}</div></div></header>;
}

export default function PublicHome({ ctx }) {
  const content = useCollection(paths.content(), 'date');
  const roster = useCollection(paths.roster(), 'date');
  const [prayer, setPrayer] = useState({ requestText: '', isAnonymous: false, name: '', contact: '', followUp: false });
  const [study, setStudy] = useState({ name: '', contact: '', topics: '' });
  const [message, setMessage] = useState('');

  const target = toLocalDateString(nextSaturday());
  const currentRoster = roster.items.find(r => r.date === target) || roster.items.find(r => r.date >= target);
  const active = useMemo(() => content.items.filter(c => {
    if (c.type === 'event') return new Date(c.date) >= new Date(new Date().toDateString());
    return !c.endDate || new Date(c.endDate) >= new Date(new Date().toDateString());
  }).filter(c => c.status !== 'draft' && c.status !== 'archived' && c.includeOnWebsite !== false), [content.items]);
  const announcements = active.filter(c => c.type === 'announcement');
  const notices = active.filter(c => c.type === 'notice');
  const events = active.filter(c => c.type === 'event').sort((a,b) => new Date(a.date) - new Date(b.date));

  async function submitPrayer(e) {
    e.preventDefault();
    await addDoc(paths.requests(), { type: 'prayer', ...prayer, name: prayer.isAnonymous ? 'Anonymous' : prayer.name, contact: prayer.isAnonymous ? '' : prayer.contact, status: 'new', notes: [], timestamp: serverTimestamp() });
    setPrayer({ requestText: '', isAnonymous: false, name: '', contact: '', followUp: false });
    setMessage('Thank you. Your prayer request has been received.');
  }
  async function submitStudy(e) {
    e.preventDefault();
    await addDoc(paths.requests(), { type: 'study', ...study, status: 'new', notes: [], timestamp: serverTimestamp() });
    setStudy({ name: '', contact: '', topics: '' });
    setMessage('Thank you. We will be in touch soon.');
  }

  return <>
    <Header ctx={ctx} />
    <main className="container">
      <section className="hero"><h1>Welcome to Our Community</h1><p>Stay connected with our latest Sabbath program, events, announcements, notices, and ways to pray together.</p></section>
      <div className="grid grid-3">
        <div className="grid">
          <section>
            <h2 className="card-title">This Sabbath</h2>
            {currentRoster ? <div className="schedule-card"><h3>{niceDate(currentRoster.date)}</h3><div className="role-grid">
              <div className="role"><strong>Preaching:</strong><br />{currentRoster.preacher || 'TBA'}</div>
              <div className="role"><strong>Elder:</strong><br />{currentRoster.elder || 'TBA'}</div>
              <div className="role"><strong>Sabbath School:</strong><br />{currentRoster.sabbathSchool || 'TBA'}</div>
              <div className="role"><strong>Children's Story:</strong><br />{currentRoster.childrensStory || 'TBA'}</div>
              <div className="role"><strong>Song Leader:</strong><br />{currentRoster.songLeader || 'TBA'}</div>
              <div className="role"><strong>Sermon:</strong><br />{currentRoster.sermonTitle || currentRoster.preacherDetails?.sermonTitle || 'TBA'}</div>
            </div></div> : <div className="card"><p>No roster has been published yet.</p></div>}
          </section>
          <section><h2 className="card-title">Upcoming Events</h2><div className="grid">{events.slice(0,6).map(e => <div className="event-card" key={e.id}><div className="date-badge"><span>{new Date(e.date).getDate()}</span><span>{new Date(e.date).toLocaleString([], { month: 'short' })}</span></div><div><h3>{e.title}</h3><p className="small">{niceDate(e.date)}</p><p>{e.description}</p></div></div>)}</div></section>
        </div>
        <aside className="grid">
          <div className="card"><h2 className="card-title">Announcements</h2><div className="notice-list">{announcements.length ? announcements.map(a => <div className="notice-item" key={a.id}><h4>{a.title}</h4><p>{a.description}</p></div>) : <p className="small">No announcements.</p>}</div></div>
          <div className="card"><h2 className="card-title">Notices</h2><div className="notice-list">{notices.length ? notices.map(n => <div className="notice-item" key={n.id}><h4>{n.title}</h4><p>{n.description}</p></div>) : <p className="small">No notices.</p>}</div></div>
        </aside>
      </div>
      <section className="card" style={{ margin: '36px 0' }}><h2 className="card-title">Connect & Pray</h2>{message && <p className="success">{message}</p>}<div className="grid grid-2">
        <form onSubmit={submitPrayer}><h3>Submit a Prayer Request</h3><div className="form-row"><label className="label">Prayer Request</label><textarea className="textarea" value={prayer.requestText} onChange={e => setPrayer({ ...prayer, requestText: e.target.value })} required /></div><label><input type="checkbox" checked={prayer.isAnonymous} onChange={e => setPrayer({ ...prayer, isAnonymous: e.target.checked })} /> Remain anonymous</label>{!prayer.isAnonymous && <><div className="form-row"><label className="label">Name</label><input className="input" value={prayer.name} onChange={e => setPrayer({ ...prayer, name: e.target.value })} /></div><div className="form-row"><label className="label">Contact</label><input className="input" value={prayer.contact} onChange={e => setPrayer({ ...prayer, contact: e.target.value })} /></div><label><input type="checkbox" checked={prayer.followUp} onChange={e => setPrayer({ ...prayer, followUp: e.target.checked })} /> Request follow-up</label></>}<br/><br/><button className="btn btn-primary">Submit Prayer Request</button></form>
        <form onSubmit={submitStudy}><h3>Request a Bible Study</h3><div className="form-row"><label className="label">Name</label><input className="input" value={study.name} onChange={e => setStudy({ ...study, name: e.target.value })} required /></div><div className="form-row"><label className="label">Contact</label><input className="input" value={study.contact} onChange={e => setStudy({ ...study, contact: e.target.value })} required /></div><div className="form-row"><label className="label">Topics</label><textarea className="textarea" value={study.topics} onChange={e => setStudy({ ...study, topics: e.target.value })} /></div><button className="btn btn-primary">Request Bible Study</button></form>
      </div></section>
    </main>
    <footer className="card" style={{ borderRadius: 0, textAlign: 'center' }}><p>© Preston Seventh-day Adventist Church · 94 David St, Preston VIC 3072</p></footer>
  </>;
}
