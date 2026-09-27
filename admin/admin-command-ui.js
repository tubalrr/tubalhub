/* TUBAL HUB ADMIN — command search, notifications and profile surface.
   Reads only data already loaded by the existing admin module. No fake records.
*/
(() => {
  const $ = id => document.getElementById(id);
  const state = () => window.TUBAL_ADMIN_CONTROL_STATE || null;
  const analytics = () => window.TUBAL_ADMIN_ANALYTICS_STATE || null;

  function esc(v){
    return String(v ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function ensureHeaderControls(){
    const topbar = document.querySelector(".topbar");
    const left = document.querySelector(".topbar-left");
    const actions = document.querySelector(".top-actions");
    if(!topbar || !left || !actions) return false;

    if(!$("adminCommandWrap")){
      const wrap = document.createElement("div");
      wrap.id = "adminCommandWrap";
      wrap.className = "admin-command-wrap";
      wrap.innerHTML =
        '<button type="button" id="adminCommandButton" class="admin-command-button" aria-haspopup="dialog" aria-controls="adminCommandOverlay">' +
          '<span>⌕&nbsp; Search users, products, news, orders...</span><span class="shortcut">Ctrl K</span>' +
        '</button>';
      left.appendChild(wrap);
    }

    if(!$("adminNotificationsWrap")){
      const wrap = document.createElement("div");
      wrap.id = "adminNotificationsWrap";
      wrap.className = "admin-profile-wrap";
      wrap.innerHTML =
        '<button type="button" id="adminNotificationsButton" class="admin-icon-btn" aria-expanded="false" aria-label="Open admin notifications">🔔<span id="adminNotificationDot" class="admin-notif-dot" hidden></span></button>' +
        '<div id="adminNotificationsMenu" class="admin-notif-menu" hidden></div>';
      actions.insertBefore(wrap, actions.firstChild);
    }

    if(!$("adminProfileWrap")){
      const wrap = document.createElement("div");
      wrap.id = "adminProfileWrap";
      wrap.className = "admin-profile-wrap";
      wrap.innerHTML =
        '<button type="button" id="adminProfileButton" class="admin-profile-button" aria-expanded="false" aria-haspopup="menu">' +
          '<span id="adminAvatar" class="admin-avatar">AD</span>' +
          '<span class="admin-profile-copy"><b>Administrator</b><small id="adminProfileSub">Firebase Auth</small></span><span aria-hidden="true">⌄</span>' +
        '</button>' +
        '<div id="adminProfileMenu" class="admin-profile-menu" hidden>' +
          '<div class="profile-line"><b id="adminProfileEmail">—</b><small>Authenticated admin session</small></div>' +
          '<button type="button" id="adminProfileSignOut" class="profile-action">Sign Out</button>' +
        '</div>';
      actions.appendChild(wrap);
    }

    return true;
  }

  function buildCommandOverlay(){
    if($("adminCommandOverlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "adminCommandOverlay";
    overlay.className = "command-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="command-box" role="dialog" aria-modal="true" aria-labelledby="commandSearchTitle">' +
        '<div class="command-box-head"><span aria-hidden="true">⌕</span><input id="adminCommandInput" autocomplete="off" placeholder="Search admin data or jump to a section..." aria-label="Search admin data"></div>' +
        '<div id="commandSearchTitle" class="sr-only">Admin command search</div>' +
        '<div id="adminCommandList" class="command-box-list"></div>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  function realRecords(){
    const s = state();
    return {
      members: s?.getMembers?.() || [],
      products: s?.getProducts?.() || [],
      orders: s?.getOrders?.() || [],
      news: s?.getNews?.() || [],
      announcements: s?.getAnnouncements?.() || [],
      chats: s?.getChats?.() || []
    };
  }

  function sectionEntries(){
    return [
      ["Section","Dashboard","Open dashboard","#dashboard"],
      ["Section","Analytics","Real Firestore activity","#analytics"],
      ["Section","Beta Control","Manage beta access","#betaTestControl"],
      ["Section","Updater Control","Schedule or test releases","#updaterControl"],
      ["Section","Maintenance","System maintenance settings","#systemSettings"],
      ["Section","Firestore","Database tools","#firestore"],
      ["Section","Community Moderation","Members and chat","#chat"],
      ["Section","Shop Products","Products and brand filters","#shopProducts"],
      ["Section","Orders","Payment verification","#shopOrders"],
      ["Section","News","News manager","#content"],
      ["Section","Announcements","Announcements","#announcements"],
      ["Section","Members","Registered members","#members"]
    ].filter(x => $(x[2] === "Open dashboard" ? "dashboard" : x[2] === "Real Firestore activity" ? "analytics" : "") || document.querySelector(x[3]));
  }

  function searchItems(q){
    const query = String(q || "").trim().toLowerCase();
    const r = realRecords();
    const out = [];

    const add = (type,label,meta,href) => {
      const hay = (String(label||"")+" "+String(meta||"")).toLowerCase();
      if(!query || hay.includes(query)) out.push({type,label,meta,href});
    };

    sectionEntries().forEach(x => add(x[0],x[1],x[2],x[3]));
    r.members.forEach(x => add("User",x.displayName||x.email||"Member",x.email||x.uid||x.id||"","#members"));
    r.products.forEach(x => add("Product",x.name||"Product",(x.category||"") + " • " + (x.brandKey||x.brandName||"Unassigned"),"#shopProducts"));
    r.orders.forEach(x => add("Order",x.id||"Order",(x.status||"pending") + " • ₱" + Number(x.total||0).toLocaleString("en-PH"),"#shopOrders"));
    r.news.forEach(x => add("News",x.title||"News",x.category||"","#content"));
    r.announcements.forEach(x => add("Announcement",x.title||"Announcement","","#announcements"));
    r.chats.forEach(x => add("Chat",x.displayName||"Member",x.text||"","#chat"));

    return out.slice(0,40);
  }

  function renderSearch(q, targetId){
    const target = $(targetId);
    if(!target) return;
    const items = searchItems(q);
    target.innerHTML = items.length
      ? items.map((x,i) =>
        '<a href="' + esc(x.href) + '" class="admin-command-result' + (i===0 ? ' selected' : '') + '" data-result-index="' + i + '">' +
          '<span>' + esc(x.type) + '</span><b>' + esc(x.label) + '</b><small>' + esc(x.meta||"") + '</small>' +
        '</a>'
      ).join("")
      : '<div class="admin-command-empty">No matching real data found in the loaded Firestore records.</div>';
  }

  function openPalette(){
    buildCommandOverlay();
    const ov = $("adminCommandOverlay");
    ov.hidden = false;
    const input = $("adminCommandInput");
    input.value = "";
    renderSearch("", "adminCommandList");
    requestAnimationFrame(() => input.focus());
  }

  function closePalette(){
    const ov = $("adminCommandOverlay");
    if(ov) ov.hidden = true;
  }

  function pendingOrders(orders){
    return orders.filter(o => ["pending_payment","pending","awaiting_payment","for_verification"].includes(String(o?.status||"").toLowerCase())).length;
  }

  function updateNotifications(){
    if(!$("adminNotificationsMenu")) return;
    const r = realRecords();
    const online = $("onlineNowReal")?.textContent || "—";
    const pending = pendingOrders(r.orders);
    const maintenanceOn = $("maintenanceMode")?.checked === true;

    const notices = [
      ["Live presence", online + " online now"],
      ["Orders", pending + " pending payment verification"],
      ["Content", r.news.length + " news records loaded"],
      ["Products", r.products.length + " products loaded"]
    ];
    if(maintenanceOn) notices.unshift(["Maintenance","Maintenance mode is ON"]);

    const attention = pending + (maintenanceOn ? 1 : 0);
    $("adminNotificationDot").hidden = attention === 0;

    $("adminNotificationsMenu").innerHTML =
      '<div class="notif-head">Live admin signals</div>' +
      notices.map(n => '<div class="notif-item"><b>' + esc(n[0]) + '</b><small>' + esc(n[1]) + '</small></div>').join("");
  }

  function updateProfile(){
    const email = $("adminEmail")?.textContent?.trim() || "Admin session";
    if($("adminProfileEmail")) $("adminProfileEmail").textContent = email;
    if($("adminProfileSub")) $("adminProfileSub").textContent = email ? "Firebase Auth" : "Authenticated admin";
    if($("adminAvatar")) $("adminAvatar").textContent = (email.split("@")[0] || "AD").slice(0,2).toUpperCase();
  }

  function setTrend(el, label, cls){
    if(!el) return;
    el.className = "kpi-trend " + (cls || "neutral");
    el.textContent = label;
  }

  function updateKpiTrends(){
    const a = analytics();
    if(!a || !Array.isArray(a.days) || !a.days.length) return;

    const days = a.days.slice(-30);
    const last = days.slice(-7);
    const prev = days.slice(-14,-7);
    const sum = (arr,key) => arr.reduce((n,x)=>n+Number(x?.[key]||0),0);
    const pct = (current,previous) => {
      if(previous === 0) return current > 0 ? {label:"New",cls:"positive"} : {label:"No change",cls:"neutral"};
      const p = ((current-previous)/previous)*100;
      const sign = p > 0 ? "+" : "";
      return {label:sign+p.toFixed(1)+"%",cls:p>0?"positive":p<0?"negative":"neutral"};
    };

    const msg = pct(sum(last,"messages"),sum(prev,"messages"));
    const users = pct(sum(last,"newUsers"),sum(prev,"newUsers"));
    const dauToday = Number(days[days.length-1]?.activeUsers||0);
    const dauPrev = Number(days[days.length-2]?.activeUsers||0);
    const dau = pct(dauToday,dauPrev);

    const targets = {
      analyticsDau:["Today vs yesterday",dau],
      analyticsWau:["7-day live",null],
      analyticsMessages:["Last 7d vs prior 7d",msg],
      analyticsNewUsers:["Last 7d vs prior 7d",users]
    };

    Object.entries(targets).forEach(([id,info]) => {
      const valueEl = $(id);
      if(!valueEl) return;
      const card = valueEl.closest(".stat");
      if(!card) return;
      let trend = card.querySelector(".kpi-trend");
      if(!trend){
        trend = document.createElement("span");
        trend.className = "kpi-trend";
        valueEl.parentNode.appendChild(trend);
      }
      if(info[1]) setTrend(trend, info[0] + " · " + info[1].label, info[1].cls);
      else setTrend(trend, info[0], "neutral");
    });
  }

  function bind(){
    if(!ensureHeaderControls()) return false;
    buildCommandOverlay();

    $("adminCommandButton")?.addEventListener("click", openPalette);
    $("adminCommandInput")?.addEventListener("input", e => renderSearch(e.target.value,"adminCommandList"));
    $("adminCommandInput")?.addEventListener("keydown", e => {
      if(e.key === "Escape") closePalette();
      if(e.key === "Enter"){
        const first = $("adminCommandList")?.querySelector(".admin-command-result");
        if(first) first.click();
      }
    });

    $("adminCommandOverlay")?.addEventListener("click", e => {
      if(e.target.id === "adminCommandOverlay") closePalette();
    });

    $("adminNotificationsButton")?.addEventListener("click", e => {
      e.stopPropagation();
      const menu = $("adminNotificationsMenu");
      const open = menu.hidden;
      $("adminProfileMenu").hidden = true;
      menu.hidden = !open;
      $("adminNotificationsButton").setAttribute("aria-expanded",String(open));
      updateNotifications();
    });

    $("adminProfileButton")?.addEventListener("click", e => {
      e.stopPropagation();
      const menu = $("adminProfileMenu");
      const open = menu.hidden;
      $("adminNotificationsMenu").hidden = true;
      menu.hidden = !open;
      $("adminProfileButton").setAttribute("aria-expanded",String(open));
      updateProfile();
    });

    $("adminProfileSignOut")?.addEventListener("click", () => $("logout")?.click());

    document.addEventListener("click", e => {
      if(!e.target.closest("#adminNotificationsWrap")) $("adminNotificationsMenu")?.setAttribute("hidden","");
      if(!e.target.closest("#adminProfileWrap")) $("adminProfileMenu")?.setAttribute("hidden","");
    });

    document.addEventListener("keydown", e => {
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"){
        e.preventDefault();
        openPalette();
      }
      if(e.key === "Escape") closePalette();
    });

    document.querySelectorAll(".sidebar nav a, .brand-switch-btn, .brand-filter-btn").forEach(el => {
      el.addEventListener("click", () => {
        setTimeout(updateNotifications,120);
        setTimeout(updateProfile,120);
      });
    });

    return true;
  }

  function exposeStateFallback(){
    const existing = window.TUBAL_ADMIN_CONTROL_STATE || {};
    const original = existing;
    if(!original.getMembers){
      // These globals are intentionally optional; the inline admin module may expose them later.
      const membersEl = document.querySelector("#memberList");
      const productsEl = document.querySelector("#shopProductList");
      const ordersEl = document.querySelector("#shopOrderList");
      original.getMembers = () => membersEl ? Array.from(membersEl.querySelectorAll("article,.member-row")).map(x => ({name:x.textContent})) : [];
      original.getProducts = original.getProducts || (() => []);
      original.getOrders = original.getOrders || (() => []);
      original.getNews = () => [];
      original.getAnnouncements = () => [];
      original.getChats = () => [];
      window.TUBAL_ADMIN_CONTROL_STATE = original;
    }
  }

  function ready(){
    if(!bind()) return setTimeout(ready,120);
    updateProfile();
    updateNotifications();
    updateKpiTrends();
    setInterval(() => {
      updateProfile();
      updateNotifications();
      updateKpiTrends();
    },1200);
  }

  ready();
})();
