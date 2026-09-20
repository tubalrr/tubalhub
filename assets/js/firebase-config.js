import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBBfE3xfu4BRz7Jwd4GoscJ_jW_x-GXjUk",
  authDomain: "tubalhub.firebaseapp.com",
  projectId: "tubalhub",
  storageBucket: "tubalhub.firebasestorage.app",
  messagingSenderId: "741686139338",
  appId: "1:741686139338:web:dc80d9c37a9e8b4da79733"
};

const app = initializeApp(firebaseConfig);

// Keep Firebase Auth lightweight during startup.
// The popup/redirect resolver is loaded only when Google sign-in is actually used.
const auth = initializeAuth(app, {
  persistence: [
    indexedDBLocalPersistence,
    browserLocalPersistence
  ]
});

export { app, auth };
