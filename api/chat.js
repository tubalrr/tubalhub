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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI backend is not configured" });

    const model = process.env.GEMINI_MODEL || "gemini-3.7-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text:
                "You are TUBAL HUB AI, the helpful assistant for the TUBAL HUB website. " +
                "Answer clearly and concisely. Help users with TUBAL HUB, gaming, website features, " +
                "community rules, and general questions. Never reveal server secrets, API keys, or internal configuration. " +
                "Current page: " + page
            }]
          },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 500 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(502).json({
        error: "AI provider request failed",
        providerStatus: response.status
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim() ||
      "I couldn't generate a response right now.";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("AI backend error:", error);
    return res.status(500).json({ error: "AI backend error" });
  }
}
