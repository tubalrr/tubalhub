import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { subscribeHubPosts } from "./hub-content.js";
import { app, auth } from "./firebase-config.js";

const db = getFirestore(app);
const NEWS_PAGE_SIZE = 24;
const PRESENCE_WINDOW_MS = 45000;
const NEWS_REACTION_MAP = { "😀":"haha", "❤️":"love" };
const NEWS_REACTION_EMOJI = { haha:"😀", love:"❤️" };

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[c]));
const readJson = (k, f) => {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch (_) { return f; }
};
const saveJson = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
const initials = n => (
  String(n || "TUBAL HUB").trim().split(/\s+/).slice(0,2).map(x => x[0]).join("").toUpperCase() || "TH"
);
const imageOf = x => x.imageUrl || x.coverUrl || x.image || x.mediaUrl || x.thumbnailUrl || "";
const titleOf = x => x.title || "Untitled article";
const textOf = x => x.excerpt || x.text || x.summary || x.description || "";
const authorName = x => x.authorName || x.authorDisplayName || x.displayName || x.author || "TUBAL HUB";
const authorPhoto = x => x.authorPhotoURL || x.authorPhoto || x.authorAvatar || "";
const authorUid = x => x.authorUid || x.authorId || x.createdBy || x.uid || "";
const dateOf = x => {
  const v = x?.createdAt;
  if (v?.toDate) return v.toDate();
  if (v?.seconds) return new Date(v.seconds * 1000);
  if (typeof v === "number") return new Date(v);
  if (v) return new Date(v);
  return x?.date ? new Date(x.date) : null;
};
const dateLabel = x => {
  const d = dateOf(x);
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"})
    : String(x.date || "Latest");
};
const timeLabel = x => {
  const d = dateOf(x);
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})
    : "";
};
const minutesToRead = x => {
  if (x.readingTime) return String(x.readingTime).toLowerCase().includes("min")
    ? x.readingTime
    : String(x.readingTime) + " min read";
  const words = String(x.body || x.text || x.excerpt || "").trim().split(/\s+/).filter(Boolean).length;
  return words ? Math.max(1, Math.ceil(words / 220)) + " min read" : "";
};

const normalizeCategoryKey = value => {
  const s = String(value || "").trim().toLowerCase();
  const map = {
    game:"gaming", games:"gaming", gaming:"gaming", esports:"gaming",
    story:"stories", stories:"stories", feature:"stories", creator:"stories",
    event:"events", events:"events", tournament:"events",
    technology:"tech", tech:"tech", software:"tech", app:"tech", ai:"tech",
    community:"community", member:"community", members:"community", chat:"community",
    platform:"platform", news:"platform", announcement:"platform"
  };
  return map[s] || "";
};

const categoryOf = x => {
  const explicit = normalizeCategoryKey(x.category || x.section || x.type);
  if (explicit) return explicit;
  const meta = [
    ...(Array.isArray(x.tags) ? x.tags : []),
    x.topic || "",
    x.section || ""
  ].join(" ");
  const inferred = normalizeCategoryKey(meta);
  if (inferred) return inferred;
  const lower = meta.toLowerCase();
  if (/\bgaming\b|\besports\b|\bmlbb\b|\bmobile legends\b|\bhonor of kings\b/.test(lower)) return "gaming";
  if (/\bstory\b|\bstories\b|\bcreator\b|\bfeature\b/.test(lower)) return "stories";
  if (/\bevent\b|\bevents\b|\btournament\b/.test(lower)) return "events";
  if (/\btech\b|\btechnology\b|\bsoftware\b|\bapp\b|\bai\b/.test(lower)) return "tech";
  if (/\bcommunity\b|\bmember\b|\bchat\b/.test(lower)) return "community";
  return "platform";
};
const categoryLabel = k => ({
  gaming:"Gaming", community:"Community", stories:"Stories",
  events:"Events", tech:"Tech", platform:"News"
}[k] || "News");

const state = {
  all: [],
  sourceNews: [],
  newsLatest: [],
  newsOlder: [],
  newsCursor: null,
  newsHasMore: true,
  newsLoading: false,
  hubNews: [],
  trending: [],
  filter: "all",
  query: "",
  current: null,
  user: null,
  bookmarks: new Set(readJson("tubalhub-news-bookmarks", [])),
  reactionSummary: new Map(),
  reactionLoadedIds: new Set(),
  newsComments: new Map(),
  presence: new Map()
};

let stopNews = null;
let stopComments = null;
let presenceStops = [];
let presenceTimer = null;
let searchLoadPromise = null;

function showNotice(message, tone="info") {
  let box = document.getElementById("newsNotice");
  if (!box) {
    box = document.createElement("div");
    box.id = "newsNotice";
    box.className = "news-notice";
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.dataset.tone = tone;
  box.hidden = false;
  clearTimeout(box._timer);
  box._timer = setTimeout(() => { box.hidden = true; }, 2600);
}

function isRealUser() {
  return !!state.user && !state.user.isAnonymous;
}

function presenceTimeMs(value) {
  if (value?.toMillis) return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  return Number(value || 0);
}

function authorOnline(x) {
  const uid = authorUid(x);
  if (!uid) return false;
  const p = state.presence.get(uid);
  if (!p) return false;
  const lastSeen = presenceTimeMs(p.lastSeen);
  return p.online === true && lastSeen > 0 && (Date.now() - lastSeen) <= PRESENCE_WINDOW_MS;
}

function avatarHtml(x, big) {
  const src = authorPhoto(x);
  const cls = big ? "news-avatar" : "news-mini-avatar";
  return src
    ? "<span class='" + cls + "'><img src='" + esc(src) + "' alt=''></span>"
    : "<span class='" + cls + "'>" + esc(initials(authorName(x))) + "</span>";
}

function mediaHtml(x, featured) {
  const src = imageOf(x);
  if (src) {
    return "<img class='" + (featured ? "news-featured-media" : "news-card-media-image") +
      "' src='" + esc(src) + "' alt='' loading='" + (featured ? "eager" : "lazy") + "'>";
  }
  const icon = {
    gaming:"🎮", community:"◉", stories:"✦", events:"◈", tech:"⌁", platform:"▣"
  }[categoryOf(x)] || "📰";
  return "<div class='" + (featured ? "news-featured-fallback" : "news-card-fallback") + "'>" + icon + "</div>";
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return String(value || "").split(/[,\|]/).map(v => v.trim()).filter(Boolean);
}

function mapNewsDocument(d) {
  const data = d.data() || {};
  return {
    id: "news-" + d.id,
    sourceCollection: "news",
    sourceId: d.id,
    contentType: "news",
    title: data.title || "",
    text: data.text || data.summary || "",
    description: data.text || data.summary || "",
    body: data.body || "",
    views: Number(data.views || 0),
    commentsCount: Number(data.commentsCount || 0),
    imageUrl: data.imageUrl || data.image || "",
    createdAt: data.createdAt || 0,
    authorName: data.authorName || data.authorDisplayName || "TUBAL HUB News",
    authorDisplayName: data.authorDisplayName || data.authorName || "TUBAL HUB News",
    authorUid: data.authorUid || data.authorId || data.createdBy || data.uid || "",
    authorPhotoURL: data.authorPhotoURL || data.authorPhoto || data.authorAvatar || "",
    category: data.category || data.section || data.type || "",
    section: data.section || "",
    type: data.type || "",
    tags: normalizeTags(data.tags),
    topic: String(data.topic || "").trim(),
    keywords: normalizeTags(data.keywords),
    featured: data.featured === true,
    isFeatured: data.isFeatured === true,
    editorPick: data.editorPick === true,
    relatedIds: normalizeTags(data.relatedIds || data.relatedArticleIds || data.relatedNewsIds),
    readingTime: data.readingTime || "",
    articleUrl: data.articleUrl || ""
  };
}

function featuredItem() {
  return state.all.find(x => x.featured || x.isFeatured || x.editorPick) || state.all[0] || null;
}

function editorPickItem() {
  return state.all.find(x => x.editorPick === true || x.isFeatured === true || x.featured === true) || null;
}

function filtered() {
  const q = state.query.trim().toLowerCase();
  return state.all.filter(x => (
    state.filter === "all" || categoryOf(x) === state.filter
  ) && (
    !q ||
    (titleOf(x) + " " + textOf(x) + " " + String(x.body || "") + " " + authorName(x))
      .toLowerCase().includes(q)
  ));
}

function reactionSummary(id) {
  let d = state.reactionSummary.get(id);
  if (!d) {
    d = {haha:0, love:0, my:""};
    state.reactionSummary.set(id, d);
  }
  return d;
}

function renderReactionButtons(x) {
  const d = reactionSummary(x.id);
  const buttons = Object.keys(NEWS_REACTION_MAP).map(emoji => {
    const key = NEWS_REACTION_MAP[emoji];
    const selected = d.my === key;
    return "<button type='button' class='news-react " + (selected ? "selected" : "") +
      "' data-react-emoji='" + esc(emoji) + "' aria-label='React with " + esc(emoji) +
      "'>" + emoji + "<span class='news-react-count'>" + Number(d[key] || 0) + "</span></button>";
  }).join("");
  return "<span class='news-reactions'>" + buttons + "</span>";
}

function renderTicker() {
  const box = document.getElementById("newsTicker");
  const track = document.getElementById("newsTickerTrack");
  if (!box || !track) return;
  const arr = state.all.slice(0, 6);
  if (!arr.length) { box.hidden = true; return; }
  const one = arr.map(x =>
    "<span class='news-ticker-item'><b>" + esc(categoryLabel(categoryOf(x))) +
    "</b> • " + esc(titleOf(x)) + "</span>"
  ).join("");
  track.innerHTML = one + one;
  box.hidden = false;
}

function renderFeatured() {
  const slot = document.getElementById("newsFeaturedSlot");
  if (!slot) return;
  const x = featuredItem();
  if (!x) {
    slot.innerHTML = "<div class='news-empty'><div><div class='news-empty-icon'>📰</div><h3>No news yet</h3><p>There are no published articles yet.</p></div></div>";
    return;
  }
  const meta = [minutesToRead(x), dateLabel(x)].filter(Boolean).join(" · ");
  slot.innerHTML =
    "<article class='news-featured-card' data-open='" + esc(x.id) + "'>" +
      mediaHtml(x, true) +
      "<div class='news-featured-overlay'></div>" +
      "<div class='news-featured-content'>" +
        "<span class='news-category-pill'>" + esc(categoryLabel(categoryOf(x))) + "</span>" +
        "<h2 class='news-featured-title'>" + esc(titleOf(x)) + "</h2>" +
        "<p class='news-featured-excerpt'>" + esc(textOf(x)) + "</p>" +
        "<div class='news-author-row'>" + avatarHtml(x, true) +
          "<div><div class='news-author-main'>" + esc(authorName(x)) +
            " <span class='news-author-online " + (authorOnline(x) ? "" : "offline") + "'></span>" +
          "</div><div class='news-author-meta'>" + esc(meta) + "</div></div>" +
        "</div>" +
      "</div>" +
    "</article>";
  slot.querySelector("[data-open]")?.addEventListener("click", () => openReader(x));
}

function renderEditorsPick() {
  const slot = document.getElementById("editorPickSlot");
  if (!slot) return;
  const x = editorPickItem();
  if (!x) {
    slot.innerHTML = "<div class='news-side-copy'><p>No editor-picked story has been assigned yet.</p></div>";
    return;
  }
  slot.innerHTML =
    "<article class='news-editor-pick' data-editor-open='" + esc(x.id) + "'>" +
      mediaHtml(x, false) +
      "<div class='news-editor-pick-copy'>" +
        "<span class='news-category-pill'>" + esc(categoryLabel(categoryOf(x))) + "</span>" +
        "<h4>" + esc(titleOf(x)) + "</h4>" +
        "<p>" + esc(textOf(x)) + "</p>" +
        "<small>" + esc(dateLabel(x)) + " · " + esc(authorName(x)) + "</small>" +
      "</div>" +
    "</article>";
  slot.querySelector("[data-editor-open]")?.addEventListener("click", () => openReader(x));
}

function renderGrid(list) {
  const grid = document.getElementById("newsGrid");
  const count = document.getElementById("newsResultCount");
  if (!grid) return;

  if (count) count.textContent = list.length
    ? list.length + " " + (list.length === 1 ? "story" : "stories") + " loaded"
    : "";

  if (!state.all.length) {
    grid.innerHTML = "<div class='news-empty'><div><div class='news-empty-icon'>📰</div><h3>No news yet</h3><p>Published stories will appear here.</p></div></div>";
    return;
  }
  if (!list.length) {
    grid.innerHTML = "<div class='news-empty'><div><div class='news-empty-icon'>⌕</div><h3>No matching news</h3><p>Try another category or search phrase.</p></div></div>";
    return;
  }

  grid.innerHTML = list.map((x, i) => {
    const saved = state.bookmarks.has(x.id);
    const d = reactionSummary(x.id);
    const commentCount = Number(x.commentsCount || 0);
    return (
      "<article class='news-card' data-open='" + esc(x.id) + "' style='animation-delay:" +
        (Math.min(i,14) * .06) + "s'>" +
        "<div class='news-card-media'>" + mediaHtml(x, false) +
          "<span class='news-card-category'>" + esc(categoryLabel(categoryOf(x))) + "</span>" +
          "<button class='news-bookmark " + (saved ? "saved" : "") + "' data-bookmark='" +
            esc(x.id) + "' type='button' aria-label='" + (saved ? "Remove bookmark" : "Bookmark") +
            "'>" + (saved ? "★" : "☆") + "</button>" +
        "</div>" +
        "<div class='news-card-content'>" +
          "<h3 class='news-card-title'>" + esc(titleOf(x)) + "</h3>" +
          "<p class='news-card-excerpt'>" + esc(textOf(x)) + "</p>" +
          "<div class='news-card-footer'>" +
            "<div class='news-card-author'>" + avatarHtml(x, false) +
              "<div class='news-byline'><b>" + esc(authorName(x)) + "</b><span>" +
                esc(dateLabel(x)) + "</span></div>" +
            "</div>" +
            "<div class='news-card-metrics'>" +
              "<span class='news-view-metric'>" + Number(x.views || 0) + " views</span>" +
              (commentCount ? "<span>" + commentCount + " comments</span>" : "") +
              renderReactionButtons(x) +
            "</div>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }).join("");

  grid.querySelectorAll("[data-open]").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest("[data-bookmark], [data-react-emoji]")) return;
      const x = state.all.find(y => y.id === card.dataset.open);
      if (x) openReader(x);
    });
  });

  grid.querySelectorAll("[data-bookmark]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.dataset.bookmark;
      if (state.bookmarks.has(id)) state.bookmarks.delete(id);
      else state.bookmarks.add(id);
      saveJson("tubalhub-news-bookmarks", [...state.bookmarks]);
      btn.classList.remove("is-pop");
      void btn.offsetWidth;
      btn.classList.add("is-pop");
      setTimeout(() => btn.classList.remove("is-pop"), 420);
      renderGrid(filtered());
    });
  });

  grid.querySelectorAll("[data-react-emoji]").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const card = btn.closest(".news-card");
      const x = state.all.find(y => y.id === card?.dataset.open);
      if (!x) return;
      await toggleNewsReaction(x, btn.dataset.reactEmoji, btn);
    });
  });
}

function renderTrending() {
  const box = document.getElementById("trendingList");
  if (!box) return;
  const list = state.trending.length
    ? state.trending
    : [...state.sourceNews].sort((a,b) =>
        Number(b.views || 0) - Number(a.views || 0) ||
        (dateOf(b)?.getTime() || 0) - (dateOf(a)?.getTime() || 0)
      ).slice(0,5);
  box.innerHTML = list.length
    ? list.map((x,i) =>
      "<div class='trending-row'><span class='trending-num'>" + String(i+1).padStart(2,"0") +
      "</span><a href='#' data-trend='" + esc(x.id) + "'>" + esc(titleOf(x)) + "</a></div>"
    ).join("")
    : "<div class='news-side-copy'><p>No trending stories yet.</p></div>";
  box.querySelectorAll("[data-trend]").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    const x = state.all.find(y => y.id === a.dataset.trend) ||
      state.sourceNews.find(y => y.id === a.dataset.trend) ||
      state.trending.find(y => y.id === a.dataset.trend);
    if (x) openReader(x);
  }));
}

function relatedScore(current, candidate) {
  let score = 0;
  if (categoryOf(current) === categoryOf(candidate)) score += 5;
  const currentTopic = String(current.topic || "").toLowerCase();
  const candidateTopic = String(candidate.topic || "").toLowerCase();
  if (currentTopic && candidateTopic && currentTopic === candidateTopic) score += 6;

  const left = new Set([
    ...normalizeTags(current.tags),
    ...normalizeTags(current.keywords),
    ...String(current.topic || "").split(/\s+/)
  ].map(v => v.toLowerCase()).filter(v => v.length > 2));
  const right = new Set([
    ...normalizeTags(candidate.tags),
    ...normalizeTags(candidate.keywords),
    ...String(candidate.topic || "").split(/\s+/)
  ].map(v => v.toLowerCase()).filter(v => v.length > 2));

  for (const token of left) if (right.has(token)) score += 2;
  return score;
}

function renderRelated() {
  const current = state.current;
  const boxes = [document.getElementById("relatedGrid"), document.getElementById("readerRelatedGrid")];
  const explicit = normalizeTags(current?.relatedIds);
  const byKey = id => state.all.find(x =>
    x.id === id || x.sourceId === id || x.id === "news-" + id
  );

  let list = [];
  if (current) {
    explicit.forEach(id => {
      const found = byKey(id);
      if (found && found.id !== current.id && !list.some(x => x.id === found.id)) list.push(found);
    });
    if (list.length < 3) {
      list = list.concat(
        state.all
          .filter(x => x.id !== current.id && !list.some(y => y.id === x.id))
          .map(x => ({x,score:relatedScore(current,x)}))
          .sort((a,b) => b.score - a.score || (dateOf(b.x)?.getTime() || 0) - (dateOf(a.x)?.getTime() || 0))
          .map(v => v.x)
      ).slice(0,3);
    } else {
      list = list.slice(0,3);
    }
  }

  boxes.forEach(box => {
    if (!box) return;
    box.innerHTML = list.length
      ? list.map(x =>
        "<article class='news-card' data-related='" + esc(x.id) + "'>" +
          "<div class='news-card-media'>" + mediaHtml(x,false) +
            "<span class='news-card-category'>" + esc(categoryLabel(categoryOf(x))) + "</span>" +
          "</div><div class='news-card-content'>" +
            "<h3 class='news-card-title'>" + esc(titleOf(x)) + "</h3>" +
            "<p class='news-card-excerpt'>" + esc(textOf(x)) + "</p>" +
          "</div></article>"
      ).join("")
      : "<div class='news-empty'><div><div class='news-empty-icon'>✦</div><h3>No related articles</h3><p>More published stories will appear here.</p></div></div>";
    box.querySelectorAll("[data-related]").forEach(el => el.addEventListener("click", () => {
      const item = state.all.find(y => y.id === el.dataset.related);
      if (item) openReader(item);
    }));
  });
}

function renderComments(x) {
  const box = document.getElementById("newsCommentsList");
  const status = document.getElementById("newsCommentStatus");
  if (!box) return;
  const comments = state.newsComments.get(x.id) || [];
  box.innerHTML = comments.length
    ? comments.map(c =>
      "<div class='news-comment-bubble'>" +
        "<div class='news-comment-author'><b>" + esc(c.authorName || "Member") + "</b><small>" +
          esc(c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : "") + "</small></div>" +
        "<div>" + esc(c.text || "") + "</div>" +
      "</div>"
    ).join("")
    : "<div class='news-comment-empty'>No comments yet.</div>";
  if (status) {
    status.textContent = isRealUser()
      ? "Posting as " + (state.user.displayName || state.user.email?.split("@")[0] || "Member")
      : "Sign in to join the discussion.";
  }
}

function updateCommentComposer() {
  const input = document.getElementById("newsCommentInput");
  const button = document.getElementById("newsCommentSubmit");
  const note = document.getElementById("newsCommentStatus");
  const ready = isRealUser();
  if (input) input.disabled = !ready;
  if (button) button.disabled = !ready;
  if (note) note.textContent = ready
    ? "Posting as " + (state.user.displayName || state.user.email?.split("@")[0] || "Member")
    : "Sign in to join the discussion.";
}

function stopCommentListener() {
  if (stopComments) {
    stopComments();
    stopComments = null;
  }
}

function startCommentListener(x) {
  stopCommentListener();
  state.newsComments.set(x.id, []);
  try {
    const q = query(
      collection(db, "newsComments"),
      where("newsId", "==", x.id),
      limit(100)
    );
    stopComments = onSnapshot(q, snap => {
      const comments = snap.docs.map(d => ({id:d.id, ...d.data()}))
        .sort((a,b) => (presenceTimeMs(a.createdAt) || 0) - (presenceTimeMs(b.createdAt) || 0));
      state.newsComments.set(x.id, comments);
      renderComments(x);
      if (state.current?.id === x.id) {
        const field = state.all.find(item => item.id === x.id);
        if (field) field.commentsCount = comments.length;
      }
      renderGrid(filtered());
    }, error => {
      console.warn("[TUBAL HUB News] comments listener", error);
      renderComments(x);
    });
  } catch (e) {
    console.warn("[TUBAL HUB News] comments unavailable", e);
    renderComments(x);
  }
}

async function addNewsComment() {
  if (!state.current) return;
  if (!isRealUser()) {
    showNotice("Sign in to comment.", "warning");
    return;
  }
  const input = document.getElementById("newsCommentInput");
  const text = input?.value.trim() || "";
  if (!text) return;
  if (text.length > 2000) {
    showNotice("Comment is too long.", "warning");
    return;
  }

  const user = state.user;
  const item = {
    newsId: state.current.id,
    uid: user.uid,
    authorName: user.displayName || user.email?.split("@")[0] || "Member",
    authorPhotoURL: user.photoURL || "",
    text,
    createdAt: serverTimestamp()
  };

  try {
    await setDoc(doc(collection(db, "newsComments")), item);
    input.value = "";
    showNotice("Comment posted.", "success");
  } catch (e) {
    console.error("[TUBAL HUB News] comment write", e);
    showNotice("Comment could not be posted.", "warning");
  }
}

async function loadReactionSummariesForIds(ids) {
  const fresh = ids.filter(id => id && !state.reactionLoadedIds.has(id));
  if (!fresh.length) return;
  for (let i = 0; i < fresh.length; i += 30) {
    const batch = fresh.slice(i, i + 30);
    try {
      const snap = await getDocs(query(
        collection(db, "newsReactions"),
        where("newsId", "in", batch)
      ));
      batch.forEach(id => {
        const articleKey = id;
        const d = {haha:0, love:0, my:""};
        snap.forEach(s => {
          const x = s.data();
          if (x.newsId !== articleKey) return;
          if (x.reaction === "haha") d.haha++;
          if (x.reaction === "love") d.love++;
          if (x.uid === state.user?.uid) d.my = x.reaction;
        });
        state.reactionSummary.set(id, d);
        state.reactionLoadedIds.add(id);
      });
    } catch (e) {
      console.warn("[TUBAL HUB News] reaction summary load", e);
    }
  }
  renderGrid(filtered());
}

async function toggleNewsReaction(x, emoji, button) {
  if (!isRealUser()) {
    showNotice("Sign in to react.", "warning");
    return;
  }
  const reaction = NEWS_REACTION_MAP[emoji];
  if (!reaction) return;

  const d = reactionSummary(x.id);
  const previous = d.my;
  const refId = encodeURIComponent(String(x.id)) + "_" + encodeURIComponent(state.user.uid);
  const ref = doc(db, "newsReactions", refId);

  button?.classList.remove("is-pop");
  void button?.offsetWidth;
  button?.classList.add("is-pop");

  try {
    if (previous === reaction) {
      await deleteDoc(ref);
      d[reaction] = Math.max(0, Number(d[reaction] || 0) - 1);
      d.my = "";
    } else {
      if (previous) {
        const prevRef = doc(db, "newsReactions", refId);
        await setDoc(prevRef, {
          newsId:x.id, uid:state.user.uid, reaction, updatedAt:serverTimestamp()
        }, {merge:true});
        d[previous] = Math.max(0, Number(d[previous] || 0) - 1);
        d[reaction] = Number(d[reaction] || 0) + 1;
      } else {
        await setDoc(ref, {
          newsId:x.id, uid:state.user.uid, reaction, updatedAt:serverTimestamp()
        }, {merge:true});
        d[reaction] = Number(d[reaction] || 0) + 1;
      }
      d.my = reaction;
    }
    state.reactionSummary.set(x.id, d);
    renderGrid(filtered());
  } catch (e) {
    console.error("[TUBAL HUB News] reaction write", e);
    showNotice("Reaction could not be saved.", "warning");
  } finally {
    setTimeout(() => button?.classList.remove("is-pop"), 450);
  }
}

async function recordNewsView(x) {
  if (!x?.sourceCollection || x.sourceCollection !== "news" || !x.sourceId) return;
  const viewKey = "tubalhub-news-viewed-" + x.sourceId;
  try {
    const recent = Number(sessionStorage.getItem(viewKey) || 0);
    if (recent && Date.now() - recent < 15000) return;
    sessionStorage.setItem(viewKey, String(Date.now()));
  } catch (_) {}

  try {
    await updateDoc(doc(db, "news", x.sourceId), {views:increment(1)});
  } catch (e) {
    console.warn("[TUBAL HUB News] view count update unavailable", e);
  }
}

async function hashNewsletterEmail(email) {
  try {
    const data = new TextEncoder().encode(email);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map(v => v.toString(16).padStart(2,"0")).join("");
  } catch (_) {
    return encodeURIComponent(email).replace(/%/g,"_").slice(0,120);
  }
}

async function subscribeNewsletter() {
  const input = document.getElementById("newsNewsletterEmail");
  const note = document.getElementById("newsNewsletterNote");
  const email = input?.value.trim().toLowerCase() || "";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    if (note) { note.hidden = false; note.textContent = "Enter a valid email address."; }
    return;
  }
  try {
    const id = await hashNewsletterEmail(email);
    await setDoc(doc(db, "newsletterSubscribers", id), {
      email,
      source: "news",
      status: "subscribed",
      consent: true,
      uid: isRealUser() ? state.user.uid : "",
      subscribedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, {merge:true});
    if (note) {
      note.hidden = false;
      note.textContent = "Subscription saved.";
    }
    if (input) input.value = "";
  } catch (e) {
    console.error("[TUBAL HUB News] newsletter subscription", e);
    if (note) {
      note.hidden = false;
      note.textContent = "Subscription could not be saved.";
    }
  }
}

function articleShareUrl(x) {
  return new URL("news.html#article-" + encodeURIComponent(x?.id || ""), location.href).href;
}

async function shareCurrentArticle() {
  const x = state.current;
  if (!x) return;
  const url = articleShareUrl(x);
  const payload = {
    title: titleOf(x),
    text: textOf(x) || titleOf(x),
    url
  };

  if (navigator.share) {
    try {
      await navigator.share(payload);
      showNotice("Article shared.", "success");
      return;
    } catch (e) {
      if (e?.name === "AbortError") return;
    }
  }

  const sheet = document.getElementById("newsShareSheet");
  const input = document.getElementById("newsShareCopy");
  if (input) input.value = url;
  if (sheet) sheet.hidden = false;
}

function closeShareSheet() {
  const sheet = document.getElementById("newsShareSheet");
  if (sheet) sheet.hidden = true;
}

function setupPresenceListeners() {
  presenceStops.forEach(stop => { try { stop(); } catch (_) {} });
  presenceStops = [];

  const ids = [...new Set(state.all.map(authorUid).filter(Boolean))];
  if (!ids.length || !isRealUser()) {
    state.presence.clear();
    renderFeatured();
    renderEditorsPick();
    return;
  }

  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30);
    try {
      const q = query(collection(db, "presence"), where("uid", "in", chunk));
      const stop = onSnapshot(q, snap => {
        snap.forEach(s => state.presence.set(s.id, s.data()));
        const existing = new Set(snap.docs.map(s => s.id));
        for (const uid of chunk) if (!existing.has(uid)) state.presence.delete(uid);
        renderFeatured();
        renderEditorsPick();
        renderGrid(filtered());
      }, error => console.warn("[TUBAL HUB News] presence listener", error));
      presenceStops.push(stop);
    } catch (e) {
      console.warn("[TUBAL HUB News] presence query", e);
    }
  }
}

async function loadOlderNewsPage() {
  if (state.newsLoading || !state.newsHasMore || !state.newsCursor) return false;
  state.newsLoading = true;
  const status = document.getElementById("newsLoadMoreStatus");
  if (status) {
    status.hidden = false;
    status.textContent = "Loading older stories…";
  }

  try {
    const snap = await getDocs(query(
      collection(db, "news"),
      orderBy("createdAt","desc"),
      startAfter(state.newsCursor),
      limit(NEWS_PAGE_SIZE)
    ));
    const page = snap.docs.map(mapNewsDocument);
    const ids = new Set(state.newsOlder.map(x => x.id));
    for (const item of page) {
      if (!ids.has(item.id)) state.newsOlder.push(item);
    }
    if (snap.docs.length) state.newsCursor = snap.docs[snap.docs.length - 1];
    state.newsHasMore = snap.size === NEWS_PAGE_SIZE;
    mergeNews();
    return true;
  } catch (e) {
    console.warn("[TUBAL HUB News] older news page", e);
    state.newsHasMore = false;
    return false;
  } finally {
    state.newsLoading = false;
    if (status) {
      status.hidden = !state.newsHasMore;
      if (state.newsHasMore) status.textContent = "Scroll for more stories";
    }
  }
}

async function ensureAllNewsLoadedForFilter() {
  if (searchLoadPromise) return searchLoadPromise;
  searchLoadPromise = (async () => {
    const status = document.getElementById("newsLoadMoreStatus");
    if (status && state.newsHasMore) {
      status.hidden = false;
      status.textContent = "Loading the full News index for search/filter…";
    }
    while (state.newsHasMore) {
      const progressed = await loadOlderNewsPage();
      if (!progressed) break;
    }
    if (status) {
      status.hidden = true;
    }
  })().finally(() => { searchLoadPromise = null; });
  return searchLoadPromise;
}

function mergeNews() {
  const hub = state.hubNews
    .filter(x => Array.isArray(x.destinations) ? x.destinations.includes("news") : x.contentType === "news")
    .map(x => ({
      ...x,
      id: "hub-" + x.id,
      sourceCollection: "hubPosts",
      sourceId: x.id,
      authorUid: x.authorUid || x.createdBy || x.uid || "",
      tags: normalizeTags(x.tags),
      relatedIds: normalizeTags(x.relatedIds),
      views: Number(x.views || 0)
    }));

  const official = [...state.newsLatest, ...state.newsOlder];
  const seen = new Set();
  state.sourceNews = official.filter(x => {
    if (seen.has(x.id)) return false;
    seen.add(x.id);
    return true;
  });

  const allSeen = new Set();
  state.all = [...hub, ...state.sourceNews].filter(x => {
    const k = x.sourceCollection + ":" + x.sourceId;
    if (allSeen.has(k)) return false;
    allSeen.add(k);
    return true;
  });

  state.all.sort((a,b) =>
    (dateOf(b)?.getTime() || 0) - (dateOf(a)?.getTime() || 0)
  );

  renderTicker();
  renderFeatured();
  renderEditorsPick();
  renderGrid(filtered());
  renderTrending();
  renderRelated();
  setupPresenceListeners();
  loadReactionSummariesForIds(state.all.map(x => x.id));
  const status = document.getElementById("newsLoadMoreStatus");
  if (status) status.hidden = !state.newsHasMore || !!state.query.trim() || state.filter !== "all";
}

function setupTrendingRealtime() {
  try {
    return onSnapshot(
      query(collection(db, "news"), orderBy("views","desc"), limit(5)),
      snap => {
        state.trending = snap.docs.map(mapNewsDocument);
        renderTrending();
      },
      error => {
        console.warn("[TUBAL HUB News] trending listener", error);
        renderTrending();
      }
    );
  } catch (e) {
    console.warn("[TUBAL HUB News] trending setup", e);
    return null;
  }
}

function openReader(x) {
  state.current = x;
  const r = document.getElementById("newsReader");
  const cover = document.getElementById("newsReaderCover");
  const src = imageOf(x);

  if (cover) {
    cover.hidden = !src;
    if (src) cover.src = src;
  }

  document.getElementById("newsReaderCategory").textContent = categoryLabel(categoryOf(x));
  document.getElementById("newsReaderTitle").textContent = titleOf(x);
  document.getElementById("newsReaderByline").innerHTML =
    avatarHtml(x,true) +
    "<div><div class='news-author-main'>" + esc(authorName(x)) +
    " <span class='news-author-online " + (authorOnline(x) ? "" : "offline") + "'></span>" +
    "</div><div class='news-author-meta'>" + esc(minutesToRead(x)) +
    (timeLabel(x) ? " · " + esc(timeLabel(x)) : "") + "</div></div>";

  document.getElementById("newsReaderText").textContent = String(x.body || x.text || x.excerpt || "");
  renderComments(x);
  startCommentListener(x);
  renderRelated();
  const shareUrl = articleShareUrl(x);
  const shareInput = document.getElementById("newsShareCopy");
  if (shareInput) shareInput.value = shareUrl;
  closeShareSheet();
  updateCommentComposer();
  if (r) r.hidden = false;
  document.body.classList.add("news-reader-open");
  const shell = document.getElementById("newsReaderShell");
  if (shell) shell.scrollTop = 0;
  recordNewsView(x);
  loadReactionSummariesForIds([x.id]);
}

function closeReader() {
  stopCommentListener();
  state.current = null;
  document.getElementById("newsReader")?.setAttribute("hidden", "");
  document.body.classList.remove("news-reader-open");
  closeShareSheet();
}

function setupFilterSearch() {
  document.querySelectorAll(".news-filter-pill").forEach(b => {
    b.addEventListener("click", async () => {
      state.filter = b.dataset.filter || "all";
      document.querySelectorAll(".news-filter-pill").forEach(x => x.classList.toggle("active", x === b));
      renderGrid(filtered());
      if (state.filter !== "all") {
        await ensureAllNewsLoadedForFilter();
        renderGrid(filtered());
      }
    });
  });

  document.getElementById("newsSearchInput")?.addEventListener("input", async e => {
    state.query = e.target.value || "";
    renderGrid(filtered());
    if (state.query.trim()) {
      await ensureAllNewsLoadedForFilter();
      renderGrid(filtered());
    }
  });
}

function setup() {
  document.body.classList.add("news-premium");
  setupFilterSearch();

  onAuthStateChanged(auth, user => {
    state.user = user;
    state.reactionLoadedIds.clear();
    state.reactionSummary.clear();
    updateCommentComposer();
    setupPresenceListeners();
    renderGrid(filtered());
    renderComments(state.current || {});
    loadReactionSummariesForIds(state.all.map(x => x.id));
  });

  document.getElementById("newsReaderClose")?.addEventListener("click", closeReader);
  document.getElementById("newsReader")?.addEventListener("click", e => {
    if (e.target.id === "newsReader") closeReader();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeReader();
      closeShareSheet();
    }
  });

  document.getElementById("newsReaderShell")?.addEventListener("scroll", () => {
    const s = document.getElementById("newsReaderShell");
    const max = s.scrollHeight - s.clientHeight;
    const ratio = max > 0 ? s.scrollTop / max : 0;
    const progress = document.getElementById("newsReaderProgress");
    if (progress) progress.style.transform = "scaleX(" + ratio + ")";
  });

  document.getElementById("newsShareTrigger")?.addEventListener("click", shareCurrentArticle);
  document.getElementById("newsShareNativeBtn")?.addEventListener("click", shareCurrentArticle);
  document.getElementById("newsShareClose")?.addEventListener("click", closeShareSheet);
  document.getElementById("newsShareCopyBtn")?.addEventListener("click", async () => {
    const input = document.getElementById("newsShareCopy");
    if (!input) return;
    try {
      await navigator.clipboard.writeText(input.value);
    } catch (_) {
      input.select();
      document.execCommand("copy");
    }
    document.getElementById("newsShareCopyBtn").textContent = "Copied";
    setTimeout(() => {
      const b = document.getElementById("newsShareCopyBtn");
      if (b) b.textContent = "Copy";
    }, 1200);
  });

  document.getElementById("newsCommentForm")?.addEventListener("submit", e => {
    e.preventDefault();
    addNewsComment();
  });

  document.getElementById("newsNewsletterForm")?.addEventListener("submit", e => {
    e.preventDefault();
    subscribeNewsletter();
  });

  const sentinel = document.getElementById("newsLoadMoreSentinel");
  if (sentinel && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && state.filter === "all" && !state.query.trim()) {
        loadOlderNewsPage();
      }
    }, {rootMargin:"500px 0px"});
    observer.observe(sentinel);
  }

  if (!navigator.share) {
    const nativeBtn = document.getElementById("newsShareNativeBtn");
    if (nativeBtn) nativeBtn.hidden = true;
  }
}

async function load() {
  setup();
  const grid = document.getElementById("newsGrid");
  if (grid) {
    grid.innerHTML =
      "<div class='news-skeleton'><div class='news-skeleton-card'></div><div class='news-skeleton-card'></div><div class='news-skeleton-card'></div></div>";
  }

  try {
    stopNews = onSnapshot(
      query(collection(db, "news"), orderBy("createdAt","desc"), limit(NEWS_PAGE_SIZE)),
      snap => {
        state.newsLatest = snap.docs.map(mapNewsDocument);
        state.newsCursor = snap.docs[snap.docs.length - 1] || state.newsCursor;
        state.newsHasMore = snap.size === NEWS_PAGE_SIZE;
        mergeNews();
      },
      error => console.error("[TUBAL HUB News] realtime news listener", error)
    );
  } catch (e) {
    console.warn("[TUBAL HUB News] realtime news listener unavailable", e);
    try {
      const snap = await getDocs(query(
        collection(db, "news"),
        orderBy("createdAt","desc"),
        limit(NEWS_PAGE_SIZE)
      ));
      state.newsLatest = snap.docs.map(mapNewsDocument);
      state.newsCursor = snap.docs[snap.docs.length - 1] || null;
      state.newsHasMore = snap.size === NEWS_PAGE_SIZE;
    } catch (loadError) {
      console.error("[TUBAL HUB News] initial load", loadError);
      state.newsLatest = [];
      state.newsCursor = null;
      state.newsHasMore = false;
    }
  }

  try {
    subscribeHubPosts(items => {
      state.hubNews = items || [];
      mergeNews();
    });
  } catch (e) {
    console.warn("[TUBAL HUB News] hubPosts", e);
  }

  setupTrendingRealtime();
  mergeNews();
}

load();
