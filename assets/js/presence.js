import { auth } from './firebase-config.js';
import {
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const db = getFirestore();

let currentUser = null;
let heartbeat = null;

async function setPresence(user) {
  if (!user || user.isAnonymous) return;
  const ref = doc(db, 'presence', user.uid);
  await setDoc(ref, {
    uid: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || 'Member',
    photoURL: user.photoURL || '',
    online: true,
    lastSeen: serverTimestamp()
  }, { merge: true });
}

onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }

  if (!user || user.isAnonymous) return;

  try {
    await setPresence(user);
  } catch (e) {
    console.warn('[TUBAL HUB presence] initial update failed:', e);
  }

  heartbeat = setInterval(() => {
    if (currentUser) {
      setPresence(currentUser).catch(e =>
        console.warn('[TUBAL HUB presence] heartbeat failed:', e)
      );
    }
  }, 20000);
});

document.addEventListener('visibilitychange', () => {
  if (!currentUser || currentUser.isAnonymous) return;

  if (!document.hidden) {
    setPresence(currentUser).catch(() => {});
  }
});

window.addEventListener('focus', () => {
  if (currentUser && !currentUser.isAnonymous) {
    setPresence(currentUser).catch(() => {});
  }
});

