/* TUBAL HUB — Firebase Cloud Messaging service worker
   Receives background call notifications and opens Global Chat.
*/
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBBfE3xfu4BRz7Jwd4GoscJ_jW_x-GxJUk",
  authDomain: "tubalhub.firebaseapp.com",
  projectId: "tubalhub",
  storageBucket: "tubalhub.firebasestorage.app",
  messagingSenderId: "741686139338",
  appId: "1:741686139338:web:dc80d9c37a9e8b4da79733"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const name = data.callerName || "Member";
  const callId = data.callId || "call";

  self.registration.showNotification("TUBAL HUB — Incoming Call", {
    body: name + " is calling you on TUBAL HUB.",
    icon: "/tubalhub/tubal-hub-logo.png",
    badge: "/tubalhub/tubal-hub-logo.png",
    tag: "tubalhub-call-" + callId,
    renotify: true,
    requireInteraction: true,
    data: {
      url: "/tubalhub/pages/chat.html",
      callId
    },
    actions: [
      { action: "open", title: "Open Call" },
      { action: "dismiss", title: "Dismiss" }
    ]
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if(event.action === "dismiss") return;

  const target = new URL(event.notification.data?.url || "/tubalhub/pages/chat.html", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({type:"window", includeUncontrolled:true}).then(list => {
      for(const client of list){
        if("focus" in client){
          client.navigate(target).catch(()=>{});
          return client.focus();
        }
      }
      if(clients.openWindow) return clients.openWindow(target);
    })
  );
});
