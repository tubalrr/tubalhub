import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

(function(){
  function sync(user){
    const guest=document.getElementById("authGuestActions");
    const signed=document.getElementById("authUserActions");
    const name=document.getElementById("authUserName");
    const sidebar=document.getElementById("sidebarUser");
    const sidebarName=document.getElementById("sidebarUserName");
    const sidebarAvatar=document.getElementById("sidebarUserAvatar");
    const loggedIn=!!user;
    const displayName=String(
      user?.displayName ||
      user?.email?.split("@")[0] ||
      (user?.isAnonymous ? "Guest" : "Member")
    ).trim();

    if(guest){
      guest.hidden=loggedIn;
      guest.setAttribute("aria-hidden", loggedIn ? "true" : "false");
    }
    if(signed){
      signed.hidden=!loggedIn;
      signed.setAttribute("aria-hidden", loggedIn ? "false" : "true");
    }
    if(name) name.textContent=loggedIn ? displayName : "";
    if(sidebar){
      sidebar.hidden=!loggedIn;
      sidebar.setAttribute("aria-hidden", loggedIn ? "false" : "true");
    }
    if(sidebarName) sidebarName.textContent=loggedIn ? displayName : "";
    if(sidebarAvatar) sidebarAvatar.textContent=(displayName.charAt(0)||"U").toUpperCase();
  }

  // Start with both states hidden so stale HTML can never leave Login/Sign Up visible.
  document.getElementById("authGuestActions")?.setAttribute("hidden","");
  document.getElementById("authUserActions")?.setAttribute("hidden","");
  document.getElementById("sidebarUser")?.setAttribute("hidden","");

  // Central logout handler: delegated/capture listener keeps Logout working even if
  // the header is re-rendered by another home module.
  document.addEventListener("click", async event => {
    const button = event.target.closest?.("#logoutBtn");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (button.dataset.logoutBusy === "1") return;
    button.dataset.logoutBusy = "1";
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("[TUBAL HUB Auth UI] Logout failed:", error);
      button.disabled = false;
      button.removeAttribute("aria-busy");
    } finally {
      button.dataset.logoutBusy = "0";
    }
  }, true);

  const boot=()=>{
    sync(auth.currentUser || null);
    onAuthStateChanged(auth,sync);
  };

  try{
    if(typeof auth.authStateReady==="function"){
      auth.authStateReady().then(boot).catch(boot);
    }else{
      boot();
    }
  }catch(error){
    console.warn("[TUBAL HUB Auth UI]",error);
    sync(auth.currentUser || null);
    try{ onAuthStateChanged(auth,sync); }catch(_){}
  }
})();
