// Verifies the Gemini LLM path end-to-end with your key, using the SAME request
// shape as src/lib/llm/gemini.ts (structured JSON output). Prints a real
// generated question or the exact error — so you can confirm real questions
// will work before relying on them in the UI.
//
// Run: `node --env-file=.env.local scripts/check-llm.mjs`
// (Set LLM_PROVIDER=gemini and GOOGLE_GENERATIVE_AI_API_KEY in .env.local first.)

const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

if (!key || key === "your-gemini-key") {
  console.error("✗ GOOGLE_GENERATIVE_AI_API_KEY is not set in .env.local.");
  console.error("  Get a free key at https://aistudio.google.com/apikey");
  process.exit(1);
}
if ((process.env.LLM_PROVIDER || "").toLowerCase() !== "gemini") {
  console.error("! LLM_PROVIDER is not 'gemini' — the app will still use the mock provider.");
  console.error("  Set LLM_PROVIDER=gemini in .env.local (and in Vercel) to get real questions.\n");
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
const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
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

if (!res.ok) {
  console.error(`✗ Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  process.exit(2);
}

const json = await res.json();
const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
let parsed;
try {
  parsed = JSON.parse(text);
} catch {
  console.error(`✗ Model returned non-JSON content: ${text.slice(0, 200)}`);
  process.exit(3);
}

if (!Array.isArray(parsed) || parsed.length === 0) {
  console.error("✗ Expected a non-empty array of questions.");
  process.exit(3);
}

console.log(`✓ Gemini (${model}) generated ${parsed.length} real question(s). Sample:`);
console.log(`  Q: ${parsed[0].prompt}`);
console.log(`  Options: ${JSON.stringify(parsed[0].options)}`);
console.log(`  Correct index: ${parsed[0].correctIndex}`);
console.log("\nReal questions are ready. Set the same env in Vercel + redeploy for the live site.");
