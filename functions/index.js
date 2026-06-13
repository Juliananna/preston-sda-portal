const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const mailgunTransport = require('nodemailer-mailgun-transport');

admin.initializeApp();
const db = admin.firestore();
const mailgunApiKey = defineSecret('MAILGUN_API_KEY');
const mailgunDomain = defineSecret('MAILGUN_DOMAIN');

async function requireSuperAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be logged in.');
  const snap = await db.collection('users').doc(request.auth.uid).get();
  if (!snap.exists || snap.data().role !== 'superAdmin') throw new HttpsError('permission-denied', 'Super Admin access required.');
  return snap.data();
}
async function requireLeader(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be logged in.');
  const snap = await db.collection('users').doc(request.auth.uid).get();
  if (!snap.exists) throw new HttpsError('permission-denied', 'Leader access required.');
  return snap.data();
}

exports.createUser = onCall(async (request) => {
  await requireSuperAdmin(request);
  const { email, password, name, role } = request.data || {};
  if (!email || !password || !name || !role) throw new HttpsError('invalid-argument', 'Missing email, password, name, or role.');
  try {
    const record = await admin.auth().createUser({ email, password, displayName: name });
    await db.collection('users').doc(record.uid).set({ email, name, role, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { uid: record.uid, result: `Created ${email}` };
  } catch (error) {
    console.error('createUser failed:', error);
    throw new HttpsError('internal', error.message);
  }
});

exports.deleteUser = onCall(async (request) => {
  await requireSuperAdmin(request);
  const { uid } = request.data || {};
  if (!uid) throw new HttpsError('invalid-argument', 'Missing uid.');
  if (uid === request.auth.uid) throw new HttpsError('permission-denied', 'You cannot delete yourself.');
  try {
    await admin.auth().deleteUser(uid);
    await db.collection('users').doc(uid).delete();
    return { result: 'Deleted user.' };
  } catch (error) {
    console.error('deleteUser failed:', error);
    throw new HttpsError('internal', error.message);
  }
});

exports.createPreacherLink = onCall(async (request) => {
  await requireLeader(request);
  const { rosterId, appId } = request.data || {};
  if (!rosterId || !appId) throw new HttpsError('invalid-argument', 'Missing rosterId or appId.');
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 21));
  await db.doc(`artifacts/${appId}/public/data/preacherLinks/${token}`).set({ rosterId, appId, createdBy: request.auth.uid, createdAt: admin.firestore.FieldValue.serverTimestamp(), expiresAt, used: false });
  return { token };
});

exports.submitPreacherDetails = onCall(async (request) => {
  const { token, sermonTitle, scripture, theme, summary, notes, mediaNotes } = request.data || {};
  if (!token) throw new HttpsError('invalid-argument', 'Missing token.');
  const linkQuery = await db.collectionGroup('preacherLinks').where(admin.firestore.FieldPath.documentId(), '==', token).limit(1).get();
  if (linkQuery.empty) throw new HttpsError('permission-denied', 'Invalid preacher link.');
  const linkDoc = linkQuery.docs[0];
  const link = linkDoc.data();
  if (link.expiresAt && link.expiresAt.toDate() < new Date()) throw new HttpsError('permission-denied', 'This link has expired.');
  await db.doc(`artifacts/${link.appId}/public/data/roster/${link.rosterId}`).set({
    sermonTitle: sermonTitle || '',
    preacherDetails: { sermonTitle: sermonTitle || '', scripture: scripture || '', theme: theme || '', summary: summary || '', notes: notes || '', mediaNotes: mediaNotes || '', submittedAt: admin.firestore.FieldValue.serverTimestamp() }
  }, { merge: true });
  await linkDoc.ref.set({ used: true, usedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { result: 'Submitted.' };
});

exports.onRosterChange = onDocumentWritten({ document: 'artifacts/{appId}/public/data/roster/{rosterId}', secrets: [mailgunApiKey, mailgunDomain] }, async (event) => {
  const before = event.data.before.exists ? event.data.before.data() : null;
  const after = event.data.after.exists ? event.data.after.data() : null;
  if (!after) return;
  const roles = ['preacher', 'elder', 'sabbathSchool', 'childrensStory', 'songLeader'];
  const changed = roles.filter(role => after[`${role}_id`] && (!before || before[`${role}_id`] !== after[`${role}_id`])).map(role => ({ role, memberId: after[`${role}_id`] }));
  if (!changed.length) return;
  const domain = mailgunDomain.value();
  const apiKey = mailgunApiKey.value();
  if (!domain || !apiKey) return console.log('Mailgun secrets not configured; skipping roster email.');
  const mailTransport = nodemailer.createTransport(mailgunTransport({ auth: { api_key: apiKey, domain } }));
  await Promise.all(changed.map(async (assignment) => {
    const member = await db.doc(`artifacts/${event.params.appId}/public/data/members/${assignment.memberId}`).get();
    if (!member.exists || !member.data().email) return;
    const roleName = assignment.role.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    await mailTransport.sendMail({ from: `Preston SDA Roster <postmaster@${domain}>`, to: member.data().email, subject: `Roster Update for ${after.date}`, html: `<p>Hi ${member.data().name},</p><p>You have been assigned: <strong>${roleName}</strong> for <strong>${after.date}</strong>.</p><p>Thank you.</p>` });
  }));
});

exports.sendRosterReminders = onSchedule({ schedule: 'every day 09:00', timeZone: 'Australia/Melbourne', secrets: [mailgunApiKey, mailgunDomain] }, async () => {
  console.log('Roster reminder placeholder. Add reminder logic when ready.');
});
