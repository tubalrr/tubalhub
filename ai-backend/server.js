import "dotenv/config";
import express from "express";
import cors from "cors";
import Replicate from "replicate";

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://tubalrr.github.io";

if (!process.env.REPLICATE_API_TOKEN) {
  console.warn("REPLICATE_API_TOKEN is not set.");
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST", "OPTIONS"]
}));
app.use(express.json({ limit: "32kb" }));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "TUBAL HUB AI Music API", endpoints: ["/api/health", "/api/generate", "/api/download"] });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "TUBAL HUB AI Music API" });
});

function buildPrompt({ prompt, mood, vocals }) {
  const vocalRule = vocals === "none"
    ? "instrumental only, no vocals, no singing"
    : "subtle non-lyrical vocal texture only, no lyrics";

  return `${prompt}. Mood: ${mood}. ${vocalRule}. Original composition, suitable as background music.`;
}

function isAllowedReplicateUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "replicate.delivery" || url.hostname.endsWith(".replicate.delivery"));
  } catch {
    return false;
  }
}

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, mood = "Peaceful", duration = 8, vocals = "none" } = req.body || {};

    if (typeof prompt !== "string" || prompt.trim().length < 3) {
      return res.status(400).json({ error: "Please describe the music you want." });
    }

    const seconds = Number(duration);
    if (!Number.isInteger(seconds) || seconds < 5 || seconds > 30) {
      return res.status(400).json({
        error: "The current MusicGen backend supports 5–30 seconds per generation."
      });
    }

    const finalPrompt = buildPrompt({
      prompt: prompt.trim().slice(0, 1000),
      mood: String(mood).slice(0, 40),
      vocals
    });

    const output = await replicate.run(
      "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
      {
        input: {
          prompt: finalPrompt,
          duration: seconds,
          output_format: "mp3",
          normalization_strategy: "peak",
          temperature: 1,
          top_k: 250,
          top_p: 0,
          classifier_free_guidance: 3,
          continuation: false,
          model_version: "stereo-large"
        }
      }
    );

    const audioUrl = typeof output?.url === "function"
      ? output.url()
      : String(output);

    if (!isAllowedReplicateUrl(audioUrl)) {
      throw new Error("Unexpected audio output URL.");
    }

    const downloadUrl = `/api/download?url=${encodeURIComponent(audioUrl)}`;

    return res.json({
      ok: true,
      audioUrl,
      downloadUrl,
      duration: seconds,
      mood,
      message: "Original AI music generated successfully."
    });
  } catch (error) {
    console.error("Generation error:", error);
    return res.status(500).json({
      error: error?.message || "Music generation failed. Check the server log and API token."
    });
  }
});

app.get("/api/download", async (req, res) => {
  const target = String(req.query.url || "");

  if (!isAllowedReplicateUrl(target)) {
    return res.status(400).send("Invalid audio URL.");
  }

  try {
    const upstream = await fetch(target);

    if (!upstream.ok || !upstream.body) {
      return res.status(502).send("Audio file is no longer available. Generate the track again.");
    }

    const contentType = upstream.headers.get("content-type") || "audio/mpeg";
    const contentLength = upstream.headers.get("content-length");

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", 'attachment; filename="tubal-hub-ai-music.mp3"');
    res.setHeader("Cache-Control", "no-store");
    if (contentLength) res.setHeader("Content-Length", contentLength);

    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error("Download proxy error:", error);
    if (!res.headersSent) res.status(500).send("Download failed. Please generate the track again.");
    else res.end();
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`TUBAL HUB AI Music API running on port ${port}`);
});
