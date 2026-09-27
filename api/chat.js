export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const message = String(body.message || "").trim();
    const page = String(body.page || "TUBAL HUB");

    if (!message) return res.status(400).json({ error: "Message is required" });
    if (message.length > 4000) return res.status(400).json({ error: "Message is too long" });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Groq AI backend is not configured" });

    // Keep the model configurable so Groq model changes do not require frontend changes.
    // Current default is a supported Groq production model; override with GROQ_MODEL.
    const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

    const system =
      "You are TUBAL BOT, the official AI website assistant for TUBAL HUB. " +
      "Answer questions about TUBAL HUB, its actual pages, features, community, gaming, creator tools, " +
      "Payapang Isip, CTRLZONE, Shop, Messenger/Global Chat, Events, News, Profiles, and system updates. " +
      "Do not invent features, links, events, policies, users, counts, or capabilities. " +
      "If the requested information is unavailable, clearly say you do not have that information. " +
      "Do not reveal API keys, environment variables, private server configuration, or internal secrets. " +
      "Keep answers concise and practical. Match the user's language naturally: Tagalog/Taglish for Filipino, " +
      "Cebuano/Bisaya for Cebuano, English for English, and naturally mixed language when the user mixes languages. " +
      "Current page: " + page;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: message }
        ],
        temperature: 0.4,
        max_completion_tokens: 700
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);
      return res.status(502).json({
        error: "AI provider request failed",
        providerStatus: response.status,
        providerMessage: String(data?.error?.message || "Unknown Groq API error")
      });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({ error: "Groq returned an empty response" });
    }

    return res.status(200).json({
      reply,
      provider: "groq",
      model
    });
  } catch (error) {
    console.error("Groq AI backend error:", error);
    return res.status(500).json({ error: "AI backend error" });
  }
}
