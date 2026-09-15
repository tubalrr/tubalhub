
(function(){
  const KEY = "tubalHubAccounts";

  function getAccounts(){
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch(e){ return []; }
  }
  function saveAccounts(accounts){
    localStorage.setItem(KEY, JSON.stringify(accounts));
  }
  function msg(el, text, ok){
    if(!el) return;
    el.textContent = text;
    el.className = "auth-message " + (ok ? "success" : "error");
  }

  const signup = document.getElementById("signupForm");
  if(signup){
    signup.addEventListener("submit", function(e){
      e.preventDefault();
      const username = document.getElementById("signupUsername").value.trim();
      const email = document.getElementById("signupEmail").value.trim().toLowerCase();
      const password = document.getElementById("signupPassword").value;
      const confirm = document.getElementById("signupConfirm").value;
      const out = document.getElementById("signupMessage");
      const accounts = getAccounts();

      if(password !== confirm) return msg(out, "Passwords do not match.", false);
      if(accounts.some(a => a.username.toLowerCase() === username.toLowerCase() || a.email === email))
        return msg(out, "Username or email is already registered.", false);

      accounts.push({username, email, password});
      saveAccounts(accounts);
      msg(out, "Account created. Redirecting to Log In…", true);
      setTimeout(() => location.href = "login.html", 900);
    });
  }

  const login = document.getElementById("loginForm");
  if(login){
    login.addEventListener("submit", function(e){
      e.preventDefault();
      const id = document.getElementById("loginId").value.trim().toLowerCase();
      const password = document.getElementById("loginPassword").value;
      const out = document.getElementById("loginMessage");
      const account = getAccounts().find(a =>
        (a.username.toLowerCase() === id || a.email === id) && a.password === password
      );

      if(!account) return msg(out, "Invalid username/email or password.", false);
      localStorage.setItem("tubalHubCurrentUser", JSON.stringify({
        username: account.username,
        email: account.email
      }));
      msg(out, "Login successful. Welcome to TUBAL HUB!", true);
      setTimeout(() => location.href = "../index.html", 700);
    });
  }
})();
