(() => {
  "use strict";

  // Single admin session contract for the entire Admin Console.
  const SESSION_KEY = "kb_admin_session";
  const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

  let firebase = null;
  let auth = null;
  let db = null;
  let initPromise = null;

  function clearLegacySessions() {
    try {
      // Legacy Firebase/local admin keys can be removed during Firebase init.
      // Demo Mode is a separate session contract and must never be cleared here.
      localStorage.removeItem("kb_admin");
      localStorage.removeItem("kb_admin_firebase");
    } catch {}
  }

  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      clearLegacySessions();

      const configModule = await import("./firebase-config.js");
      if (!configModule.isFirebaseConfigured) {
        const error = new Error("Firebase is not configured. Add the Firebase Web App config in js/firebase-config.js.");
        error.code = "FIREBASE_NOT_CONFIGURED";
        throw error;
      }

      const [appMod, authMod, firestoreMod] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js")
      ]);

      firebase = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(configModule.firebaseConfig);
      auth = authMod.getAuth(firebase);
      db = firestoreMod.getFirestore(firebase);

      // Admin login is session-only on the web. Firebase documents that
      // browserSessionPersistence is cleared when the authenticated tab closes.
      if (auth.currentUser) {
        await authMod.setPersistence(auth, authMod.browserSessionPersistence);
      }

      return { firebase, auth, db, authMod, firestoreMod };
    })();
    return initPromise;
  }

  function withTimeout(promise, ms, message) {
    let timer = null;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(message);
          error.code = "AUTH_TIMEOUT";
          reject(error);
        }, ms);
      })
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.uid || !data?.expiresAt || Date.now() >= Number(data.expiresAt)) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return data;
    } catch {
      try { sessionStorage.removeItem(SESSION_KEY); } catch {}
      return null;
    }
  }

  function rememberAdmin(admin) {
    try {
      if (!admin) sessionStorage.removeItem(SESSION_KEY);
      else sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        uid: admin.uid,
        email: admin.email || "",
        role: admin.role || "admin",
        signedInAt: new Date().toISOString(),
        expiresAt: Date.now() + SESSION_TTL_MS
      }));
    } catch {}
  }

  async function currentUser() {
    const { auth: currentAuth, authMod } = await init();
    if (currentAuth.currentUser) return currentAuth.currentUser;

    return withTimeout(
      new Promise(resolve => {
        let settled = false;
        let unsubscribe = () => {};
        unsubscribe = authMod.onAuthStateChanged(currentAuth, user => {
          if (settled) return;
          settled = true;
          unsubscribe();
          resolve(user || null);
        });
      }),
      8000,
      "Firebase Authentication timed out. Check Authorized Domains and Firebase configuration."
    );
  }

  async function verifyAdmin(user) {
    if (!user) return null;
    const session = readSession();
    if (!session || session.uid !== user.uid) return null;

    const { db: currentDb, firestoreMod } = await init();
    const snap = await withTimeout(
      firestoreMod.getDoc(firestoreMod.doc(currentDb, "admins", user.uid)),
      8000,
      "Firebase admin verification timed out. Check Firestore rules and network access."
    );
    if (!snap.exists() || snap.data()?.active !== true) return null;

    return { uid: user.uid, email: user.email || "", ...snap.data() };
  }

  async function signInWithEmailPassword(email, password) {
    const { auth: currentAuth, authMod } = await init();
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) throw new Error("Enter your admin email.");
    if (!password) throw new Error("Enter your admin password.");

    try {
      await authMod.setPersistence(currentAuth, authMod.browserSessionPersistence);
      const signIn = authMod && authMod.signInWithEmailAndPassword;
      if (typeof signIn !== "function") {
        throw new Error("Firebase Auth sign-in module failed to load. Please refresh the page.");
      }
      const credential = await signIn(currentAuth, normalized, password);

      // Existing active admin records do not need a bootstrap call on every login.
      // Verify the authenticated UID first. Bootstrap is only needed for first-time
      // admin activation when the UID has no active /admins/{uid} record yet.
      let admin = await verifyAdminWithoutSession(credential.user);

      if (!admin) {
        try {
          const backendModule = await import("./firebase-backend.js");
          await backendModule.bootstrapAdminFromEmail();
          admin = await verifyAdminWithoutSession(credential.user);
        } catch (bootstrapError) {
          await authMod.signOut(currentAuth);
          const code = bootstrapError?.code ? ` [${bootstrapError.code}]` : "";
          throw new Error(
            (bootstrapError?.message || "Admin identity bootstrap failed.") + code
          );
        }
      }

      if (!admin) {
        await authMod.signOut(currentAuth);
        throw new Error("This Firebase email account is authenticated, but its UID is not an active Kapeng Barako admin. Create/activate the matching /admins/{uid} record for the authorized admin account.");
      }

      rememberAdmin(admin);
      return admin;
    } catch (error) {
      if (error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password") {
        throw new Error("Incorrect email or password.");
      }
      if (error?.code === "auth/user-not-found")
        throw new Error("No Firebase account exists for this email.");
      if (error?.code === "auth/operation-not-allowed")
        throw new Error("Email/Password sign-in is not enabled in Firebase Authentication.");
      if (error?.code === "auth/internal-error")
        throw new Error("Firebase returned an internal authentication error. Check that this email has an Email/Password credential in Firebase Authentication.");
      throw error;
    }
  }

  async function setupAdminEmailPassword(password) {
    const { auth: currentAuth, authMod } = await init();
    const normalizedPassword = String(password || "");
    if (normalizedPassword.length < 6 || normalizedPassword.length > 128) {
      throw new Error("Admin password must be 6 to 128 characters.");
    }

    try {
      await authMod.setPersistence(currentAuth, authMod.browserSessionPersistence);

      const provider = new authMod.GoogleAuthProvider();
      const credential = await authMod.signInWithPopup(currentAuth, provider);
      const googleEmail = String(credential.user?.email || "").trim().toLowerCase();

      const backendModule = await import("./firebase-backend.js");
      await backendModule.setAdminPasswordFromGoogle(normalizedPassword);

      await authMod.signOut(currentAuth);

      const signIn = authMod.signInWithEmailAndPassword;
      if (typeof signIn !== "function") {
        throw new Error("Firebase Auth sign-in module failed to load. Please refresh the page.");
      }

      const emailCredential = await signIn(currentAuth, googleEmail, normalizedPassword);
      const admin = await verifyAdminWithoutSession(emailCredential.user);

      if (!admin) {
        await authMod.signOut(currentAuth);
        throw new Error("Admin password was created, but the admin record could not be verified.");
      }

      rememberAdmin(admin);
      return admin;
    } catch (error) {
      try { await authMod.signOut(currentAuth); } catch {}
      throw error;
    }
  }

  async function sendAdminEmailLink(email) {
    const { auth: currentAuth, authMod } = await init();
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) throw new Error("Enter your admin email.");

    try {
      const actionCodeSettings = {
        url: new URL("./login.html", window.location.href).href,
        handleCodeInApp: true
      };
      await authMod.setPersistence(currentAuth, authMod.browserSessionPersistence);
      await authMod.sendSignInLinkToEmail(currentAuth, normalized, actionCodeSettings);
      localStorage.setItem("kb_admin_email_for_signin", normalized);
      return { email: normalized };
    } catch (error) {
      if (error?.code === "auth/unauthorized-continue-uri")
        throw new Error("This Admin Login URL is not authorized in Firebase Authentication.");
      if (error?.code === "auth/operation-not-allowed")
        throw new Error("Email link sign-in is not enabled yet. Enable Email link in Firebase Authentication → Sign-in method.");
      if (error?.code === "auth/unauthorized-domain")
        throw new Error("Add tubalrr.github.io to Firebase Authentication → Authorized domains.");
      if (error?.code === "auth/quota-exceeded")
        throw new Error("Firebase email-link quota has been reached. No sign-in email was sent. Wait for the quota to reset or add a billing instrument to the Firebase project to increase the email-link limit.");
      throw error;
    }
  }

  async function completeAdminEmailLink() {
    const { auth: currentAuth, authMod } = await init();
    if (!authMod.isSignInWithEmailLink(currentAuth, window.location.href)) return null;

    let email = "";
    try { email = localStorage.getItem("kb_admin_email_for_signin") || ""; } catch {}
    if (!email) email = window.prompt("Confirm your admin email address:");
    email = String(email || "").trim().toLowerCase();
    if (!email) throw new Error("Admin email confirmation is required.");

    const credential = await authMod.signInWithEmailLink(currentAuth, email, window.location.href);
    try { localStorage.removeItem("kb_admin_email_for_signin"); } catch {}

    // Prefer the existing active UID record. Only first-time activation needs
    // the trusted backend bootstrap step.
    let admin = await verifyAdminWithoutSession(credential.user);

    if (!admin) {
      try {
        const backendModule = await import("./firebase-backend.js");
        await backendModule.bootstrapAdminFromEmail();
        admin = await verifyAdminWithoutSession(credential.user);
      } catch (error) {
        await authMod.signOut(currentAuth);
        throw new Error(error?.message || "Admin identity verification failed.");
      }
    }

    if (!admin) {
      await authMod.signOut(currentAuth);
      throw new Error("This email is not an active Kapeng Barako admin account.");
    }

    rememberAdmin(admin);
    return admin;
  }

  async function verifyAdminWithoutSession(user) {
    if (!user) return null;
    const { db: currentDb, firestoreMod } = await init();
    const snap = await firestoreMod.getDoc(
      firestoreMod.doc(currentDb, "admins", user.uid)
    );
    if (!snap.exists() || snap.data()?.active !== true) return null;
    return { uid: user.uid, email: user.email || "", ...snap.data() };
  }

  async function restore() {
    // No local admin session means there is nothing to restore.
    // Redirect immediately instead of waiting on Firebase Auth initialization.
    const session = readSession();
    if (!session) {
      return null;
    }

    const user = await currentUser();

    if (!user || session.uid !== user.uid) {
      rememberAdmin(null);
      try {
        const { auth: currentAuth, authMod } = await init();
        await authMod.signOut(currentAuth);
      } catch {}
      const error = new Error("Your Admin session could not be verified. Please sign in again.");
      error.code = "ADMIN_SESSION_INVALID";
      throw error;
    }

    const admin = await verifyAdmin(user);
    if (!admin) {
      const { auth: currentAuth, authMod } = await init();
      await authMod.signOut(currentAuth);
      rememberAdmin(null);
      const error = new Error("Firebase authenticated this account, but it is not an active Kapeng Barako admin.");
      error.code = "ADMIN_NOT_AUTHORIZED";
      throw error;
    }

    return admin;
  }

  async function requireAdmin() {
    try {
      return await restore();
    } catch (error) {
      rememberAdmin(null);
      throw error;
    }
  }

  async function logout() {
    try {
      const { auth: currentAuth, authMod } = await init();
      await authMod.signOut(currentAuth);
    } finally {
      rememberAdmin(null);
    }
  }

  window.KBAdminAuth = {
    SESSION_KEY,
    SESSION_TTL_MS,
    init,
    signInWithEmailPassword,
    setupAdminEmailPassword,
    sendAdminEmailLink,
    completeAdminEmailLink,
    restore,
    requireAdmin,
    logout,
    verifyAdmin
  };
})();