import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import type { AIProvider, AIRun } from "@/lib/types";
import { listAIProviders, saveAIRun } from "@/lib/repository";

type DiscoveryResult = {
  title: string;
  artists: string[];
  releaseYear: number;
  language: string;
  genre?: string;
  movie?: string;
  officialSourceUrl: string;
  description: string;
};

function encryptionKey() {
  const source = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!source && process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY must be configured in production");
  }
  return createHash("sha256").update(source || "lyricspro-local-encryption-key").digest();
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

const discoveryPrompt = `You are a music metadata research assistant for LyricsPro.
Find up to five songs officially released in the last seven days.
Use only official artist, label, movie studio, music platform, or rights-holder sources.
Do not return lyrics, lyric excerpts, fan transcriptions, rumors, or inferred credits.
Return a JSON array with: title, artists (array), releaseYear, language, genre,
movie (optional), officialSourceUrl, and a concise factual description.
Every item must have one directly supporting officialSourceUrl.`;

function parseDiscovery(text: string): DiscoveryResult[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end < start) return [];
  const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is DiscoveryResult => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.title === "string" &&
        Array.isArray(candidate.artists) &&
        candidate.artists.every((artist) => typeof artist === "string") &&
        typeof candidate.releaseYear === "number" &&
        typeof candidate.language === "string" &&
        typeof candidate.officialSourceUrl === "string" &&
        /^https:\/\//.test(candidate.officialSourceUrl) &&
        typeof candidate.description === "string"
      );
    })
    .slice(0, 5);
}

async function callGemini(provider: AIProvider, apiKey: string) {
  const base = provider.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
  const response = await fetch(
    `${base}/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: discoveryPrompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(45_000),
    },
  );
  if (!response.ok) throw new Error(`Gemini request failed with ${response.status}`);
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
}

async function callOpenAI(provider: AIProvider, apiKey: string) {
  const base = provider.baseUrl || "https://api.openai.com";
  const response = await fetch(`${base}/v1/responses`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
      tools: [{ type: "web_search" }],
      input: discoveryPrompt,
    }),
    signal: AbortSignal.timeout(45_000),
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

async function callCompatible(provider: AIProvider, apiKey: string) {
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
      messages: [{ role: "user", content: discoveryPrompt }],
      max_tokens: 3000,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(45_000),
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

export async function runDiscoveryAgent(source: AIRun["source"] = "manual") {
  const run: AIRun = {
    id: randomUUID(),
    status: "running",
    source,
    summary: "Researching official music sources…",
    candidates: 0,
    createdAt: new Date().toISOString(),
  };
  await saveAIRun(run);

  try {
    const provider = (await listAIProviders()).find((item) => item.enabled);
    if (!provider) throw new Error("No enabled AI provider is configured");
    run.providerId = provider.id;
    const apiKey = decryptSecret(provider.encryptedApiKey);
    const text =
      provider.provider === "gemini"
        ? await callGemini(provider, apiKey)
        : provider.provider === "openai"
          ? await callOpenAI(provider, apiKey)
          : await callCompatible(provider, apiKey);
    const discoveries = parseDiscovery(text);
    run.status = "needs_review";
    run.candidates = discoveries.length;
    run.summary = `Found ${discoveries.length} metadata candidate${discoveries.length === 1 ? "" : "s"} for editorial review.`;
    run.details = JSON.stringify(discoveries, null, 2);
  } catch (error) {
    run.status = "failed";
    run.summary = error instanceof Error ? error.message : "The discovery run failed";
  }
  run.finishedAt = new Date().toISOString();
  await saveAIRun(run);
  return run;
}
