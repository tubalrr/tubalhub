import { auth } from "./firebase-config.js";

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
  btn.addEventListener("click", () => {
    promptEl.value = btn.dataset.prompt;
  });
});

generateBtn.addEventListener("click", async () => {
  generateBtn.disabled = true;
  state.textContent = "CREATING";
  statusEl.textContent = "Checking your secure login…";

  try {
    const user = auth.currentUser;

    if (!user || user.isAnonymous) {
      throw new Error("Please log in to use AI Music.");
    }

    const idToken = await user.getIdToken();
    statusEl.textContent = "Sending your prompt to the secure AI backend…";

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({
        prompt: promptEl.value,
        mood: moodEl.value,
        duration: Number(durationEl.value),
        vocals: vocalsEl.value
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Generation failed (${response.status}).`);
    }

    const trackUrl = new URL(data.streamUrl, ENDPOINT).href;

    player.src = trackUrl;
    player.hidden = false;

    download.href = trackUrl;
    download.download = `tubal-hub-${String(data.mood).toLowerCase()}.mp3`;
    download.hidden = false;

    trackTitle.textContent = `TUBAL HUB — ${data.mood} Original`;
    trackInfo.textContent = `${data.duration} second AI-generated instrumental`;
    state.textContent = "READY";
    statusEl.textContent = "Music generated successfully. Press Play to listen.";
  } catch (error) {
    state.textContent = "ERROR";
    statusEl.textContent = error.message || "Generation failed.";
    player.hidden = true;
    download.hidden = true;
  } finally {
    generateBtn.disabled = false;
  }
});
