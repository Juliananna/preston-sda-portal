import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import './styles.css';
import PublicHome from './pages/PublicHome';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import PreacherSubmit from './pages/PreacherSubmit';

function getRoute() {
  const hash = window.location.hash || '#/';
  const [path, qs = ''] = hash.replace(/^#/, '').split('?');
  return { path: path || '/', params: new URLSearchParams(qs) };
}

function App() {
  const [route, setRoute] = useState(getRoute());
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        setProfile(snap.exists() ? { id: fbUser.uid, ...snap.data() } : null);
      } else {
        setProfile(null);
      }
      setAuthReady(true);
    });
  }, []);

  const ctx = useMemo(() => ({ user, profile, authReady }), [user, profile, authReady]);

  if (route.path === '/login') return <Login ctx={ctx} />;
  if (route.path === '/admin') return <AdminDashboard ctx={ctx} />;
  if (route.path === '/preacher') return <PreacherSubmit token={route.params.get('token')} />;
  return <PublicHome ctx={ctx} />;
}

createRoot(document.getElementById('root')).render(<App />);
