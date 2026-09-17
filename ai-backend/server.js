import "dotenv/config";
import express from "express";
import cors from "cors";
import Replicate from "replicate";

const app = express();

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN || "https://tubalrr.github.io";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ["GET", "POST", "OPTIONS"]
}));

app.use(express.json({ limit: "32kb" }));

// Test endpoint
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "TUBAL HUB AI Music API"
  });
});

// Generate AI music
app.post("/api/generate", async (req, res) => {
  try {
    const {
      prompt,
      mood = "Peaceful",
      duration = 10,
      vocals = "none"
    } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "Please describe the music you want."
      });
    }

    const seconds = Number(duration);

    if (!Number.isInteger(seconds) || seconds < 5 || seconds > 30) {
      return res.status(400).json({
        error: "Duration must be between 5 and 30 seconds."
      });
    }

    const vocalStyle =
      vocals === "none"
        ? "instrumental only, no vocals, no singing"
        : "subtle non-lyrical vocal texture, no lyrics";

    const finalPrompt = `
Original music composition.
${prompt.trim().slice(0, 1000)}
Mood: ${mood}.
${vocalStyle}.
Cinematic background music.
Original composition.
No copyrighted melodies.
Suitable for videos and nature scenes.
    `.trim();

    console.log("Generating:", finalPrompt);

    const output = await replicate.run(
      "meta/musicgen",
      {
        input: {
          prompt: finalPrompt,
          duration: seconds,
          output_format: "mp3"
        }
      }
    );

    let audioUrl;

    if (typeof output === "string") {
      audioUrl = output;
    } else if (output && typeof output.url === "function") {
      audioUrl = output.url();
    } else if (output && output.url) {
      audioUrl = output.url;
    } else {
      audioUrl = String(output);
    }

    res.json({
      ok: true,
      audioUrl,
      duration: seconds,
      mood,
      message: "AI music generated successfully."
    });

  } catch (error) {
    console.error("AI Music Error:", error);

    res.status(500).json({
      error: "AI music generation failed.",
      details: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TUBAL HUB AI Music API running on port ${PORT}`);
});
