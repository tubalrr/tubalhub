import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

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
