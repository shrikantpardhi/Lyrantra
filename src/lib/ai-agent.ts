import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { parseDiscovery, serializeRunDetails, DISCOVERY_JSON_SCHEMA } from "@/lib/ai-discovery";
import type { AIProvider, AIRun } from "@/lib/types";
import { getAIRunById, listAIProviders, saveAIRun } from "@/lib/repository";

/** Provider calls with search grounding often need more than a short request window. */
const PROVIDER_TIMEOUT_MS = 120_000;

function encryptionKey() {
  const source = process.env.ENCRYPTION_KEY;
  if (!source && process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY must be configured in production");
  }
  // Local-only fallback; production requires ENCRYPTION_KEY (never AUTH_SECRET).
  return createHash("sha256")
    .update(source || process.env.AUTH_SECRET || "lyranta-local-encryption-key")
    .digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((item) => item.toString("base64url")).join(".");
}

export function decryptSecret(value: string) {
  const [iv, tag, encrypted] = value.split(".").map((item) => Buffer.from(item, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function discoveryPrompt(limit: number) {
  return `You are a music metadata and meaning research assistant for Lyranta.
Find up to ${limit} songs officially released in the last seven days.
Use only official artist, label, movie studio, music platform, or rights-holder sources.

Return the most COMPLETE catalog draft possible for editorial review.
Every object MUST follow this JSON shape:
${DISCOVERY_JSON_SCHEMA}

Rules:
- Fill every field you can verify from official/public sources.
- artists must include short bios when available.
- platformLinks should include Spotify, Apple Music, YouTube Music, or official pages when available (HTTPS only).
- interpretation is REQUIRED: rich summary, at least 3 themes, culturalContext, and at least 3 section meanings (Verse/Chorus/Bridge style) without quoting lyrics.
- lyricEditions describe which language versions editors should prepare later, with source notes — never include lyric text, excerpts, reconstructions, or fan transcriptions.
- Do NOT return lyrics, lyric excerpts, paraphrased verses, rumors, or inferred private credits.
- Every item needs one directly supporting officialSourceUrl.
- Respond with a JSON array only.`;
}

function providerErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "The discovery run failed";
  if (error.name === "TimeoutError" || /aborted due to timeout|timed out|TimeoutError/i.test(error.message)) {
    return "The AI provider took too long to respond. The run timed out — try again or lower candidates per run.";
  }
  if (error.name === "AbortError") {
    return "The AI provider request was aborted before it finished.";
  }
  return error.message || "The discovery run failed";
}

async function callGemini(provider: AIProvider, apiKey: string, prompt: string) {
  const base = provider.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
  const response = await fetch(
    `${base}/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    },
  );
  if (!response.ok) throw new Error(`Gemini request failed with ${response.status}`);
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
}

async function callOpenAI(provider: AIProvider, apiKey: string, prompt: string) {
  const base = provider.baseUrl || "https://api.openai.com";
  const response = await fetch(`${base}/v1/responses`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
      tools: [{ type: "web_search" }],
      input: prompt,
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OpenAI request failed with ${response.status}`);
  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  return (
    payload.output_text ||
    payload.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join("") ||
    ""
  );
}

async function callCompatible(provider: AIProvider, apiKey: string, prompt: string) {
  if (!provider.baseUrl) throw new Error("A base URL is required for this provider");
  const response = await fetch(provider.baseUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "x-api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 3000,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Provider request failed with ${response.status}`);
  const payload = (await response.json()) as {
    content?: string | Array<{ text?: string }>;
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (typeof payload.content === "string") return payload.content;
  if (Array.isArray(payload.content)) return payload.content.map((item) => item.text || "").join("");
  return payload.choices?.[0]?.message?.content || "";
}

/** Create a queued run immediately so the admin request can return without waiting on the provider. */
export async function enqueueDiscoveryRun() {
  const provider = (await listAIProviders()).find((item) => item.enabled);
  if (!provider) throw new Error("No enabled AI provider is configured");

  const run: AIRun = {
    id: randomUUID(),
    providerId: provider.id,
    status: "queued",
    source: "manual",
    summary: "Queued — research will start in the background…",
    candidates: 0,
    createdAt: new Date().toISOString(),
  };
  await saveAIRun(run);
  return run;
}

/** Execute a previously queued run. Safe to call from `after()` so the HTTP response is not blocked. */
export async function executeDiscoveryRun(runId: string) {
  const existing = await getAIRunById(runId);
  if (!existing) return;

  const run: AIRun = {
    ...existing,
    status: "running",
    summary: "Researching official music sources…",
  };
  await saveAIRun(run);

  try {
    const provider = (await listAIProviders()).find((item) => item.id === run.providerId && item.enabled)
      || (await listAIProviders()).find((item) => item.enabled);
    if (!provider) throw new Error("No enabled AI provider is configured");
    run.providerId = provider.id;
    const apiKey = decryptSecret(provider.encryptedApiKey);
    const candidateLimit = Math.min(20, Math.max(1, provider.dailyLimit));
    const prompt = discoveryPrompt(candidateLimit);
    const text =
      provider.provider === "gemini"
        ? await callGemini(provider, apiKey, prompt)
        : provider.provider === "openai"
          ? await callOpenAI(provider, apiKey, prompt)
          : await callCompatible(provider, apiKey, prompt);
    if (!text.trim()) throw new Error("The provider returned an empty response");
    const discoveries = parseDiscovery(text, candidateLimit);
    if (!discoveries.length) {
      run.status = "failed";
      run.summary = "The provider responded, but no valid metadata candidates were found.";
      run.details = text.slice(0, 4000);
      run.candidates = 0;
    } else {
      run.status = "needs_review";
      run.candidates = discoveries.length;
      run.summary = `Found ${discoveries.length} metadata candidate${discoveries.length === 1 ? "" : "s"} for editorial review.`;
      run.details = serializeRunDetails(discoveries);
    }
  } catch (error) {
    run.status = "failed";
    run.summary = providerErrorMessage(error);
    run.candidates = 0;
  }
  run.finishedAt = new Date().toISOString();
  await saveAIRun(run);
  return run;
}

/** @deprecated Prefer enqueueDiscoveryRun + executeDiscoveryRun for non-blocking admin UX. */
export async function runDiscoveryAgent() {
  const run = await enqueueDiscoveryRun();
  return executeDiscoveryRun(run.id);
}
