"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearAdminSession,
  createAdminSession,
  credentialsAreValid,
  getAdminSession,
} from "@/lib/auth";
import { encryptSecret, runDiscoveryAgent } from "@/lib/ai-agent";
import {
  createComment,
  createContactMessage,
  deleteAIProvider,
  deleteArtist,
  deleteSong,
  moderateComment,
  saveAIProvider,
  saveArtist,
  saveSong,
  setAIProviderEnabled,
  type SongInput,
} from "@/lib/repository";
import type { AIProvider, Comment, LyricVersion, PlatformLink } from "@/lib/types";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  if (!(await credentialsAreValid(email, password))) {
    redirect("/admin/login?error=Invalid%20email%20or%20password");
  }
  await createAdminSession(email);
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

const songSchema = z.object({
  title: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(200).optional(),
  alternateTitle: z.string().trim().max(180).optional(),
  description: z.string().trim().min(20).max(2000),
  releaseYear: z.coerce.number().int().min(1000).max(new Date().getFullYear() + 2),
  language: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(80),
  genre: z.string().trim().min(2).max(80),
  status: z.enum(["draft", "review", "published", "archived"]),
});

function parseLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function saveSongAction(formData: FormData) {
  await requireAdmin();
  const parsed = songSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") || undefined,
    alternateTitle: formData.get("alternateTitle") || undefined,
    description: formData.get("description"),
    releaseYear: formData.get("releaseYear"),
    language: formData.get("language"),
    category: formData.get("category"),
    genre: formData.get("genre"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const lyrics: LyricVersion[] = [];
  const lyricsJson = String(formData.get("lyricsJson") || "");
  if (lyricsJson) {
    try {
      const values = JSON.parse(lyricsJson) as LyricVersion[];
      lyrics.push(
        ...values.filter(
          (item) => item.language?.trim() && item.languageCode?.trim() && item.text?.trim(),
        ),
      );
    } catch {
      throw new Error("Lyric versions could not be parsed");
    }
  }
  const lyricText = String(formData.get("lyricText") || "").trim();
  if (lyricText && !lyrics.length) {
    lyrics.push({
      id: String(formData.get("lyricId") || randomUUID()),
      language: String(formData.get("lyricLanguage") || parsed.data.language),
      languageCode: String(formData.get("lyricLanguageCode") || "en"),
      type: String(formData.get("lyricType") || "original") as LyricVersion["type"],
      text: lyricText,
      source: String(formData.get("lyricSource") || "Editorial submission"),
    });
  }
  const existingLyrics = String(formData.get("existingLyrics") || "");
  if (existingLyrics && !lyricText && !lyrics.length) {
    try {
      lyrics.push(...(JSON.parse(existingLyrics) as LyricVersion[]));
    } catch {
      // A malformed hidden value should not prevent an editor from replacing it.
    }
  }

  let platformLinks = parseLines(String(formData.get("platformLinks") || "")).flatMap(
    (line): PlatformLink[] => {
      const [platform, url] = line.split("|").map((item) => item.trim());
      return platform && /^https:\/\//.test(url || "") ? [{ platform, url }] : [];
    },
  );
  const platformLinksJson = String(formData.get("platformLinksJson") || "");
  if (platformLinksJson) {
    try {
      platformLinks = (JSON.parse(platformLinksJson) as PlatformLink[]).filter(
        (item) => item.platform?.trim() && /^https:\/\//.test(item.url),
      );
    } catch {
      throw new Error("Platform links could not be parsed");
    }
  }

  const input: SongInput = {
    ...parsed.data,
    tags: String(formData.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    artistIds: formData.getAll("artistIds").map(String),
    movieId: String(formData.get("movieId") || "") || undefined,
    lyrics,
    platformLinks,
    featured: formData.get("featured") === "on",
  };
  if (!input.artistIds.length) throw new Error("Select at least one artist");
  if (!input.lyrics.length) throw new Error("Add at least one lyric version");

  const song = await saveSong(input, String(formData.get("id") || "") || undefined);
  revalidatePath("/");
  revalidatePath("/admin/songs");
  redirect(`/admin/songs?notice=${encodeURIComponent(`${song.title} saved`)}`);
}

export async function deleteSongAction(formData: FormData) {
  await requireAdmin();
  await deleteSong(String(formData.get("id")));
  revalidatePath("/");
  revalidatePath("/admin/songs");
}

export async function saveArtistAction(formData: FormData) {
  await requireAdmin();
  const input = z.object({
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().max(140),
    bio: z.string().trim().min(10).max(2000),
  }).parse(Object.fromEntries(formData));
  await saveArtist(
    { name: input.name, slug: input.slug, bio: input.bio },
    String(formData.get("id") || "") || undefined,
  );
  revalidatePath("/admin/artists");
  revalidatePath("/");
}

export async function deleteArtistAction(formData: FormData) {
  await requireAdmin();
  await deleteArtist(String(formData.get("id")));
  revalidatePath("/admin/artists");
}

const commentSchema = z.object({
  songId: z.string().min(1),
  slug: z.string().min(1),
  locale: z.string().regex(/^[a-z]{2}$/),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(180),
  body: z.string().trim().min(3).max(1500),
});

export async function submitCommentAction(formData: FormData) {
  if (formData.get("website")) return;
  const result = commentSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) throw new Error("Please check your comment details");
  await createComment(result.data);
  revalidatePath(`/${result.data.locale}/lyrics/${result.data.slug}`);
  redirect(`/${result.data.locale}/lyrics/${result.data.slug}?comment=pending#comments`);
}

export async function moderateCommentAction(formData: FormData) {
  await requireAdmin();
  await moderateComment(
    String(formData.get("id")),
    String(formData.get("status")) as Comment["status"],
  );
  revalidatePath("/admin/comments");
}

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(180),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(3000),
});

export async function submitContactAction(formData: FormData) {
  if (formData.get("website")) return;
  const result = contactSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) throw new Error("Please complete every field correctly");
  await createContactMessage(result.data);
  redirect("/en/contact?sent=true");
}

const providerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  provider: z.enum(["gemini", "openai", "anthropic", "custom"]),
  model: z.string().trim().min(2).max(120),
  apiKey: z.string().trim().min(8).max(500),
  baseUrl: z.union([z.literal(""), z.string().url().startsWith("https://")]),
  dailyLimit: z.coerce.number().int().min(1).max(1000),
});

export async function saveProviderAction(formData: FormData) {
  await requireAdmin();
  const result = providerSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) throw new Error(result.error.issues.map((issue) => issue.message).join(", "));
  const provider: AIProvider = {
    id: randomUUID(),
    name: result.data.name,
    provider: result.data.provider,
    model: result.data.model,
    encryptedApiKey: encryptSecret(result.data.apiKey),
    baseUrl: result.data.baseUrl || undefined,
    dailyLimit: result.data.dailyLimit,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  await saveAIProvider(provider);
  revalidatePath("/admin/ai");
  redirect("/admin/ai?notice=Provider%20saved");
}

export async function toggleProviderAction(formData: FormData) {
  await requireAdmin();
  await setAIProviderEnabled(String(formData.get("id")), formData.get("enabled") === "true");
  revalidatePath("/admin/ai");
}

export async function deleteProviderAction(formData: FormData) {
  await requireAdmin();
  await deleteAIProvider(String(formData.get("id")));
  revalidatePath("/admin/ai");
}

export async function runAIAction() {
  await requireAdmin();
  await runDiscoveryAgent("manual");
  revalidatePath("/admin/ai");
}
