// Verifies the local Ollama daemon can generate structured questions, using the
// same /api/chat + JSON-schema request shape as src/lib/llm/ollama.ts.
//
// Run: `node --env-file=.env.local scripts/check-ollama.mjs`
// (Needs `ollama serve` running and the model pulled: `ollama pull <model>`.)

const base = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const model = process.env.OLLAMA_MODEL || "llama3.2";
console.log(`Knowra Ollama check — base: ${base}, model: ${model}`);

async function withTimeout(url, init, ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

// 1) Daemon up?
try {
  const v = await withTimeout(`${base}/api/version`, {}, 5000);
  console.log(`→ daemon: HTTP ${v.status} ${(await v.text()).slice(0, 80)}`);
} catch {
  console.error(`✗ No Ollama daemon at ${base}. Start it with: ollama serve`);
  process.exit(1);
}

// 2) Structured generation.
const schema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      prompt: { type: "string" },
      options: { type: "array", items: { type: "string" } },
      correctIndex: { type: "integer" },
      explanation: { type: "string" },
    },
    required: ["prompt", "options", "correctIndex", "explanation"],
  },
};
console.log("→ generating (first call loads the model; can take a while)…");
const started = Date.now();
try {
  const res = await withTimeout(
    `${base}/api/chat`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: schema,
        messages: [
          {
            role: "user",
            content:
              "Generate 2 multiple-choice questions on basic arithmetic, 4 options each. Respond as a JSON array.",
          },
        ],
      }),
    },
    120_000,
  );
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const text = await res.text();
  if (!res.ok) {
    console.error(`✗ HTTP ${res.status} in ${secs}s: ${text.slice(0, 300)}`);
    console.error(`  If the model is missing: ollama pull ${model}`);
    process.exit(2);
  }
  const content = JSON.parse(text)?.message?.content ?? "";
  const parsed = JSON.parse(content);
  console.log(`✓ generated ${parsed.length} question(s) in ${secs}s. Sample: ${parsed[0]?.prompt}`);
  console.log(
    `\nSet LLM_PROVIDER="ollama" (and OLLAMA_MODEL="${model}") in .env.local, restart dev.`,
  );
} catch (err) {
  console.error(
    err?.name === "AbortError"
      ? "✗ Timed out (model too slow — try a smaller OLLAMA_MODEL)"
      : `✗ ${err?.message || err}`,
  );
  process.exit(3);
}
process.exit(0);
