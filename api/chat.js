export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const message = String(body.message || "").trim();
    const page = String(body.page || "TUBAL HUB");

    if (!message) return res.status(400).json({ error: "Message is required" });
    if (message.length > 2000) return res.status(400).json({ error: "Message is too long" });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI backend is not configured" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        instructions:
          "You are TUBAL HUB AI, the helpful assistant for the TUBAL HUB website. " +
          "Answer clearly and concisely. Help users with TUBAL HUB, gaming, website features, " +
          "community rules, and general questions. Never reveal server secrets, API keys, or internal configuration. " +
          "Current page: " + page,
        input: message,
        max_output_tokens: 500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(502).json({ error: "AI provider request failed" });
    }

    const reply = data.output_text || "I couldn't generate a response right now.";
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("AI backend error:", error);
    return res.status(500).json({ error: "AI backend error" });
  }
}
