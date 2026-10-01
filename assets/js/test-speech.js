(() => {
  const line = "Hello from TUBAL HUB";
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(line);
    speechSynthesis.speak(u);
  }
})();