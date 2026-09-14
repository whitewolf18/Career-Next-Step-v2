// supabase/functions/ai-assistant/index.ts
var OPENAI_URL = "https://api.openai.com/v1/chat/completions";
var MODEL = "gpt-4o-mini";
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}
var SYSTEM_PROMPT = `You are "Nexi", the friendly AI career assistant inside the
Career Next Step app \u2014 a Richfield/AAA graduate employability platform. You help
students and alumni with: profile completeness, CVs, interview preparation,
job-search strategy, and how to use the app (Jobs, Feed, Network, Messages,
Events, Pathways, Analytics). Alumni must be verified by an admin; businesses
must be approved before posting jobs. Be concise, warm and practical. Use
short paragraphs or bullet points. Never invent job listings or users.`;
var PROFILE_PROMPT = `You extract structured data for a graduate profile from
CV text or free text. Return ONLY valid JSON (no markdown) shaped exactly like:
{"summary": string (2-3 sentence professional summary),
 "skills": [string, ...] (max 12, Title Case),
 "experience": [{"title": string, "company": string, "period": string}],
 "suggestions": [string, ...] (max 5 short, actionable profile improvements)}`;
async function callOpenAI(messages) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return {
      error: "OPENAI_API_KEY is not configured. Run: supabase secrets set OPENAI_API_KEY=sk-...",
      status: 500
    };
  }
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.6,
      max_tokens: 700
    })
  });
  if (!res.ok) {
    const detail = await res.text();
    return { error: `AI provider error (${res.status}): ${detail.slice(0, 300)}`, status: 502 };
  }
  const data = await res.json();
  return { content: data?.choices?.[0]?.message?.content ?? "" };
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (body.mode === "profile") {
    const text = (body.text ?? "").slice(0, 8e3);
    if (!text.trim()) return json({ error: "Provide CV text to analyse." }, 400);
    const result2 = await callOpenAI([
      { role: "system", content: PROFILE_PROMPT },
      { role: "user", content: text }
    ]);
    if (result2.error) return json({ error: result2.error }, result2.status);
    let parsed;
    try {
      parsed = JSON.parse(result2.content.replace(/```json|```/g, "").trim());
    } catch {
      return json({ error: "Could not parse AI response. Try again.", raw: result2.content }, 502);
    }
    return json({ profile: parsed });
  }
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(body.messages ?? []).filter((m) => m && m.content).slice(-12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content.slice(0, 2e3) }))
  ];
  const result = await callOpenAI(messages);
  if (result.error) return json({ error: result.error }, result.status);
  return json({ reply: result.content });
});
