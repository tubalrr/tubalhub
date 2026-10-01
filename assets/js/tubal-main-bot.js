(() => {
"use strict";
if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
if (window.__tubalDuoSpeechBridge) return;
window.__tubalDuoSpeechBridge = true;

const nativeSpeak = speechSynthesis.speak.bind(speechSynthesis);

function ui(who, line){
  const root=document.getElementById("tubalMainBotToggle");
  const bot=root?.querySelector(".th-welcome-bot");
  const news=root?.querySelector(".th-announcer-bot");
  [bot,news].forEach(x=>x?.classList.remove("is-speaking","is-presenting"));
  const active=who==="news"?news:bot;
  active?.classList.add("is-speaking","is-presenting");
  const title=document.getElementById("tubalMainBotTitle");
  const text=document.getElementById("tubalMainBotText");
  const bubble=document.getElementById("tubalMainBotBubble");
  if(title) title.textContent=who==="news"?"News Announcer":"Welcome Bot";
  if(text) text.textContent=line;
  if(bubble) bubble.hidden=false;
  return active;
}

function rewrite(text,who){
  const t=String(text||"").replace(/\s+/g," ").trim();
  if(who==="welcome"){
    if(/^Hello! Welcome|^Welcome to TUBAL HUB|^Hi there! Welcome/i.test(t))
      return "Hey News, we're live. Can you give me a quick rundown of TUBAL HUB?";
    if(/Here is the website tour:|The Hub brings together|Let us start with the site itself:|Here is the tour:|I will fill in the details:/i.test(t))
      return t.replace(/^(Here is the website tour:|The Hub brings together|Let us start with the site itself:|Here is the tour:|I will fill in the details:)\s*/i,"Let me walk through the Hub: ");
    if(/That is the latest TUBAL HUB briefing|Thanks for listening|Welcome again to TUBAL HUB|Good briefing|Nice\. That gives us/i.test(t))
      return "Perfect. Thanks, News. We're ready for the next update.";
  } else {
    if(/^Hello! I am the TUBAL HUB News Announcer|^Thank you\. I am the TUBAL HUB News Announcer|^And I am the News Announcer/i.test(t))
      return "Sure. I'm the News Announcer. I'll handle release news, feature announcements, and fixes.";
    if(/^Now for the news\.\s*/i.test(t))
      return t.replace(/^Now for the news\.\s*/i,"Here is the release briefing. ");
  }
  return t;
}

speechSynthesis.speak=function(utterance){
  const raw=String(utterance?.text||"");
  const news=document.querySelector("#tubalMainBotToggle .th-announcer-bot.is-speaking");
  const welcome=document.querySelector("#tubalMainBotToggle .th-welcome-bot.is-speaking");

  if(/^News alert\. A new TUBAL HUB website update has been detected/i.test(raw)){
    const originalEnd=utterance.onend;
    const originalError=utterance.onerror;
    const vm=raw.match(/new version is\s+([\w.]+)/i)||raw.match(/Version\s+([\w.]+)\s+is now live/i);
    const version=vm?vm[1]:"the new version";
    const sm=raw.match(/Here are the latest changes:\s*(.*?)(?:\. I have announced|\. TUBAL HUB will now refresh|$)/i);
    const summary=sm?sm[1].trim():"the latest feature updates and fixes";
    const lines=[
      ["welcome","Hey News, what changed in the new release?"],
      ["news","The new version is "+version+". The latest changes are: "+summary+"."],
      ["welcome","Good. That is enough for the release briefing. Let's refresh the Hub."]
    ];
    speechSynthesis.cancel();
    let i=0;
    const next=()=>{
      if(i>=lines.length){
        const root=document.getElementById("tubalMainBotToggle");
        [root?.querySelector(".th-welcome-bot"),root?.querySelector(".th-announcer-bot")]
          .forEach(x=>x?.classList.remove("is-speaking","is-presenting"));
        try{originalEnd?.({type:"end"});}catch(_){}
        return;
      }
      const [who,line]=lines[i++];
      ui(who,line);
      const u=new SpeechSynthesisUtterance(line);
      u.lang=utterance.lang||"en-US";
      u.rate=utterance.rate||.9;
      u.pitch=who==="news"?1.04:(utterance.pitch||1.02);
      u.volume=utterance.volume??1;
      if(utterance.voice) u.voice=utterance.voice;
      u.onend=next;
      u.onerror=next;
      nativeSpeak(u);
    };
    next();
    return;
  }

  if(news||welcome){
    const who=news?"news":"welcome";
    const line=rewrite(raw,who);
    ui(who,line);
    utterance.text=line;
  }
  nativeSpeak(utterance);
};
})();