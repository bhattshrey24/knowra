// Verifies real question generation with your key, using the SAME request shape
// as src/lib/llm/gemini.ts (generateContent + JSON-schema structured output).
// Prints a real generated question or the exact error.
//
// Run: `node --env-file=.env.local scripts/check-llm.mjs`
// Tip: if one model is congested, `GET /v1beta/models` lists what your key can
// use; set GEMINI_MODEL to a fast `*-flash-lite-*` one.

const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const TIMEOUT_MS = 30_000;

console.log(`Knowra LLM check — model: ${model}, key present: ${key ? "yes" : "NO"}`);
if (!key || key === "your-gemini-key") {
  console.error("✗ GOOGLE_GENERATIVE_AI_API_KEY is not set in .env.local.");
  process.exit(1);
}

const schema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      prompt: { type: "STRING" },
      options: { type: "ARRAY", items: { type: "STRING" } },
      correctIndex: { type: "INTEGER" },
      explanation: { type: "STRING" },
    },
    required: ["prompt", "options", "correctIndex", "explanation"],
  },
};
const body = JSON.stringify({
  contents: [
    {
      parts: [
        { text: "Generate 2 multiple-choice questions on basic arithmetic, 4 options each." },
      ],
    },
  ],
  generationConfig: { responseMimeType: "application/json", responseSchema: schema },
});
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
const started = Date.now();
console.log(`→ Requesting (timeout ${TIMEOUT_MS / 1000}s)…`);

try {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body,
    signal: controller.signal,
  });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const text = await res.text();
  console.log(`← HTTP ${res.status} in ${secs}s`);
  if (!res.ok) {
    console.error(`\n✗ ${text.slice(0, 400)}`);
    process.exit(2);
  }
  const out = JSON.parse(text)
    ?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "")
    .join("");
  const parsed = JSON.parse(out);
  console.log(`\n✓ Generated ${parsed.length} real question(s). Sample: ${parsed[0]?.prompt}`);
  console.log("Real questions work. Set the same env in Vercel + redeploy for the live site.");
} catch (err) {
  console.error(
    err?.name === "AbortError"
      ? `\n✗ Timed out after ${TIMEOUT_MS / 1000}s`
      : `\n✗ ${err?.message || err}`,
  );
  process.exit(3);
} finally {
  clearTimeout(timer);
}
process.exit(0);
