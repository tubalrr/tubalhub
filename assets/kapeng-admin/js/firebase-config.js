// Firebase client configuration for buyer-owned Customer Accounts.
// IMPORTANT: This template intentionally ships with placeholders.
// The buyer must create their own Firebase project and replace every value below.
// Do not put Firebase Admin SDK/service-account credentials in this file.

export const firebaseConfig = {
  apiKey: "REPLACE_WITH_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_FIREBASE_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_FIREBASE_PROJECT_ID",
  storageBucket: "REPLACE_WITH_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_FIREBASE_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_FIREBASE_APP_ID"
};

export const isFirebaseConfigured =
  Object.values(firebaseConfig).every(v => v && !String(v).startsWith("REPLACE_WITH_"));
