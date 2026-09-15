document.addEventListener('DOMContentLoaded',()=>{const box=document.querySelector('#cookieBox'),accept=document.querySelector('#acceptCookie');if(localStorage.getItem('tubalCookie')==='accepted')box?.classList.add('hidden');accept?.addEventListener('click',()=>{localStorage.setItem('tubalCookie','accepted');box?.classList.add('hidden')});const menu=document.querySelector('.menu-btn'),nav=document.querySelector('.nav');menu?.addEventListener('click',()=>{
  nav?.classList.toggle('open');
  if(nav?.classList.contains('open')){
    nav.style.display='flex'; nav.style.flexDirection='column'; nav.style.position='absolute';
    nav.style.top='78px'; nav.style.left='0'; nav.style.right='0'; nav.style.padding='12px';
    nav.style.background='rgba(3,5,4,.97)'; nav.style.borderBottom='1px solid #183b29';
  } else { nav.style.display=''; }
});});
// TUBAL HUB premium navigation polish
document.querySelectorAll('header nav a').forEach(a=>{if(a.href===location.href)a.classList.add('active')});
