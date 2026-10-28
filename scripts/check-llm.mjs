// Verifies the Gemini LLM path end-to-end with your key, using the SAME request
// shape as src/lib/llm/gemini.ts (structured JSON output). Prints a real
// generated question or the exact error.
//
// Run: `node --env-file=.env.local scripts/check-llm.mjs`
// (Set LLM_PROVIDER=gemini and GOOGLE_GENERATIVE_AI_API_KEY in .env.local first.)

const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const TIMEOUT_MS = 30_000;

console.log("Knowra LLM check");
console.log(`  model:        ${model}`);
console.log(`  key present:  ${key ? "yes" : "NO"}`);
console.log(`  LLM_PROVIDER: ${process.env.LLM_PROVIDER || "(unset)"}`);

if (!key || key === "your-gemini-key") {
  console.error("\n✗ GOOGLE_GENERATIVE_AI_API_KEY is not set in .env.local.");
  console.error("  Get a free key at https://aistudio.google.com/apikey");
  process.exit(1);
}

const responseSchema = {
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

const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
console.log(`\n→ Requesting ${model} (timeout ${TIMEOUT_MS / 1000}s)…`);

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

try {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: "Generate 2 multiple-choice questions on basic arithmetic. Each has exactly 4 options and one correct answer.",
            },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json", responseSchema },
    }),
  });

  console.log(`← HTTP ${res.status}`);
  const bodyText = await res.text();

  if (!res.ok) {
    console.error(`\n✗ Gemini error: ${bodyText.slice(0, 500)}`);
    process.exit(2);
  }

  const json = JSON.parse(bodyText);
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("empty question array");

  console.log(`\n✓ ${model} generated ${parsed.length} real question(s). Sample:`);
  console.log(`  Q: ${parsed[0].prompt}`);
  console.log(`  Options: ${JSON.stringify(parsed[0].options)}`);
  console.log(`  Correct index: ${parsed[0].correctIndex}`);
  console.log("\nReal questions work. Set the same env in Vercel + redeploy for the live site.");
} catch (err) {
  if (err?.name === "AbortError") {
    console.error(`\n✗ Timed out after ${TIMEOUT_MS / 1000}s with no response.`);
    console.error(
      "  Likely a network/proxy/firewall block reaching generativelanguage.googleapis.com.",
    );
  } else {
    console.error(`\n✗ ${err?.message || err}`);
  }
  process.exit(3);
} finally {
  clearTimeout(timer);
}

// Node's global fetch (undici) can keep the process alive via its socket pool.
process.exit(0);
