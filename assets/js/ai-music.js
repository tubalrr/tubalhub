const ENDPOINT = "https://tubalhub.onrender.com/api/generate";

const promptEl = document.getElementById("prompt");
const moodEl = document.getElementById("mood");
const durationEl = document.getElementById("duration");
const vocalsEl = document.getElementById("vocals");
const generateBtn = document.getElementById("generate");
const statusEl = document.getElementById("status");
const player = document.getElementById("player");
const download = document.getElementById("download");
const trackTitle = document.getElementById("trackTitle");
const trackInfo = document.getElementById("trackInfo");
const state = document.getElementById("state");

document.querySelectorAll("[data-prompt]").forEach(btn => {
  btn.addEventListener("click", () => promptEl.value = btn.dataset.prompt);
});

generateBtn.addEventListener("click", async () => {
  generateBtn.disabled = true;
  state.textContent = "CREATING";
  statusEl.textContent = "Sending your prompt to the AI music backend…";

  try {
    const prompt = promptEl.value.trim();
    const duration = Number(durationEl.value);

    if (!prompt) throw new Error("Please describe the music first.");
    if (!Number.isFinite(duration) || duration < 5 || duration > 30) {
      throw new Error("Duration must be between 5 and 30 seconds.");
    }

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        prompt,
        mood: moodEl.value,
        duration,
        vocals: vocalsEl.value
      })
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error(`Backend returned HTTP ${response.status}.`);
    }

    if (!response.ok) throw new Error(data.error || `Generation failed (HTTP ${response.status}).`);

    player.src = data.audioUrl;
    player.hidden = false;
    download.href = data.downloadUrl || data.audioUrl;
    download.download = `tubal-hub-${String(data.mood).toLowerCase()}.mp3`;
    download.target = "_self";
    download.hidden = false;

    trackTitle.textContent = `TUBAL HUB — ${data.mood} Original`;
    trackInfo.textContent = `${data.duration} second AI-generated instrumental`;
    state.textContent = "READY";
    statusEl.textContent = "Music generated successfully. Press Play to listen.";
  } catch (error) {
    state.textContent = "ERROR";
    statusEl.textContent = error.message;
  } finally {
    generateBtn.disabled = false;
  }
});
