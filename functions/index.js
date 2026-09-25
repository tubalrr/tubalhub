
const { logger } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const BANNED_WORDS_REAL = [
  "fuck", "fucking", "shit", "bitch", "asshole", "bastard", "damn",
  "puta", "putangina", "putang ina", "gago", "tanga", "bobo", "ulol",
  "tarantado", "leche", "bwisit", "buwisit", "hayop", "hinayupak",
  "pakyu", "p*tangina", "p*tang ina", "g*go", "t*nga", "b*bo",
  "bw3sit", "bwesit"
];

const BANNED_PATTERNS_REAL = [
  /p[\\s._*\\-]*[u@][\\s._*\\-]*t[\\s._*\\-]*[a@][\\s._*\\-]*ng[\\s._*\\-]*[i1][\\s._*\\-]*n[\\s._*\\-]*a/i,
  /g[\\s._*\\-]*[a@][\\s._*\\-]*g[\\s._*\\-]*o/i,
  /b[\\s._*\\-]*[o0][\\s._*\\-]*b[\\s._*\\-]*o/i,
  /t[\\s._*\\-]*[a@][\\s._*\\-]*ng[\\s._*\\-]*[a@]/i,
  /f[\\s._*\\-]*u[\\s._*\\-]*c[\\s._*\\-]*k/i,
  /s[\\s._*\\-]*h[\\s._*\\-]*i[\\s._*\\-]*t/i
];

function normalizeReal(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[$5]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[._*\\-]+/g, "")
    .replace(/\\s+/g, " ")
    .trim();
}

function escapedWordPattern(word) {
  const escaped = String(word).replace(/[.*+?^$()|[\\]\\\\]/g, "\\\\function escapedWordPattern(word) {
  const escaped = String(word).replace(/[.*+?^$()|[\\]\\\\]/g, "\\\\$&");
  return new RegExp("(?<![a-z0-9])" + escaped.replace(/\\\\s+/g, "\\\\\\\\s*") + "(?![a-z0-9])", "i");
}");
  return new RegExp("(?<![a-z0-9])" + escaped.replace(/\\s+/g, "\\\\s*") + "(?![a-z0-9])", "i");
}

function moderateServerReal(text) {
  const raw = String(text || "").trim();
  if (!raw) return { allowed: false, flagged: false, reason: "empty", cleanText: "" };

  let clean = raw;
  const found = new Set();
  const normalized = normalizeReal(raw);

  for (const word of BANNED_WORDS_REAL) {
    const pattern = escapedWordPattern(word);
    if (pattern.test(raw) || pattern.test(normalized)) {
      found.add(word);
      clean = clean.replace(pattern, "***");
    }
  }

  for (const pattern of BANNED_PATTERNS_REAL) {
    if (pattern.test(raw)) {
      found.add(pattern.source);
      clean = clean.replace(pattern, "***");
    }
  }

  const reasons = Array.from(found);
  if (reasons.length >= 3) {
    return { allowed: false, flagged: true, reason: reasons.join(","), cleanText: clean };
  }
  if (reasons.length > 0) {
    return { allowed: true, flagged: true, reason: reasons.join(","), cleanText: clean };
  }
  return { allowed: true, flagged: false, reason: "", cleanText: raw };
}

function requireRealUser(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "Login muna.");
  }
  if (request.auth.token && request.auth.token.firebase &&
      request.auth.token.firebase.sign_in_provider === "anonymous") {
    throw new HttpsError("unauthenticated", "Anonymous login is not allowed.");
  }
}

function displayNameFromRequest(request) {
  return (request.auth.token && request.auth.token.name) ||
    (request.auth.token && request.auth.token.email ? request.auth.token.email.split("@")[0] : "") ||
    "Member";
}

function channelToFirestoreReal(value) {
  const map = {
    general: "global-chat",
    "payapang-isip": "payapang-isip",
    payapang: "payapang-isip",
    ctrlzone: "ctrlzone",
    "shop-talk": "shop-talk",
    shop: "shop-talk",
    announcements: "announcements"
  };
  return map[String(value || "")] || null;
}

async function enforceRateLimitReal(uid) {
  const ref = db.collection("rateLimits").doc(uid);
  const now = Date.now();

  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const last = snap.exists ? Number(snap.data().lastMessageAtMs || 0) : 0;

    if (last && now - last < 2000) {
      throw new HttpsError("resource-exhausted", "Please wait a moment before sending another message.");
    }

    tx.set(ref, {
      uid,
      lastMessageAtMs: now,
      lastMessageAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

async function writeModerationLogReal(data) {
  await db.collection("moderationLogs").add(Object.assign({}, data, {
    createdAt: FieldValue.serverTimestamp(),
    isReal: true
  }));
}

async function recordStrikeReal(uid, reason, channel, messageId) {
  if (!uid) return;

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const current = Number((userSnap.data() && userSnap.data().strikesReal) || 0);
  const strikes = current + 1;

  const patch = {
    strikesReal: strikes,
    lastStrikeAt: FieldValue.serverTimestamp(),
    lastModerationReasonReal: reason || "",
    lastModerationMessageIdReal: messageId || ""
  };

  if (strikes >= 3) {
    patch.chatStatus = "banned";
    patch.banUntil = new Date(Date.now() + 10 * 60 * 1000);
    patch.banReason = "Repeated offensive language detected by server moderation.";
    patch.moderatedBy = "server";
    patch.moderatedAt = FieldValue.serverTimestamp();
  }

  await userRef.set(patch, { merge: true });

  if (strikes >= 3) {
    await writeModerationLogReal({
      typeReal: "auto_ban_10m",
      uid,
      strikesReal: strikes,
      channel: channel || "",
      messageId: messageId || "",
      reasonReal: reason || ""
    });
  }
}

exports.moderateGlobalChatReal = onDocumentCreated("globalChats/{msgId}", async event => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data() || {};
  if (data.verifiedReal === true && data.moderatedBy === "server") return;

  const text = String(data.text || data.textReal || "").trim();
  if (!text) return;

  const result = moderateServerReal(text);

  if (!result.allowed) {
    await snap.ref.delete();

    await writeModerationLogReal({
      typeReal: "blocked",
      originalTextReal: text,
      reasonReal: result.reason,
      uid: data.uid || "",
      channel: data.channel || "",
      messageId: snap.id
    });

    await recordStrikeReal(data.uid, result.reason, data.channel, snap.id);
    return;
  }

  if (result.flagged) {
    await snap.ref.update({
      text: result.cleanText,
      textReal: result.cleanText,
      moderatedReal: true,
      flaggedReal: true,
      moderationReasonReal: result.reason,
      moderatedAt: FieldValue.serverTimestamp(),
      moderatedBy: "server"
    });

    await writeModerationLogReal({
      typeReal: "flagged",
      originalTextReal: text,
      cleanTextReal: result.cleanText,
      reasonReal: result.reason,
      uid: data.uid || "",
      channel: data.channel || "",
      messageId: snap.id
    });
  } else {
    await snap.ref.update({
      verifiedReal: true,
      verifiedAt: FieldValue.serverTimestamp(),
      moderatedBy: "server"
    });
  }
});

exports.moderateGlobalChatReplyReal = onDocumentCreated("globalChatReplies/{replyId}", async event => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data() || {};
  if (data.verifiedReal === true && data.moderatedBy === "server") return;

  const text = String(data.text || data.textReal || "").trim();
  if (!text) {
    await snap.ref.delete();
    return;
  }

  const result = moderateServerReal(text);

  if (!result.allowed) {
    await snap.ref.delete();

    await writeModerationLogReal({
      typeReal: "reply_blocked",
      originalTextReal: text,
      reasonReal: result.reason,
      uid: data.uid || "",
      messageId: data.messageId || "",
      replyId: snap.id
    });

    await recordStrikeReal(data.uid, result.reason, "reply", snap.id);
    return;
  }

  if (result.flagged) {
    await snap.ref.update({
      text: result.cleanText,
      textReal: result.cleanText,
      moderatedReal: true,
      flaggedReal: true,
      moderationReasonReal: result.reason,
      moderatedAt: FieldValue.serverTimestamp(),
      moderatedBy: "server"
    });

    await writeModerationLogReal({
      typeReal: "reply_flagged",
      originalTextReal: text,
      cleanTextReal: result.cleanText,
      reasonReal: result.reason,
      uid: data.uid || "",
      messageId: data.messageId || "",
      replyId: snap.id
    });
  } else {
    await snap.ref.update({
      verifiedReal: true,
      verifiedAt: FieldValue.serverTimestamp(),
      moderatedBy: "server"
    });
  }
});

exports.moderatePrivateChatReal = onDocumentCreated("messages/{messageId}", async event => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data() || {};
  if (data.verifiedReal === true && data.moderatedBy === "server") return;

  const text = String(data.text || data.textReal || "").trim();
  if (!text) {
    if (data.type === "text") await snap.ref.delete();
    return;
  }

  const result = moderateServerReal(text);

  if (!result.allowed) {
    await snap.ref.delete();

    await writeModerationLogReal({
      typeReal: "private_blocked",
      originalTextReal: text,
      reasonReal: result.reason,
      fromUid: data.senderId || data.uid || "",
      toUid: data.receiverId || "",
      messageId: snap.id
    });

    await recordStrikeReal(data.senderId || data.uid, result.reason, "private", snap.id);
    return;
  }

  if (result.flagged) {
    await snap.ref.update({
      text: result.cleanText,
      textReal: result.cleanText,
      moderatedReal: true,
      flaggedReal: true,
      moderationReasonReal: result.reason,
      moderatedAt: FieldValue.serverTimestamp(),
      moderatedBy: "server"
    });
  } else {
    await snap.ref.update({
      verifiedReal: true,
      verifiedAt: FieldValue.serverTimestamp(),
      moderatedBy: "server"
    });
  }
});

exports.sendMessageReal = onCall(async request => {
  requireRealUser(request);

  const textReal = String((request.data && (request.data.text || request.data.textReal)) || "").trim();
  const channel = channelToFirestoreReal(request.data && request.data.channel);

  if (!textReal || textReal.length > 500) {
    throw new HttpsError("invalid-argument", "Text must be 1-500 characters.");
  }

  if (!channel) {
    throw new HttpsError("invalid-argument", "Invalid channel.");
  }

  const moderation = moderateServerReal(textReal);
  if (!moderation.allowed) {
    await writeModerationLogReal({
      typeReal: "callable_blocked",
      originalTextReal: textReal,
      reasonReal: moderation.reason,
      uid: request.auth.uid,
      channel
    });
    await recordStrikeReal(request.auth.uid, moderation.reason, channel, "");
    throw new HttpsError("invalid-argument", "Offensive language is not allowed.");
  }

  await enforceRateLimitReal(request.auth.uid);

  const name = displayNameFromRequest(request);
  const token = request.auth.token || {};
  const docData = {
    uid: request.auth.uid,
    displayName: name,
    name: name,
    email: token.email || "",
    photoURL: token.picture || "",
    createdAt: FieldValue.serverTimestamp(),
    text: moderation.cleanText,
    textReal: moderation.cleanText,
    type: "text",
    channel,
    moderatedReal: !!moderation.flagged,
    flaggedReal: !!moderation.flagged,
    verifiedReal: true,
    moderatedBy: "server"
  };

  const replyTo = request.data && request.data.replyTo;
  if (replyTo && typeof replyTo === "object" && typeof replyTo.name === "string") {
    docData.replyTo = {
      name: replyTo.name.slice(0, 120),
      preview: String(replyTo.preview || "").slice(0, 160)
    };
  }

  const ref = await db.collection("globalChats").add(docData);

  if (moderation.flagged) {
    await writeModerationLogReal({
      typeReal: "callable_flagged",
      originalTextReal: textReal,
      cleanTextReal: moderation.cleanText,
      reasonReal: moderation.reason,
      uid: request.auth.uid,
      channel,
      messageId: ref.id
    });
  }

  return {
    success: true,
    id: ref.id,
    moderated: !!moderation.flagged,
    cleanText: moderation.cleanText
  };
});

exports.sendReplyReal = onCall(async request => {
  requireRealUser(request);

  const textReal = String((request.data && (request.data.text || request.data.textReal)) || "").trim();
  const messageId = String((request.data && request.data.messageId) || "");
  const parentReplyId = request.data && request.data.parentReplyId ? String(request.data.parentReplyId) : null;

  if (!messageId || !textReal || textReal.length > 500) {
    throw new HttpsError("invalid-argument", "Reply and messageId are required. Text must be 1-500 characters.");
  }

  const parentMessage = await db.collection("globalChats").doc(messageId).get();
  if (!parentMessage.exists) {
    throw new HttpsError("not-found", "Original message not found.");
  }

  const moderation = moderateServerReal(textReal);
  if (!moderation.allowed) {
    await writeModerationLogReal({
      typeReal: "reply_callable_blocked",
      originalTextReal: textReal,
      reasonReal: moderation.reason,
      uid: request.auth.uid,
      messageId
    });
    await recordStrikeReal(request.auth.uid, moderation.reason, "reply", messageId);
    throw new HttpsError("invalid-argument", "Offensive language is not allowed.");
  }

  await enforceRateLimitReal(request.auth.uid);

  const ref = await db.collection("globalChatReplies").add({
    messageId,
    parentReplyId,
    uid: request.auth.uid,
    displayName: displayNameFromRequest(request),
    email: (request.auth.token && request.auth.token.email) || "",
    text: moderation.cleanText,
    textReal: moderation.cleanText,
    createdAt: FieldValue.serverTimestamp(),
    moderatedReal: !!moderation.flagged,
    flaggedReal: !!moderation.flagged,
    verifiedReal: true,
    moderatedBy: "server"
  });

  return {
    success: true,
    id: ref.id,
    moderated: !!moderation.flagged,
    cleanText: moderation.cleanText
  };
});

exports.sendPrivateMessageReal = onCall(async request => {
  requireRealUser(request);

  const textReal = String((request.data && (request.data.text || request.data.textReal)) || "").trim();
  const receiverId = String((request.data && request.data.receiverId) || "");

  if (!textReal || textReal.length > 500 || !receiverId || receiverId === request.auth.uid) {
    throw new HttpsError("invalid-argument", "Invalid private message.");
  }

  const moderation = moderateServerReal(textReal);
  if (!moderation.allowed) {
    await writeModerationLogReal({
      typeReal: "private_callable_blocked",
      originalTextReal: textReal,
      reasonReal: moderation.reason,
      fromUid: request.auth.uid,
      toUid: receiverId
    });
    await recordStrikeReal(request.auth.uid, moderation.reason, "private", "");
    throw new HttpsError("invalid-argument", "Offensive language is not allowed.");
  }

  await enforceRateLimitReal(request.auth.uid);

  const name = displayNameFromRequest(request);
  const token = request.auth.token || {};
  const ref = await db.collection("messages").add({
    uid: request.auth.uid,
    senderId: request.auth.uid,
    receiverId,
    participants: [request.auth.uid, receiverId],
    displayName: name,
    senderPhotoURL: token.picture || "",
    text: moderation.cleanText,
    textReal: moderation.cleanText,
    type: "text",
    createdAt: FieldValue.serverTimestamp(),
    moderatedReal: !!moderation.flagged,
    flaggedReal: !!moderation.flagged,
    verifiedReal: true,
    moderatedBy: "server"
  });

  return {
    success: true,
    id: ref.id,
    moderated: !!moderation.flagged,
    cleanText: moderation.cleanText
  };
});

logger.info("TUBAL HUB server moderation functions loaded.");
