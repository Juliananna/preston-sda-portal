import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

export const firebaseConfig = {
  apiKey: 'AIzaSyAyBOHP-BIH3q51d7OQl9t3Z2tKWfHWo6w',
  authDomain: 'prestonsda-5ef63.firebaseapp.com',
  projectId: 'prestonsda-5ef63',
  storageBucket: 'prestonsda-5ef63.appspot.com',
  messagingSenderId: '694587444565',
  appId: '1:694587444565:web:ed1227c7d3f066ef5af3dc',
  measurementId: 'G-R02T9HKRG3'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const appId = firebaseConfig.projectId;

export const paths = {
  content: () => collection(db, `artifacts/${appId}/public/data/content`),
  roster: () => collection(db, `artifacts/${appId}/public/data/roster`),
  members: () => collection(db, `artifacts/${appId}/public/data/members`),
  households: () => collection(db, `artifacts/${appId}/public/data/households`),
  requests: () => collection(db, `artifacts/${appId}/public/data/requests`),
  messages: () => collection(db, `artifacts/${appId}/public/data/messages`),
  audit: () => collection(db, `artifacts/${appId}/public/data/audit`),
  templates: () => collection(db, `artifacts/${appId}/public/data/templates`)
};
