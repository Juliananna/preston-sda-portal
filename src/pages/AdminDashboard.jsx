import React, { useMemo, useState } from 'react';
import { signOut } from 'firebase/auth';
import { addDoc, arrayUnion, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, collection } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions, paths, appId } from '../firebase';
import { useCollection } from '../utils/firestoreHooks';
import { nextSaturday, toLocalDateString, niceDate } from '../utils/date';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import { BulletinMarkup } from '../components/Bulletin';
import { Church, LayoutDashboard, FilePenLine, ClipboardList, Users, MessageCircleHeart, MessageSquare, LogOut, Printer, Plus, Sparkles, CheckCircle2, AlertTriangle, Mail, History, Wand2, CalendarDays, ShieldCheck, Search, UserRound, NotebookPen, PhoneCall, HeartHandshake, Tags } from 'lucide-react';

const blankRoster = { date: '', status: 'draft', preacher: '', preacher_id: '', elder: '', elder_id: '', sabbathSchool: '', sabbathSchool_id: '', sabbathSchoolHymn: '', sabbathSchoolLesson: '', missionStatement: '', childrensStory: '', childrensStory_id: '', songLeader: '', songLeader_id: '', hymn1: '', hymn2: '', hymn3: '', firstHymn: '', offering: '', benediction: '', sermonTitle: '', scripture: '', theme: '', scriptureVerse: '', scriptureReference: '', openingHymn: '', closingHymn: '', specialEvent: '', preacherLinkStatus: 'not_sent' };
const blankContent = { title: '', type: 'announcement', status: 'draft', priority: 'normal', audience: 'public', placement: ['website', 'bulletin'], date: '', endDate: '', repeat: 'one_week', description: '', imageUrl: '', includeInBulletin: true, includeOnWebsite: true };
const blankMember = { name: '', preferredName: '', email: '', phone: '', mobile: '', address: '', household: '', householdRole: '', membershipStatus: 'member', baptismDate: '', dateOfBirth: '', ministries: '', preferredRoles: '', spiritualGifts: '', skills: '', unavailableDates: '', wwccStatus: '', backgroundCheck: '', communicationPreference: 'email', rosterFrequency: '', pastoralCareStatus: 'active', followUpStatus: 'none', lastContacted: '', emergencyContact: '', dietaryNeeds: '', accessibilityNeeds: '', consentPhoto: false, consentDirectory: false, tags: '', notes: '', internalNotes: [] };
const contentTemplates = [
  { title: 'Fellowship Lunch', type: 'announcement', description: 'Join us after the service for fellowship lunch. Please bring a plate to share if you are able.', includeInBulletin: true, includeOnWebsite: true },
  { title: 'Prayer Meeting', type: 'event', description: 'Join us for prayer, Bible reflection, and encouragement during the week.', includeInBulletin: true, includeOnWebsite: true },
  { title: 'Working Bee', type: 'announcement', description: 'We need volunteers to help care for the church property. All skill levels welcome.', includeInBulletin: true, includeOnWebsite: true },
  { title: 'Bible Study Invitation', type: 'notice', description: 'Interested in studying the Bible? Speak with one of the leaders or submit a Bible study request online.', includeInBulletin: true, includeOnWebsite: true }
];
const roleOptions = ['superAdmin','pastor','churchClerk','communicationsLeader','rosterCoordinator','bulletinEditor','prayerCoordinator','viewer','leader'];
const roleLabels = { superAdmin:'Super Admin', pastor:'Pastor', churchClerk:'Church Clerk', communicationsLeader:'Communications Leader', rosterCoordinator:'Roster Coordinator', bulletinEditor:'Bulletin Editor', prayerCoordinator:'Prayer Coordinator', viewer:'Viewer', leader:'Leader' };

function can(profile, feature) {
  const role = profile?.role || 'viewer';
  if (role === 'superAdmin') return true;
  const matrix = {
    dashboard: roleOptions,
    content: ['pastor','churchClerk','communicationsLeader','bulletinEditor','leader'],
    roster: ['pastor','rosterCoordinator','bulletinEditor','leader'],
    requests: ['pastor','prayerCoordinator','leader'],
    members: ['pastor','churchClerk','rosterCoordinator','leader'],
    leaders: [],
    messages: ['pastor','churchClerk','communicationsLeader','rosterCoordinator','bulletinEditor','prayerCoordinator','leader'],
    audit: ['pastor','churchClerk']
  };
  return (matrix[feature] || []).includes(role);
}

async function logAudit(action, details, user) {
  try { await addDoc(paths.audit(), { action, details, userId: user?.uid || '', userEmail: user?.email || '', timestamp: serverTimestamp() }); } catch (e) { console.warn('Audit log failed', e); }
}

function Nav({ active, setActive, profile }) {
  const links = [
    ['dashboard','Command Centre', LayoutDashboard], ['content','Content Planner', FilePenLine], ['roster','Roster & Bulletin', ClipboardList], ['requests','Care Requests', MessageCircleHeart], ['members','Member Profiles', Users], ['leaders','Leaders & Roles', ShieldCheck], ['messages','Communications', MessageSquare], ['audit','History', History]
  ];
  return <aside className="sidebar"><h2><Church /> Leader Portal</h2>{links.filter(([id]) => can(profile,id)).map(([id,label,Icon]) => <a key={id} className={`nav-link ${active===id?'active':''}`} onClick={(e)=>{e.preventDefault();setActive(id)}} href="#"><Icon size={18}/>{label}</a>)}<button className="btn btn-red" style={{ marginTop: 'auto' }} onClick={() => signOut(auth)}><LogOut size={18}/>Logout</button></aside>;
}

export default function AdminDashboard({ ctx }) {
  const [active, setActive] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const content = useCollection(paths.content(), 'date');
  const roster = useCollection(paths.roster(), 'date');
  const members = useCollection(paths.members(), 'name');
  const requests = useCollection(paths.requests(), 'timestamp', 'desc');
  const messages = useCollection(paths.messages(), 'timestamp');
  const users = useCollection(collection(db, 'users'), 'email');
  const audit = useCollection(paths.audit(), 'timestamp', 'desc');

  if (!ctx.authReady) return <main className="container"><p>Loading...</p></main>;
  if (!ctx.user) { window.location.hash = '#/login'; return null; }
  if (!can(ctx.profile, active)) setTimeout(() => setActive('dashboard'), 0);

  const todayString = toLocalDateString(new Date());
  const activeContent = content.items.filter(c => c.type === 'event' ? String(c.date || '') >= todayString : !c.endDate || c.endDate >= todayString).filter(c => c.status !== 'archived');
  const upcomingRosters = roster.items.filter(r => r.date >= todayString).sort((a,b)=>a.date.localeCompare(b.date));

  return <div className="admin-shell"><Nav active={active} setActive={setActive} profile={ctx.profile} /><main className="admin-main">
    {active === 'dashboard' && <Dashboard profile={ctx.profile} user={ctx.user} content={activeContent} roster={upcomingRosters} allRoster={roster.items} members={members.items} requests={requests.items} setActive={setActive} setModal={setModal} />}
    {active === 'content' && can(ctx.profile,'content') && <ContentManager rows={content.items} setModal={setModal} user={ctx.user} />}
    {active === 'roster' && can(ctx.profile,'roster') && <RosterManager rows={roster.items} members={members.items} content={content.items} setModal={setModal} user={ctx.user} />}
    {active === 'requests' && can(ctx.profile,'requests') && <RequestsManager rows={requests.items} user={ctx.user} setModal={setModal} members={members.items} />}
    {active === 'members' && can(ctx.profile,'members') && <MembersManager rows={members.items} setModal={setModal} user={ctx.user} />}
    {active === 'leaders' && can(ctx.profile,'leaders') && <LeadersManager rows={users.items} currentUser={ctx.user} setModal={setModal} />}
    {active === 'messages' && can(ctx.profile,'messages') && <MessagesManager rows={messages.items} user={ctx.user} content={activeContent} roster={upcomingRosters} setModal={setModal} />}
    {active === 'audit' && can(ctx.profile,'audit') && <AuditManager rows={audit.items} />}
    {modal && <CrudModal modal={modal} close={() => setModal(null)} setModal={setModal} members={members.items} user={ctx.user} />}
  </main></div>;
}

function readinessFor(roster, content=[]) {
  const checks = [
    ['Preacher assigned', !!roster?.preacher], ['Sermon title received', !!(roster?.sermonTitle || roster?.preacherDetails?.sermonTitle)], ['Scripture reading received', !!(roster?.scripture || roster?.preacherDetails?.scripture)], ['Sabbath School leader assigned', !!roster?.sabbathSchool], ['Song leader assigned', !!roster?.songLeader], ['Children\'s story assigned', !!roster?.childrensStory], ['Offering selected', !!roster?.offering], ['Opening hymn selected', !!(roster?.hymn1 || roster?.openingHymn)], ['Benediction confirmed', !!(roster?.benediction || roster?.preacher)], ['At least one announcement ready', content.some(c => c.type==='announcement' && c.status !== 'draft')]
  ];
  const done = checks.filter(c=>c[1]).length;
  return { checks, score: Math.round((done / checks.length) * 100), missing: checks.filter(c=>!c[1]).map(c=>c[0]) };
}

function Dashboard({ profile, user, content, roster, allRoster, members, requests, setActive, setModal }) {
  const next = roster[0];
  const readiness = readinessFor(next, content);
  const openRequests = requests.filter(r => r.status !== 'closed');
  const actions = [
    ['Preview bulletin', () => setActive('roster'), Printer], ['Add announcement', () => setModal({ type:'content', title:'Add Announcement', data: { ...blankContent, type: 'announcement', status: 'ready' } }), Plus], ['Assign missing roles', () => next ? setModal({ type:'roster', title:'Edit This Sabbath', data: next, members }) : setActive('roster'), ClipboardList], ['Weekly email draft', () => setModal({ type:'emailDraft', title:'Weekly Email Draft', data: { roster: next, content } }), Mail]
  ];
  return <>
    <div className="admin-header"><div><h1>This Sabbath Command Centre</h1><p className="small">Welcome, {profile?.name || user.email}. One place to plan Sabbath, publish content, prepare the bulletin, and follow up.</p></div><a className="btn btn-light" href="#/">View Public Site</a></div>
    <section className="command-card"><div><p className="eyebrow">Next Sabbath</p><h2>{next ? niceDate(next.date) : 'No upcoming roster yet'}</h2><p>{next ? `${next.preacher || 'TBA'} preaching${next.sermonTitle || next.preacherDetails?.sermonTitle ? `: “${next.sermonTitle || next.preacherDetails?.sermonTitle}”` : ''}` : 'Add a roster to begin the weekly workflow.'}</p><div className="actions">{actions.map(([label,fn,Icon])=><button key={label} className="btn btn-primary-soft" onClick={fn}><Icon size={17}/>{label}</button>)}</div></div><div className="readiness-circle"><strong>{next ? readiness.score : 0}%</strong><span>ready</span></div></section>
    <div className="grid grid-3 dashboard-stats"><div className="card"><h3>Members</h3><p>{members.length}</p></div><div className="card"><h3>Active content</h3><p>{content.length}</p></div><div className="card"><h3>Open requests</h3><p>{openRequests.length}</p></div></div>
    <div className="grid grid-2" style={{ marginTop: 24 }}><div className="card"><h2>Sabbath Readiness Checklist</h2>{next ? <div className="checklist">{readiness.checks.map(([label,ok])=><div className={`check-item ${ok?'done':'missing'}`} key={label}>{ok?<CheckCircle2 size={18}/>:<AlertTriangle size={18}/>}<span>{label}</span></div>)}</div> : <p>No upcoming roster found.</p>}</div><div className="card"><h2>Important This Week</h2><div className="timeline-list">{openRequests.slice(0,5).map(r=><div key={r.id} className="timeline-item"><strong>{r.type === 'study' ? 'Bible Study' : 'Prayer'} request</strong><span>{r.name || 'Anonymous'} · {r.status || 'new'}</span></div>)}{!openRequests.length && <p className="small">No open care requests.</p>}</div><h3 style={{marginTop:20}}>Next 3 Sabbaths</h3>{allRoster.filter(r=>r.date >= toLocalDateString(new Date())).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3).map(r=><p key={r.id} className="compact-row"><strong>{niceDate(r.date)}</strong><span>{r.preacher || 'TBA'}</span></p>)}</div></div>
  </>;
}

function ContentManager({ rows, setModal, user }) {
  const [filter,setFilter] = useState('all');
  const shown = rows.filter(r => filter==='all' || r.type===filter || r.status===filter);
  return <><div className="admin-header"><div><h1>Content Planner</h1><p className="small">Plan once and publish to the website, bulletin, and weekly email.</p></div><div className="actions"><button className="btn btn-light" onClick={()=>setModal({type:'templatePicker', title:'Start from Template', data:{}})}><Wand2 size={18}/>Templates</button><button className="btn btn-primary" onClick={() => setModal({ type:'content', title:'Add Content', data: blankContent })}><Plus size={18}/>Add New</button></div></div><div className="filter-bar">{['all','announcement','notice','event','draft','ready','published','archived'].map(x=><button key={x} className={`chip ${filter===x?'active':''}`} onClick={()=>setFilter(x)}>{x}</button>)}</div><DataTable rows={shown} columns={[
    {key:'title',label:'Title'}, {key:'type',label:'Type',render:r=><span className="badge">{r.type}</span>}, {key:'status',label:'Status',render:r=><span className={`badge status-${r.status||'draft'}`}>{r.status||'draft'}</span>}, {key:'placement',label:'Publish To',render:r=>[r.includeOnWebsite!==false?'Website':null,r.includeInBulletin!==false?'Bulletin':null].filter(Boolean).join(' + ') || 'Hidden'}, {key:'date',label:'Date'}, {key:'actions',label:'Actions',render:r=><div className="actions"><button className="btn btn-light btn-sm" onClick={()=>setModal({type:'content',title:'Edit Content',data:r})}>Edit</button><button className="btn btn-green btn-sm" onClick={async()=>{await setDoc(doc(paths.content(),r.id),{...r,status:'published'},{merge:true}); await logAudit('Published content', r.title, user);}}>Publish</button><button className="btn btn-red btn-sm" onClick={async()=>{if(confirm('Delete this item?')){await deleteDoc(doc(paths.content(),r.id)); await logAudit('Deleted content', r.title, user);}}}>Delete</button></div>}
  ]}/></>;
}

function RosterManager({ rows, members, content, setModal, user }) {
  const [preview, setPreview] = useState(null);
  const target = toLocalDateString(nextSaturday());
  async function buildBulletin(offset=0) {
    const date = toLocalDateString(nextSaturday(new Date(), offset));
    const r = rows.find(x => x.date === date) || null;
    const today = toLocalDateString(new Date());
    const active = content.filter(c => c.status !== 'archived').filter(c => c.includeInBulletin !== false).filter(c => c.type === 'event' ? String(c.date||'') >= today : !c.endDate || c.endDate >= today);
    setPreview({ date, roster: r, nextRoster: rows.filter(x => x.date > date).sort((a,b)=>a.date.localeCompare(b.date))[0] || null, announcements: active.filter(c=>c.type==='announcement' && c.status !== 'draft'), notices: active.filter(c=>c.type==='notice' && c.status !== 'draft'), events: active.filter(c=>c.type==='event' && c.status !== 'draft') });
  }
  function printPreview() {
    const node = document.getElementById('bulletin-preview');
    let printContainer = document.getElementById('print-container');
    if (!printContainer) { printContainer = document.createElement('div'); printContainer.id = 'print-container'; document.body.appendChild(printContainer); }
    if (!node) { alert('Bulletin preview is not ready yet.'); return; }
    printContainer.innerHTML = node.innerHTML;
    setTimeout(() => window.print(), 50);
  }
  return <><div className="admin-header"><div><h1>Roster & Bulletin</h1><p className="small">Build the Sabbath program, collect speaker details, and print a polished bulletin.</p></div><div className="actions"><button className="btn btn-blue" onClick={()=>buildBulletin(0)}><Printer size={18}/>Preview This Sabbath</button><button className="btn btn-purple" onClick={()=>buildBulletin(-7)}><Printer size={18}/>Preview Last Week</button><button className="btn btn-primary" onClick={() => setModal({ type:'roster', title:'Add Roster', data: { ...blankRoster, date: target }, members })}><Plus size={18}/>Add Roster</button></div></div><DataTable rows={rows} columns={[
    {key:'date',label:'Date',render:r=>niceDate(r.date)}, {key:'status',label:'Status',render:r=><span className={`badge status-${r.status||'draft'}`}>{r.status||'draft'}</span>}, {key:'readiness',label:'Ready',render:r=><strong>{readinessFor(r,content).score}%</strong>}, {key:'preacher',label:'Preacher'}, {key:'sermonTitle',label:'Sermon',render:r=>r.sermonTitle || r.preacherDetails?.sermonTitle || 'TBA'}, {key:'actions',label:'Actions',render:r=><div className="actions"><button className="btn btn-light btn-sm" onClick={()=>setModal({type:'roster',title:'Edit Roster',data:r,members})}>Edit</button><button className="btn btn-green btn-sm" onClick={()=>createPreacherLink(r.id, user)}>Copy Speaker Link</button><button className="btn btn-red btn-sm" onClick={async()=>{if(confirm('Delete this roster?')){await deleteDoc(doc(paths.roster(),r.id)); await logAudit('Deleted roster', r.date, user);}}}>Delete</button></div>}
  ]}/>{preview && <Modal title="Bulletin Preview" onClose={()=>setPreview(null)} footer={<><button className="btn btn-blue" onClick={printPreview}>Print</button><button className="btn btn-light" onClick={()=>setModal({type:'emailDraft', title:'Weekly Email Draft', data:{roster:preview.roster, content:[...preview.announcements,...preview.notices,...preview.events]}})}>Generate Email</button></>}><div id="bulletin-preview"><BulletinMarkup {...preview}/></div></Modal>}</>;
}

async function createPreacherLink(rosterId, user) {
  try { const fn = httpsCallable(functions, 'createPreacherLink'); const res = await fn({ rosterId, appId }); const link = `${window.location.origin}/#/preacher?token=${res.data.token}`; await navigator.clipboard.writeText(link); await logAudit('Created preacher link', rosterId, user); alert('Speaker link copied to clipboard:\n' + link); } catch (err) { alert('Could not create link: ' + err.message); }
}

function RequestsManager({ rows, user, setModal, members }) {
  const [filter,setFilter]=useState('open');
  const [search,setSearch]=useState('');
  const shown = rows
    .filter(r => filter==='all' ? true : filter==='open' ? r.status !== 'closed' : r.status === filter)
    .filter(r => [r.name,r.contact,r.requestText,r.topics,r.type,r.status].join(' ').toLowerCase().includes(search.toLowerCase()));
  async function setStatus(row,status){ await setDoc(doc(paths.requests(),row.id),{status, updatedAt: serverTimestamp()},{merge:true}); await logAudit('Updated request status', `${row.name || 'Anonymous'} -> ${status}`, user); }
  async function setPriority(row,priority){ await setDoc(doc(paths.requests(),row.id),{priority, updatedAt: serverTimestamp()},{merge:true}); await logAudit('Updated request priority', `${row.name || 'Anonymous'} -> ${priority}`, user); }
  return <>
    <div className="admin-header"><div><h1>Care Requests</h1><p className="small">Prayer, Bible study, pastoral care, and follow-up requests. Add notes so nothing gets lost.</p></div></div>
    <div className="grid grid-3 dashboard-stats"><div className="card"><h3>Open</h3><p>{rows.filter(r=>r.status!=='closed').length}</p></div><div className="card"><h3>New</h3><p>{rows.filter(r=>(r.status||'new')==='new').length}</p></div><div className="card"><h3>With notes</h3><p>{rows.filter(r=>r.notes?.length || r.internalNotes?.length).length}</p></div></div>
    <div className="filter-bar"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search requests..." /></div>{['open','new','in_progress','closed','all'].map(x=><button key={x} className={`chip ${filter===x?'active':''}`} onClick={()=>setFilter(x)}>{x}</button>)}</div>
    <DataTable rows={shown} columns={[
      {key:'timestamp',label:'Date',render:r=>r.timestamp?.toDate ? r.timestamp.toDate().toLocaleString() : 'N/A'},
      {key:'type',label:'Type',render:r=><span className="badge">{r.type}</span>},
      {key:'status',label:'Status',render:r=><span className={`badge status-${r.status||'new'}`}>{r.status||'new'}</span>},
      {key:'priority',label:'Priority',render:r=><select className="select compact-select" value={r.priority||'normal'} onChange={e=>setPriority(r,e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select>},
      {key:'name',label:'Name'}, {key:'contact',label:'Contact'},
      {key:'requestText',label:'Request',render:r=><span>{r.requestText || r.topics || ''}</span>},
      {key:'notes',label:'Notes',render:r=><span className="badge">{(r.notes?.length || r.internalNotes?.length || 0)} notes</span>},
      {key:'actions',label:'Actions',render:r=><div className="actions"><button className="btn btn-light btn-sm" onClick={()=>setModal({type:'requestDetail', title:'Request Details', data:r, members})}>Open</button><button className="btn btn-blue btn-sm" onClick={()=>setModal({type:'note', title:'Add Request Note', data:{ target:'request', row:r }})}><NotebookPen size={14}/>Note</button><button className="btn btn-light btn-sm" onClick={()=>setStatus(r,'in_progress')}>In progress</button><button className="btn btn-green btn-sm" onClick={()=>setStatus(r,'closed')}>Close</button></div>}
    ]}/>
  </>;
}

function MembersManager({ rows, setModal, user }) {
  const [search,setSearch]=useState('');
  const [status,setStatusFilter]=useState('all');
  const shown = rows
    .filter(m => status==='all' || (m.membershipStatus || 'member') === status || (m.pastoralCareStatus || '') === status)
    .filter(m => [m.name,m.preferredName,m.email,m.phone,m.mobile,m.household,m.ministries,m.preferredRoles,m.tags,m.notes].join(' ').toLowerCase().includes(search.toLowerCase()));
  const statuses = ['all','member','regular_attender','visitor','transferred','inactive','active','needs_follow_up'];
  return <>
    <div className="admin-header"><div><h1>Member Management Portal</h1><p className="small">A central place for member profiles, households, ministry involvement, availability, care notes, and communication preferences.</p></div><button className="btn btn-primary" onClick={() => setModal({ type:'member', title:'Add Member', data: blankMember })}><Plus size={18}/>Add Member</button></div>
    <div className="grid grid-3 dashboard-stats"><div className="card"><h3>Total profiles</h3><p>{rows.length}</p></div><div className="card"><h3>Active care</h3><p>{rows.filter(m=>(m.pastoralCareStatus||'active')==='needs_follow_up').length}</p></div><div className="card"><h3>Roster-ready</h3><p>{rows.filter(m=>m.preferredRoles || m.ministries).length}</p></div></div>
    <div className="filter-bar"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search members, ministries, households, tags..." /></div>{statuses.map(x=><button key={x} className={`chip ${status===x?'active':''}`} onClick={()=>setStatusFilter(x)}>{x.replaceAll('_',' ')}</button>)}</div>
    <DataTable rows={shown} columns={[
      {key:'name',label:'Name',render:m=><div><strong>{m.name}</strong>{m.preferredName && <div className="small">Preferred: {m.preferredName}</div>}</div>},
      {key:'contact',label:'Contact',render:m=><div>{m.email && <div>{m.email}</div>}{(m.phone||m.mobile) && <div className="small">{m.mobile||m.phone}</div>}</div>},
      {key:'household',label:'Household'},
      {key:'membershipStatus',label:'Status',render:m=><span className="badge">{(m.membershipStatus||'member').replaceAll('_',' ')}</span>},
      {key:'ministries',label:'Ministries'},
      {key:'preferredRoles',label:'Roster Roles'},
      {key:'pastoralCareStatus',label:'Care',render:m=><span className={`badge status-${m.pastoralCareStatus||'active'}`}>{(m.pastoralCareStatus||'active').replaceAll('_',' ')}</span>},
      {key:'actions',label:'Actions',render:m=><div className="actions"><button className="btn btn-light btn-sm" onClick={()=>setModal({type:'memberProfile', title:'Member Profile', data:m})}><UserRound size={14}/>Profile</button><button className="btn btn-light btn-sm" onClick={()=>setModal({type:'member',title:'Edit Member',data:m})}>Edit</button><button className="btn btn-blue btn-sm" onClick={()=>setModal({type:'note', title:'Add Member Note', data:{ target:'member', row:m }})}><NotebookPen size={14}/>Note</button><button className="btn btn-red btn-sm" onClick={async()=>{if(confirm('Delete member?')){await deleteDoc(doc(paths.members(),m.id)); await logAudit('Deleted member', m.name, user);}}}>Delete</button></div>}
    ]}/>
  </>;
}

function LeadersManager({ rows, currentUser, setModal }) {
  return <><div className="admin-header"><div><h1>Leaders & Roles</h1><p className="small">Use specific roles so each volunteer sees the tools they need.</p></div><button className="btn btn-primary" onClick={()=>setModal({type:'leader',title:'Add Leader',data:{role:'leader'}})}><Plus size={18}/>Add Leader</button></div><DataTable rows={rows} columns={[
    {key:'name',label:'Name'}, {key:'email',label:'Email'}, {key:'role',label:'Role',render:r=>roleLabels[r.role] || r.role}, {key:'actions',label:'Actions',render:r=><div className="actions"><button className="btn btn-light btn-sm" onClick={()=>setModal({type:'leaderEdit',title:'Edit Leader',data:r})}>Edit</button><button className="btn btn-red btn-sm" disabled={r.id===currentUser.uid} onClick={()=>deleteLeader(r.id)}>Delete</button></div>}
  ]}/></>;
}
async function deleteLeader(uid){ if(!confirm('Delete this leader login and profile?')) return; const fn = httpsCallable(functions,'deleteUser'); await fn({ uid }); }

function MessagesManager({ rows, user, content, roster, setModal }) {
  const [text,setText]=useState('');
  const [title,setTitle]=useState('');
  const [channel,setChannel]=useState('internal');
  const [audience,setAudience]=useState('leaders');
  async function send(e){e.preventDefault(); if(!text.trim())return; await addDoc(paths.messages(),{title:title || 'Internal communication', text, channel, audience, status:'open', notes: [], authorId:user.uid, authorName:user.email,timestamp:serverTimestamp()}); setText(''); setTitle('');}
  return <><div className="admin-header"><div><h1>Communications</h1><p className="small">Internal notes, leader updates, communication plans, and follow-up history. Each communication can have its own note trail.</p></div><button className="btn btn-light" onClick={()=>setModal({type:'emailDraft', title:'Weekly Email Draft', data:{roster:roster[0], content}})}><Mail size={18}/>Generate weekly email</button></div>
    <form className="card" onSubmit={send} style={{marginBottom:20}}><div className="form-grid"><div className="form-row"><label className="label">Title</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Friday bulletin follow-up" /></div><div className="form-row"><label className="label">Channel</label><select className="select" value={channel} onChange={e=>setChannel(e.target.value)}><option value="internal">Internal note</option><option value="email">Email</option><option value="sms">SMS</option><option value="phone">Phone call</option><option value="whatsapp">WhatsApp</option></select></div><div className="form-row"><label className="label">Audience</label><select className="select" value={audience} onChange={e=>setAudience(e.target.value)}><option value="leaders">Leaders</option><option value="church">Whole church</option><option value="member">Individual member</option><option value="visitor">Visitor</option><option value="rostered_team">Rostered team</option></select></div></div><textarea className="textarea" value={text} onChange={e=>setText(e.target.value)} placeholder="Add communication note, decision, follow-up, or draft..."/><button className="btn btn-primary" style={{marginTop:10}}>Save Communication</button></form>
    <div className="message-list">{rows.slice().reverse().map(m=><div className="message-card" key={m.id}><div className="message-head"><div><strong>{m.title || 'Internal communication'}</strong><p className="small">{m.authorName} · {m.timestamp?.toDate ? m.timestamp.toDate().toLocaleString() : ''}</p></div><div className="actions"><span className="badge">{m.channel || 'internal'}</span><span className="badge">{m.audience || 'leaders'}</span><button className="btn btn-blue btn-sm" onClick={()=>setModal({type:'note', title:'Add Communication Note', data:{ target:'message', row:m }})}><NotebookPen size={14}/>Note</button></div></div><p>{m.text}</p>{!!m.notes?.length && <div className="note-stack">{m.notes.slice(-3).map((n,i)=><div className="note-item" key={i}><strong>{n.authorName || 'Note'}</strong><span>{formatNoteTime(n.createdAt)}</span><p>{n.text}</p></div>)}</div>}</div>)}</div>
  </>;
}

function AuditManager({ rows }) { return <><div className="admin-header"><div><h1>History</h1><p className="small">Audit trail of important edits, publishing, and roster changes.</p></div></div><DataTable rows={rows} columns={[{key:'timestamp',label:'Date',render:r=>r.timestamp?.toDate ? r.timestamp.toDate().toLocaleString() : ''},{key:'action',label:'Action'},{key:'details',label:'Details'},{key:'userEmail',label:'By'}]}/></>; }

function formatNoteTime(v){
  if (!v) return '';
  if (v.toDate) return v.toDate().toLocaleString();
  if (typeof v === 'string') return new Date(v).toLocaleString();
  return '';
}

function detailLine(label, value){ return <div className="detail-line"><span>{label}</span><strong>{value || '—'}</strong></div>; }

function MemberProfileModal({ member, close, setModal }) {
  return <Modal title="Member Profile" onClose={close} footer={<><button className="btn btn-blue" onClick={()=>setModal({type:'note', title:'Add Member Note', data:{ target:'member', row:member }})}><NotebookPen size={16}/>Add Note</button><button className="btn btn-light" onClick={()=>setModal({type:'member', title:'Edit Member', data:member})}>Edit</button><button className="btn btn-light" onClick={close}>Close</button></>}>
    <div className="profile-hero"><div className="avatar-circle">{(member.name||'?').slice(0,1).toUpperCase()}</div><div><h2>{member.name}</h2><p>{member.preferredName ? `Preferred name: ${member.preferredName}` : member.membershipStatus || 'member'}</p></div></div>
    <div className="profile-grid">
      <div className="profile-panel"><h3><PhoneCall size={16}/> Contact</h3>{detailLine('Email',member.email)}{detailLine('Phone',member.mobile || member.phone)}{detailLine('Address',member.address)}{detailLine('Preference',member.communicationPreference)}</div>
      <div className="profile-panel"><h3><Users size={16}/> Household</h3>{detailLine('Household',member.household)}{detailLine('Role',member.householdRole)}{detailLine('Emergency Contact',member.emergencyContact)}</div>
      <div className="profile-panel"><h3><HeartHandshake size={16}/> Care</h3>{detailLine('Care status',member.pastoralCareStatus)}{detailLine('Follow-up',member.followUpStatus)}{detailLine('Last contacted',member.lastContacted)}{detailLine('Accessibility',member.accessibilityNeeds)}</div>
      <div className="profile-panel"><h3><ClipboardList size={16}/> Ministry</h3>{detailLine('Ministries',member.ministries)}{detailLine('Preferred roles',member.preferredRoles)}{detailLine('Roster frequency',member.rosterFrequency)}{detailLine('Unavailable',member.unavailableDates)}</div>
      <div className="profile-panel"><h3><Tags size={16}/> Admin</h3>{detailLine('Membership status',member.membershipStatus)}{detailLine('Baptism date',member.baptismDate)}{detailLine('WWCC',member.wwccStatus)}{detailLine('Tags',member.tags)}</div>
      <div className="profile-panel"><h3><NotebookPen size={16}/> Notes</h3><p>{member.notes || 'No general notes.'}</p></div>
    </div>
    <h3>Internal Note Trail</h3>
    <div className="note-stack">{member.internalNotes?.length ? member.internalNotes.slice().reverse().map((n,i)=><div className="note-item" key={i}><strong>{n.authorName || 'Note'}</strong><span>{formatNoteTime(n.createdAt)}</span><p>{n.text}</p></div>) : <p className="small">No internal notes yet.</p>}</div>
  </Modal>;
}

function RequestDetailModal({ request, close, setModal }) {
  return <Modal title="Request Details" onClose={close} footer={<><button className="btn btn-blue" onClick={()=>setModal({type:'note', title:'Add Request Note', data:{ target:'request', row:request }})}><NotebookPen size={16}/>Add Note</button><button className="btn btn-light" onClick={close}>Close</button></>}>
    <div className="profile-grid">
      <div className="profile-panel"><h3>Requester</h3>{detailLine('Name',request.name || 'Anonymous')}{detailLine('Contact',request.contact)}{detailLine('Type',request.type)}{detailLine('Status',request.status || 'new')}</div>
      <div className="profile-panel"><h3>Follow-up</h3>{detailLine('Priority',request.priority || 'normal')}{detailLine('Assigned to',request.assignedTo)}{detailLine('Last contacted',request.lastContacted)}{detailLine('Created',request.timestamp?.toDate ? request.timestamp.toDate().toLocaleString() : '')}</div>
    </div>
    <h3>Request</h3><p className="request-body">{request.requestText || request.topics || 'No request text.'}</p>
    <h3>Notes</h3><div className="note-stack">{(request.notes || request.internalNotes)?.length ? (request.notes || request.internalNotes).slice().reverse().map((n,i)=><div className="note-item" key={i}><strong>{n.authorName || 'Note'}</strong><span>{formatNoteTime(n.createdAt)}</span><p>{n.text}</p></div>) : <p className="small">No notes yet.</p>}</div>
  </Modal>;
}

function NoteModal({ modal, close, user }) {
  const [text,setText]=useState('');
  const [visibility,setVisibility]=useState('internal');
  const target = modal.data.target;
  const row = modal.data.row;
  async function save(e){
    e.preventDefault();
    if(!text.trim()) return;
    const note = { text: text.trim(), visibility, authorId:user.uid, authorName:user.email, createdAt:new Date().toISOString() };
    const col = target === 'request' ? paths.requests() : target === 'message' ? paths.messages() : paths.members();
    const field = target === 'member' ? 'internalNotes' : 'notes';
    await setDoc(doc(col,row.id), { [field]: arrayUnion(note), updatedAt: serverTimestamp() }, { merge:true });
    await logAudit('Added note', `${target}: ${row.name || row.title || row.id}`, user);
    close();
  }
  return <Modal title={modal.title} onClose={close} footer={<><button className="btn btn-primary" form="note-form">Save Note</button><button className="btn btn-light" onClick={close}>Cancel</button></>}><form id="note-form" onSubmit={save}><div className="form-row"><label className="label">Note</label><textarea className="textarea" value={text} onChange={e=>setText(e.target.value)} placeholder="Add the follow-up, pastoral care note, communication update, or decision..." required /></div><div className="form-row"><label className="label">Visibility</label><select className="select" value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="internal">Internal leaders only</option><option value="pastoral">Pastoral care</option><option value="admin">Admin</option></select></div></form></Modal>;
}

function CrudModal({ modal, close, setModal, members, user }) {
  const [data,setData]=useState(modal.data || {}); const [error,setError]=useState('');
  const update=(k,v)=>setData(d=>({...d,[k]:v}));
  async function save(e){e.preventDefault(); setError(''); try {
    if(modal.type==='content'){ const payload={...data, updatedAt: serverTimestamp()}; delete payload.id; if(payload.type==='event'&&!payload.date) throw new Error('Event date is required.'); if(data.id) await setDoc(doc(paths.content(),data.id),payload,{merge:true}); else await addDoc(paths.content(),payload); await logAudit(data.id?'Updated content':'Created content', data.title, user); }
    if(modal.type==='member'){ const payload={...data, updatedAt: serverTimestamp()}; delete payload.id; if(data.id) await setDoc(doc(paths.members(),data.id),payload,{merge:true}); else await addDoc(paths.members(),payload); await logAudit(data.id?'Updated member':'Created member', data.name, user); }
    if(modal.type==='roster'){ const payload={...data, updatedAt: serverTimestamp()}; delete payload.id; if(data.id) await setDoc(doc(paths.roster(),data.id),payload,{merge:true}); else await addDoc(paths.roster(),payload); await logAudit(data.id?'Updated roster':'Created roster', data.date, user); }
    if(modal.type==='leader'){ const fn=httpsCallable(functions,'createUser'); await fn({appId,email:data.email,password:data.password,name:data.name,role:data.role}); await logAudit('Created leader', data.email, user); }
    if(modal.type==='leaderEdit'){ await updateDoc(doc(db,'users',data.id),{name:data.name,role:data.role}); await logAudit('Updated leader', data.email, user); }
    close();
  } catch(err){ setError(err.message); }}
  if(modal.type==='memberProfile') return <MemberProfileModal member={modal.data} close={close} setModal={setModal} />;
  if(modal.type==='requestDetail') return <RequestDetailModal request={modal.data} close={close} setModal={setModal} />;
  if(modal.type==='note') return <NoteModal modal={modal} close={close} user={user} />;
  if(modal.type==='templatePicker') return <TemplatePicker close={close} />;
  if(modal.type==='emailDraft') return <Modal title={modal.title} onClose={close} footer={<button className="btn btn-primary" onClick={close}>Done</button>}><WeeklyEmailCard roster={modal.data.roster} content={modal.data.content || []}/></Modal>;
  return <Modal title={modal.title} onClose={close} footer={<><button className="btn btn-light" onClick={close} type="button">Cancel</button><button className="btn btn-primary" form="crud-form">Save</button></>}><form id="crud-form" onSubmit={save}>{error&&<p className="error">{error}</p>}{modal.type==='content'&&<ContentForm data={data} update={update}/>} {modal.type==='member'&&<MemberForm data={data} update={update}/>} {modal.type==='roster'&&<RosterForm data={data} update={update} members={members}/>} {modal.type==='leader'&&<LeaderForm data={data} update={update} create/>} {modal.type==='leaderEdit'&&<LeaderForm data={data} update={update}/>}</form></Modal>;
}
function TemplatePicker({close}){ async function useTemplate(t){ await addDoc(paths.content(),{...blankContent,...t,status:'draft',createdAt:serverTimestamp()}); close(); } return <Modal title="Content Templates" onClose={close} footer={<button className="btn btn-light" onClick={close}>Close</button>}><div className="template-grid">{contentTemplates.map(t=><div className="template-card" key={t.title}><h3>{t.title}</h3><p>{t.description}</p><button className="btn btn-primary btn-sm" onClick={()=>useTemplate(t)}>Use Template</button></div>)}</div></Modal>; }
function ContentForm({data,update}){return <><div className="form-row"><label className="label">Title</label><input className="input" value={data.title||''} onChange={e=>update('title',e.target.value)} required/></div><div className="form-grid"><div className="form-row"><label className="label">Type</label><select className="select" value={data.type||'announcement'} onChange={e=>update('type',e.target.value)}><option value="announcement">Announcement</option><option value="notice">Notice</option><option value="event">Event</option></select></div><div className="form-row"><label className="label">Status</label><select className="select" value={data.status||'draft'} onChange={e=>update('status',e.target.value)}><option value="draft">Draft</option><option value="ready">Ready</option><option value="published">Published</option><option value="archived">Archived</option></select></div><div className="form-row"><label className="label">Priority</label><select className="select" value={data.priority||'normal'} onChange={e=>update('priority',e.target.value)}><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></div><div className="form-row"><label className="label">Repeat</label><select className="select" value={data.repeat||'one_week'} onChange={e=>update('repeat',e.target.value)}><option value="one_week">One week only</option><option value="until_date">Until archive date</option><option value="two_sabbaths">Two Sabbaths</option><option value="monthly">Monthly</option></select></div></div>{data.type==='event'?<div className="form-row"><label className="label">Event Date/Time</label><input className="input" type="datetime-local" value={data.date||''} onChange={e=>update('date',e.target.value)} /></div>:<div className="form-row"><label className="label">Archive On</label><input className="input" type="date" value={data.endDate||''} onChange={e=>update('endDate',e.target.value)} /></div>}<div className="form-row"><label className="label">Description</label><textarea className="textarea" value={data.description||''} onChange={e=>update('description',e.target.value)} /></div><div className="form-grid"><label><input type="checkbox" checked={data.includeOnWebsite!==false} onChange={e=>update('includeOnWebsite',e.target.checked)} /> Website</label><label><input type="checkbox" checked={data.includeInBulletin!==false} onChange={e=>update('includeInBulletin',e.target.checked)} /> Bulletin</label></div><div className="form-row"><label className="label">Optional Image URL</label><input className="input" value={data.imageUrl||''} onChange={e=>update('imageUrl',e.target.value)} placeholder="https://..." /></div></>}
function MemberForm({data,update}){return <>
  <h3>Personal Details</h3>
  <div className="form-grid"><div className="form-row"><label className="label">Full Name</label><input className="input" value={data.name||''} onChange={e=>update('name',e.target.value)} required/></div><div className="form-row"><label className="label">Preferred Name</label><input className="input" value={data.preferredName||''} onChange={e=>update('preferredName',e.target.value)}/></div><div className="form-row"><label className="label">Date of Birth</label><input className="input" type="date" value={data.dateOfBirth||''} onChange={e=>update('dateOfBirth',e.target.value)}/></div><div className="form-row"><label className="label">Membership Status</label><select className="select" value={data.membershipStatus||'member'} onChange={e=>update('membershipStatus',e.target.value)}><option value="member">Member</option><option value="regular_attender">Regular Attender</option><option value="visitor">Visitor</option><option value="transferred">Transferred</option><option value="inactive">Inactive</option></select></div></div>
  <h3>Contact & Household</h3>
  <div className="form-grid"><div className="form-row"><label className="label">Email</label><input className="input" type="email" value={data.email||''} onChange={e=>update('email',e.target.value)}/></div><div className="form-row"><label className="label">Mobile</label><input className="input" value={data.mobile||data.phone||''} onChange={e=>{update('mobile',e.target.value); update('phone',e.target.value)}}/></div><div className="form-row"><label className="label">Household</label><input className="input" value={data.household||''} onChange={e=>update('household',e.target.value)}/></div><div className="form-row"><label className="label">Household Role</label><select className="select" value={data.householdRole||''} onChange={e=>update('householdRole',e.target.value)}><option value="">Not set</option><option value="adult">Adult</option><option value="child">Child</option><option value="guardian">Guardian</option><option value="primary_contact">Primary Contact</option></select></div></div>
  <div className="form-row"><label className="label">Address</label><input className="input" value={data.address||''} onChange={e=>update('address',e.target.value)}/></div>
  <div className="form-grid"><div className="form-row"><label className="label">Emergency Contact</label><input className="input" value={data.emergencyContact||''} onChange={e=>update('emergencyContact',e.target.value)} placeholder="Name and phone"/></div><div className="form-row"><label className="label">Communication Preference</label><select className="select" value={data.communicationPreference||'email'} onChange={e=>update('communicationPreference',e.target.value)}><option value="email">Email</option><option value="sms">SMS</option><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option><option value="none">Do not contact</option></select></div></div>
  <h3>Ministry & Rostering</h3>
  <div className="form-grid"><div className="form-row"><label className="label">Ministries</label><input className="input" value={data.ministries||''} onChange={e=>update('ministries',e.target.value)} placeholder="Music, Sabbath School, Youth"/></div><div className="form-row"><label className="label">Preferred Roster Roles</label><input className="input" value={data.preferredRoles||''} onChange={e=>update('preferredRoles',e.target.value)} /></div><div className="form-row"><label className="label">Spiritual Gifts / Skills</label><input className="input" value={data.spiritualGifts||data.skills||''} onChange={e=>{update('spiritualGifts',e.target.value); update('skills',e.target.value)}} /></div><div className="form-row"><label className="label">Roster Frequency</label><input className="input" value={data.rosterFrequency||''} onChange={e=>update('rosterFrequency',e.target.value)} placeholder="Monthly, quarterly"/></div></div>
  <div className="form-row"><label className="label">Unavailable Dates</label><input className="input" value={data.unavailableDates||''} onChange={e=>update('unavailableDates',e.target.value)} /></div>
  <h3>Care, Safety & Consent</h3>
  <div className="form-grid"><div className="form-row"><label className="label">Pastoral Care Status</label><select className="select" value={data.pastoralCareStatus||'active'} onChange={e=>update('pastoralCareStatus',e.target.value)}><option value="active">Active</option><option value="needs_follow_up">Needs Follow-up</option><option value="new_family">New Family</option><option value="do_not_contact">Do Not Contact</option></select></div><div className="form-row"><label className="label">Follow-up Status</label><input className="input" value={data.followUpStatus||''} onChange={e=>update('followUpStatus',e.target.value)} /></div><div className="form-row"><label className="label">Last Contacted</label><input className="input" type="date" value={data.lastContacted||''} onChange={e=>update('lastContacted',e.target.value)} /></div><div className="form-row"><label className="label">WWCC / Safety Status</label><input className="input" value={data.wwccStatus||data.backgroundCheck||''} onChange={e=>{update('wwccStatus',e.target.value); update('backgroundCheck',e.target.value)}} /></div></div>
  <div className="form-grid"><div className="form-row"><label className="label">Dietary Needs</label><input className="input" value={data.dietaryNeeds||''} onChange={e=>update('dietaryNeeds',e.target.value)} /></div><div className="form-row"><label className="label">Accessibility Needs</label><input className="input" value={data.accessibilityNeeds||''} onChange={e=>update('accessibilityNeeds',e.target.value)} /></div></div>
  <div className="form-grid"><label><input type="checkbox" checked={!!data.consentPhoto} onChange={e=>update('consentPhoto',e.target.checked)} /> Photo consent</label><label><input type="checkbox" checked={!!data.consentDirectory} onChange={e=>update('consentDirectory',e.target.checked)} /> Directory consent</label></div>
  <div className="form-row"><label className="label">Tags</label><input className="input" value={data.tags||''} onChange={e=>update('tags',e.target.value)} placeholder="new, youth, music, needs-visit"/></div>
  <div className="form-row"><label className="label">General Notes</label><textarea className="textarea" value={data.notes||''} onChange={e=>update('notes',e.target.value)}/></div>
</>}
function selectMember(update, field, value, members){ const member=members.find(m=>m.id===value); update(field+'_id',value); update(field,member?.name||''); }
function RosterForm({data,update,members}){return <><div className="form-grid"><div className="form-row"><label className="label">Date</label><input className="input" type="date" value={data.date||''} onChange={e=>update('date',e.target.value)} required/></div><div className="form-row"><label className="label">Status</label><select className="select" value={data.status||'draft'} onChange={e=>update('status',e.target.value)}><option value="draft">Draft</option><option value="ready">Ready</option><option value="published">Published</option><option value="archived">Archived</option></select></div></div>{[['preacher','Preacher'],['elder','Elder'],['sabbathSchool','Sabbath School Leader'],['childrensStory',"Children's Story"],['songLeader','Song Leader']].map(([field,label])=><div className="form-row" key={field}><label className="label">{label}</label><select className="select" value={data[field+'_id']||''} onChange={e=>selectMember(update,field,e.target.value,members)}><option value="">Select member or type guest below</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><input className="input" style={{marginTop:8}} placeholder="Guest / manual name" value={data[field]||''} onChange={e=>update(field,e.target.value)}/></div>)}<h3>Bulletin Details</h3><div className="form-grid">{[['sabbathSchoolHymn','Sabbath School Hymn'],['sabbathSchoolLesson','Sabbath School Lesson'],['missionStatement','Mission Statement'],['offering','Offering'],['hymn1','Hymn 1'],['hymn2','Hymn 2'],['hymn3','Hymn 3'],['firstHymn','First Hymn'],['sermonTitle','Sermon Title'],['scripture','Scripture'],['theme','Theme'],['benediction','Benediction'],['scriptureVerse','Scripture Quote'],['scriptureReference','Scripture Reference'],['closingHymn','Closing Hymn'],['specialEvent','Special Event']].map(([field,label])=><div className="form-row" key={field}><label className="label">{label}</label><input className="input" value={data[field]||''} onChange={e=>{update(field,e.target.value); if(field==='hymn1') update('openingHymn',e.target.value)}} /></div>)}</div></>}
function LeaderForm({data,update,create}){return <><div className="form-row"><label className="label">Name</label><input className="input" value={data.name||''} onChange={e=>update('name',e.target.value)} required/></div>{create&&<><div className="form-row"><label className="label">Email</label><input className="input" type="email" value={data.email||''} onChange={e=>update('email',e.target.value)} required/></div><div className="form-row"><label className="label">Temporary Password</label><input className="input" type="password" value={data.password||''} onChange={e=>update('password',e.target.value)} required/></div></>}<div className="form-row"><label className="label">Role</label><select className="select" value={data.role||'leader'} onChange={e=>update('role',e.target.value)}>{roleOptions.map(r=><option key={r} value={r}>{roleLabels[r]}</option>)}</select></div></>}
function makeWeeklyEmail(roster, content=[]) { const announcements = content.filter(c=>c.type==='announcement').slice(0,5); const events = content.filter(c=>c.type==='event').slice(0,5); return `Dear Preston Church family,\n\nWe look forward to worshipping together this Sabbath${roster?.date ? `, ${niceDate(roster.date)}` : ''}.\n\nThis Sabbath\nSpeaker: ${roster?.preacher || 'TBA'}\nSermon: ${roster?.sermonTitle || roster?.preacherDetails?.sermonTitle || 'TBA'}\nSabbath School: ${roster?.sabbathSchool || 'TBA'}\nSong Leader: ${roster?.songLeader || 'TBA'}\n\nAnnouncements\n${announcements.length ? announcements.map(a=>`- ${a.title}: ${a.description || ''}`).join('\n') : '- No announcements listed.'}\n\nUpcoming Events\n${events.length ? events.map(e=>`- ${niceDate(e.date)}: ${e.title}`).join('\n') : '- No events listed.'}\n\nBlessings,\nPreston SDA Church`; }
