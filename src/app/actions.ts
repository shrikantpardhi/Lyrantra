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
import { encryptSecret, enqueueDiscoveryRun, executeDiscoveryRun } from "@/lib/ai-agent";
import {
  candidateHasInterpretation,
  candidateHasLyrics,
  duplicateKeyForCandidate,
  ensureDescription,
  findCatalogDuplicate,
  finalizeRunStatus,
  formatDiscoveryCriteria,
  normalizeDiscoveryCriteria,
  parseRunDetails,
  parseRunPayload,
  serializeRunDetails,
  toSongInterpretation,
  toSongLyrics,
  toSongPlatformLinks,
  type DiscoveryCandidate,
} from "@/lib/ai-discovery";
import {
  createComment,
  createContactMessage,
  deleteAIProvider,
  deleteAIRun,
  deleteAIRuns,
  deleteArtist,
  deleteSong,
  getAIRunById,
  getSongById,
  listAIRuns,
  listArtists,
  listCatalogSongsForDedup,
  listMovies,
  moderateComment,
  resolveUniqueSongSlug,
  saveAIProvider,
  saveAIRun,
  saveArtist,
  saveMovie,
  saveSong,
  setAIProviderEnabled,
  slugify,
  type SongInput,
} from "@/lib/repository";
import type {
  AIProvider,
  Comment,
  LyricVersion,
  PlatformLink,
  SongInterpretation,
} from "@/lib/types";

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

const interpretationSectionSchema = z.object({
  id: z.string().trim().min(1).max(100),
  label: z.string().trim().max(100),
  meaning: z.string().trim().max(4000),
}).refine(
  (section) => (!section.label && !section.meaning) || Boolean(section.label && section.meaning),
  { message: "Each interpretation section needs both a label and an explanation" },
);

const interpretationSchema = z.object({
  status: z.enum(["draft", "review", "published"]),
  summary: z.string().trim().max(4000),
  themes: z.array(z.string().trim().min(1).max(80)).max(12),
  sections: z.array(interpretationSectionSchema).max(20),
  culturalContext: z.string().trim().max(4000),
  sourceUrl: z.union([
    z.literal(""),
    z.string().trim().url().regex(/^https:\/\//, "The interpretation source must use HTTPS"),
  ]).optional(),
  disclaimer: z.string().trim().max(1000),
}).superRefine((interpretation, context) => {
  if (interpretation.status !== "published") return;
  if (interpretation.summary.length < 20) {
    context.addIssue({
      code: "custom",
      path: ["summary"],
      message: "A published interpretation needs a summary of at least 20 characters",
    });
  }
  if (interpretation.disclaimer.length < 20) {
    context.addIssue({
      code: "custom",
      path: ["disclaimer"],
      message: "A published interpretation needs an editorial disclaimer",
    });
  }
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

  let interpretation: SongInterpretation | undefined;
  const interpretationJson = String(formData.get("interpretationJson") || "");
  if (interpretationJson) {
    let value: unknown;
    try {
      value = JSON.parse(interpretationJson);
    } catch {
      throw new Error("Meaning and interpretation could not be parsed");
    }
    const result = interpretationSchema.safeParse(value);
    if (!result.success) {
      throw new Error(result.error.issues.map((issue) => issue.message).join(", "));
    }
    const normalized = {
      ...result.data,
      themes: [...new Set(result.data.themes.map((theme) => theme.trim()))],
      sections: result.data.sections.filter((section) => section.label && section.meaning),
      sourceUrl: result.data.sourceUrl || undefined,
    };
    const hasContent = Boolean(
      normalized.summary ||
      normalized.themes.length ||
      normalized.sections.length ||
      normalized.culturalContext ||
      normalized.sourceUrl
    );
    if (hasContent) interpretation = normalized;
  }

  const artworkRaw = String(formData.get("artwork") || "").trim();
  const artwork = artworkRaw
    ? /^https:\/\//i.test(artworkRaw)
      ? artworkRaw
      : (() => {
          throw new Error("Artwork must be an HTTPS URL");
        })()
    : undefined;

  const input: SongInput = {
    ...parsed.data,
    tags: String(formData.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    artistIds: formData.getAll("artistIds").map(String),
    movieId: String(formData.get("movieId") || "") || undefined,
    artwork,
    lyrics,
    platformLinks,
    interpretation,
    featured: formData.get("featured") === "on",
  };
  if (!input.artistIds.length) throw new Error("Select at least one artist");
  if (!input.lyrics.length) throw new Error("Add at least one lyric version");
  if (input.status === "published") {
    const hasLyricText = input.lyrics.some((lyric) => lyric.text.trim().length > 0);
    if (!hasLyricText) throw new Error("Published songs need at least one lyric version with text");
    if (!interpretation || interpretation.status !== "published") {
      throw new Error("Published songs need a published meaning/interpretation");
    }
  }

  const song = await saveSong(input, String(formData.get("id") || "") || undefined);
  revalidatePath("/en");
  revalidatePath(`/en/lyrics/${song.slug}`);
  revalidatePath(`/en/category/${slugify(song.category)}`);
  revalidatePath(`/en/genre/${slugify(song.genre)}`);
  revalidatePath(`/en/language/${slugify(song.language)}`);
  revalidatePath(`/en/year/${song.releaseYear}`);
  song.tags.forEach((tag) => revalidatePath(`/en/tag/${slugify(tag)}`));
  song.artists.forEach((artist) => revalidatePath(`/en/artist/${artist.slug}`));
  if (song.movie) revalidatePath(`/en/movie/${song.movie.slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/songs");
  redirect(`/admin/songs?notice=${encodeURIComponent(`${song.title} saved`)}`);
}

export async function deleteSongAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const song = await getSongById(id);
  await deleteSong(id);
  revalidatePath("/en");
  if (song) {
    revalidatePath(`/en/lyrics/${song.slug}`);
    song.artists.forEach((artist) => revalidatePath(`/en/artist/${artist.slug}`));
    if (song.movie) revalidatePath(`/en/movie/${song.movie.slug}`);
  }
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/songs");
  redirect(`/admin/songs?notice=${encodeURIComponent(song ? `${song.title} deleted` : "Song deleted")}`);
}

export async function saveArtistAction(formData: FormData) {
  await requireAdmin();
  const input = z.object({
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().max(140),
    bio: z.string().trim().min(10).max(2000),
  }).parse(Object.fromEntries(formData));
  const artist = await saveArtist(
    {
      name: input.name,
      slug: input.slug,
      bio: input.bio,
      featured: formData.get("featured") === "on",
    },
    String(formData.get("id") || "") || undefined,
  );
  revalidatePath("/admin/artists");
  revalidatePath("/en");
  revalidatePath(`/en/artist/${artist.slug}`);
  revalidatePath("/sitemap.xml");
  redirect(`/admin/artists?notice=${encodeURIComponent(`${artist.name} saved`)}`);
}

export async function deleteArtistAction(formData: FormData) {
  await requireAdmin();
  await deleteArtist(String(formData.get("id")));
  revalidatePath("/admin/artists");
  revalidatePath("/sitemap.xml");
  redirect("/admin/artists?notice=Artist%20deleted");
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
  const status = String(formData.get("status")) as Comment["status"];
  await moderateComment(String(formData.get("id")), status);
  revalidatePath("/admin/comments");
  revalidatePath("/admin");
  redirect(
    `/admin?notice=${encodeURIComponent(
      status === "approved" ? "Comment approved" : "Comment rejected",
    )}`,
  );
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
  dailyLimit: z.coerce.number().int().min(1).max(5),
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
  const enabled = formData.get("enabled") === "true";
  await setAIProviderEnabled(String(formData.get("id")), enabled);
  revalidatePath("/admin/ai");
  redirect(`/admin/ai?notice=${encodeURIComponent(enabled ? "Provider enabled" : "Provider paused")}`);
}

export async function deleteProviderAction(formData: FormData) {
  await requireAdmin();
  await deleteAIProvider(String(formData.get("id")));
  revalidatePath("/admin/ai");
  redirect("/admin/ai?notice=Provider%20removed");
}

export async function deleteAIRunAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Research run not found");
  const run = await getAIRunById(id);
  if (run && (run.status === "queued" || run.status === "running")) {
    redirect("/admin/ai?notice=Wait%20for%20the%20active%20run%20to%20finish%20before%20deleting");
  }
  await deleteAIRun(id);
  revalidatePath("/admin/ai");
  revalidatePath("/admin");
  redirect("/admin/ai?notice=Research%20run%20deleted");
}

export async function deleteFinishedAIRunsAction() {
  await requireAdmin();
  const runs = await listAIRuns(200);
  const finishedIds = runs
    .filter((run) => run.status === "completed" || run.status === "failed")
    .map((run) => run.id);
  const deleted = await deleteAIRuns(finishedIds);
  revalidatePath("/admin/ai");
  revalidatePath("/admin");
  redirect(
    `/admin/ai?notice=${encodeURIComponent(
      deleted ? `Deleted ${deleted} finished run${deleted === 1 ? "" : "s"}` : "No finished runs to delete",
    )}`,
  );
}

export async function bulkDeleteAIRunsAction(formData: FormData) {
  await requireAdmin();
  const ids = formData.getAll("runId").map(String).filter(Boolean);
  const runs = await listAIRuns(200);
  const active = new Set(
    runs.filter((run) => run.status === "queued" || run.status === "running").map((run) => run.id),
  );
  const deletable = ids.filter((id) => !active.has(id));
  const deleted = await deleteAIRuns(deletable);
  revalidatePath("/admin/ai");
  revalidatePath("/admin");
  redirect(
    `/admin/ai?notice=${encodeURIComponent(
      deleted
        ? `Deleted ${deleted} research run${deleted === 1 ? "" : "s"}`
        : "No deletable runs selected (active runs cannot be deleted)",
    )}`,
  );
}

export async function runAIAction(formData: FormData) {
  await requireAdmin();
  const { after } = await import("next/server");
  const currentYear = new Date().getFullYear();
  const yearFromRaw = String(formData.get("yearFrom") || "").trim();
  const yearToRaw = String(formData.get("yearTo") || "").trim();
  const yearFrom = yearFromRaw ? Number(yearFromRaw) : undefined;
  const yearTo = yearToRaw ? Number(yearToRaw) : undefined;
  if (yearFrom !== undefined && (!Number.isInteger(yearFrom) || yearFrom < 1900 || yearFrom > currentYear + 2)) {
    throw new Error("Year from must be a valid release year");
  }
  if (yearTo !== undefined && (!Number.isInteger(yearTo) || yearTo < 1900 || yearTo > currentYear + 2)) {
    throw new Error("Year to must be a valid release year");
  }
  if (yearFrom !== undefined && yearTo !== undefined && yearFrom > yearTo) {
    throw new Error("Year from cannot be after year to");
  }

  const criteria = normalizeDiscoveryCriteria({
    market: formData.get("market"),
    yearFrom,
    yearTo,
    language: formData.get("language"),
    genre: formData.get("genre"),
    category: formData.get("category"),
    artist: formData.get("artist"),
    keywords: formData.get("keywords"),
    notes: formData.get("notes"),
  });

  const run = await enqueueDiscoveryRun(criteria);
  after(async () => {
    try {
      await executeDiscoveryRun(run.id);
    } catch {
      // executeDiscoveryRun already persists failure state when possible
    }
  });
  revalidatePath("/admin/ai");
  revalidatePath("/admin");
  const brief = formatDiscoveryCriteria(criteria);
  redirect(
    `/admin/ai?notice=${encodeURIComponent(
      brief ? `Research started for ${brief}` : "Research started in the background",
    )}`,
  );
}

async function resolveArtistIds(candidate: DiscoveryCandidate) {
  const existing = await listArtists();
  const ids: string[] = [];
  const details =
    candidate.artistDetails.length > 0
      ? candidate.artistDetails
      : candidate.artists.map((name) => ({ name, bio: undefined as string | undefined }));

  for (const artist of details) {
    const match = existing.find((item) => item.name.toLowerCase() === artist.name.toLowerCase());
    if (match) {
      ids.push(match.id);
      continue;
    }
    const baseSlug = slugify(artist.name);
    const slugTaken = existing.some((item) => item.slug === baseSlug);
    const created = await saveArtist({
      name: artist.name,
      slug: slugTaken ? `${baseSlug}-${randomUUID().slice(0, 8)}` : baseSlug,
      bio:
        artist.bio?.trim() ||
        `${artist.name} was added from AI metadata research. Replace this bio before publishing.`,
    });
    existing.push(created);
    ids.push(created.id);
  }
  return ids;
}

async function resolveMovieId(candidate: DiscoveryCandidate) {
  if (!candidate.movie) return undefined;
  const movies = await listMovies();
  const match = movies.find(
    (movie) =>
      movie.title.toLowerCase() === candidate.movie!.toLowerCase() &&
      (candidate.movieYear === undefined || movie.year === candidate.movieYear),
  );
  if (match) return match.id;

  const year = candidate.movieYear || candidate.releaseYear;
  const baseSlug = slugify(candidate.movie);
  const slugTaken = movies.some((movie) => movie.slug === baseSlug);
  const created = await saveMovie({
    title: candidate.movie,
    slug: slugTaken ? `${baseSlug}-${randomUUID().slice(0, 8)}` : baseSlug,
    year,
    description:
      candidate.movieDescription ||
      `${candidate.movie} (${year}). Added from AI metadata research.`,
  });
  return created.id;
}

async function persistCandidateDecision(
  runId: string,
  index: number,
  decision: "accepted" | "rejected",
  songId?: string,
) {
  const run = await getAIRunById(runId);
  if (!run) throw new Error("Research run not found");
  const { candidates, criteria } = parseRunPayload(run.details);
  const candidate = candidates[index];
  if (!candidate) throw new Error("Candidate not found");
  if (candidate.reviewStatus !== "pending") throw new Error("This candidate was already reviewed");

  candidates[index] = {
    ...candidate,
    reviewStatus: decision,
    songId: decision === "accepted" ? songId : candidate.songId,
  };
  const pending = candidates.filter((item) => item.reviewStatus === "pending").length;
  const accepted = candidates.filter((item) => item.reviewStatus === "accepted").length;
  const rejected = candidates.filter((item) => item.reviewStatus === "rejected").length;
  run.details = serializeRunDetails(candidates, criteria);
  run.status = finalizeRunStatus(candidates);
  run.summary =
    run.status === "completed"
      ? `Review complete: ${accepted} accepted, ${rejected} rejected.`
      : `${pending} candidate${pending === 1 ? "" : "s"} still need review (${accepted} accepted, ${rejected} rejected).`;
  run.finishedAt = new Date().toISOString();
  await saveAIRun(run);
  return { run, candidate: candidates[index] };
}

function parseSelectionKeys(formData: FormData) {
  return formData
    .getAll("selection")
    .map((value) => String(value))
    .map((value) => {
      const [runId, indexRaw] = value.split(":");
      const index = Number(indexRaw);
      if (!runId || !Number.isInteger(index) || index < 0) return undefined;
      return { runId, index };
    })
    .filter((item): item is { runId: string; index: number } => Boolean(item));
}

async function isCanonicalPendingCandidate(
  candidate: DiscoveryCandidate,
  exclude: { runId: string; index: number },
) {
  const runs = await listAIRuns(200);
  const key = duplicateKeyForCandidate(candidate);
  for (const run of runs) {
    const candidates = parseRunDetails(run.details);
    for (const [index, other] of candidates.entries()) {
      if (other.reviewStatus !== "pending") continue;
      if (duplicateKeyForCandidate(other) !== key) continue;
      return run.id === exclude.runId && index === exclude.index;
    }
  }
  return false;
}

export async function acceptAICandidateAction(formData: FormData) {
  await requireAdmin();
  const runId = String(formData.get("runId") || "");
  const index = Number(formData.get("index"));
  if (!runId || !Number.isInteger(index) || index < 0) throw new Error("Invalid candidate");

  const run = await getAIRunById(runId);
  if (!run) throw new Error("Research run not found");
  const candidates = parseRunDetails(run.details);
  const candidate = candidates[index];
  if (!candidate) throw new Error("Candidate not found");
  if (candidate.reviewStatus !== "pending") {
    redirect(`/admin/ai?notice=${encodeURIComponent("That candidate was already reviewed")}`);
  }
  if (!candidateHasLyrics(candidate) || !candidateHasInterpretation(candidate)) {
    redirect(
      `/admin/ai?notice=${encodeURIComponent(
        `"${candidate.title}" is incomplete (needs lyrics and meaning). Reject it or wait for a fuller discovery run.`,
      )}`,
    );
  }

  const catalog = await listCatalogSongsForDedup();
  const duplicate = findCatalogDuplicate(candidate, catalog);
  if (duplicate) {
    redirect(
      `/admin/ai?notice=${encodeURIComponent(
        `"${candidate.title}" already exists in the catalog (${duplicate.title}). Reject this candidate or edit the existing song.`,
      )}`,
    );
  }

  if (!(await isCanonicalPendingCandidate(candidate, { runId, index }))) {
    redirect(
      `/admin/ai?notice=${encodeURIComponent(
        `"${candidate.title}" is already pending in another research run. Reject this duplicate, then accept the first copy.`,
      )}`,
    );
  }

  const artistIds = await resolveArtistIds(candidate);
  const movieId = await resolveMovieId(candidate);
  const description = ensureDescription(candidate);
  const songSlug = await resolveUniqueSongSlug(candidate.title, candidate.releaseYear);
  const song = await saveSong({
    title: candidate.title,
    slug: songSlug,
    alternateTitle: candidate.alternateTitle,
    description,
    releaseYear: candidate.releaseYear,
    language: candidate.language,
    category: candidate.category,
    genre: candidate.genre,
    tags: candidate.tags,
    artistIds,
    movieId,
    lyrics: toSongLyrics(candidate),
    platformLinks: toSongPlatformLinks(candidate),
    interpretation: toSongInterpretation(candidate),
    status: "draft",
    featured: false,
  });

  await persistCandidateDecision(runId, index, "accepted", song.id);
  revalidatePath("/admin/ai");
  revalidatePath("/admin");
  revalidatePath("/admin/songs");
  revalidatePath("/admin/artists");
  redirect(`/admin/songs/${song.id}/edit?notice=${encodeURIComponent(`${song.title} drafted from AI research`)}`);
}

export async function rejectAICandidateAction(formData: FormData) {
  await requireAdmin();
  const runId = String(formData.get("runId") || "");
  const index = Number(formData.get("index"));
  if (!runId || !Number.isInteger(index) || index < 0) throw new Error("Invalid candidate");
  await persistCandidateDecision(runId, index, "rejected");
  revalidatePath("/admin/ai");
  revalidatePath("/admin");
  redirect("/admin/ai?notice=Candidate%20rejected");
}

export async function rejectDuplicateAICandidatesAction() {
  await requireAdmin();
  const [runs, catalog] = await Promise.all([listAIRuns(200), listCatalogSongsForDedup()]);
  const seenKeys = new Set<string>();
  let rejected = 0;

  for (const run of runs) {
    const { candidates, criteria } = parseRunPayload(run.details);
    let changed = false;
    for (const [index, candidate] of candidates.entries()) {
      if (candidate.reviewStatus !== "pending") continue;
      const key = duplicateKeyForCandidate(candidate);
      const inCatalog = Boolean(findCatalogDuplicate(candidate, catalog));
      const queueDup = seenKeys.has(key);
      seenKeys.add(key);
      if (!inCatalog && !queueDup) continue;
      candidates[index] = { ...candidate, reviewStatus: "rejected" };
      changed = true;
      rejected += 1;
    }
    if (!changed) continue;
    const pending = candidates.filter((item) => item.reviewStatus === "pending").length;
    const accepted = candidates.filter((item) => item.reviewStatus === "accepted").length;
    const rejectedCount = candidates.filter((item) => item.reviewStatus === "rejected").length;
    run.details = serializeRunDetails(candidates, criteria);
    run.status = finalizeRunStatus(candidates);
    run.summary =
      run.status === "completed"
        ? `Review complete: ${accepted} accepted, ${rejectedCount} rejected.`
        : `${pending} candidate${pending === 1 ? "" : "s"} still need review (${accepted} accepted, ${rejectedCount} rejected).`;
    run.finishedAt = new Date().toISOString();
    await saveAIRun(run);
  }

  revalidatePath("/admin/ai");
  revalidatePath("/admin");
  redirect(
    `/admin/ai?notice=${encodeURIComponent(
      rejected ? `Rejected ${rejected} duplicate candidate${rejected === 1 ? "" : "s"}` : "No duplicates to reject",
    )}`,
  );
}

export async function bulkRejectAICandidatesAction(formData: FormData) {
  await requireAdmin();
  const selections = parseSelectionKeys(formData);
  let rejected = 0;
  for (const { runId, index } of selections) {
    try {
      await persistCandidateDecision(runId, index, "rejected");
      rejected += 1;
    } catch {
      // already reviewed or missing — skip
    }
  }
  revalidatePath("/admin/ai");
  revalidatePath("/admin");
  redirect(
    `/admin/ai?notice=${encodeURIComponent(
      rejected ? `Rejected ${rejected} candidate${rejected === 1 ? "" : "s"}` : "No candidates rejected",
    )}`,
  );
}

export async function bulkAcceptAICandidatesAction(formData: FormData) {
  await requireAdmin();
  const selections = parseSelectionKeys(formData);
  const catalog = await listCatalogSongsForDedup();
  let accepted = 0;
  let skipped = 0;
  const acceptedKeys = new Set<string>();

  for (const { runId, index } of selections) {
    const run = await getAIRunById(runId);
    if (!run) {
      skipped += 1;
      continue;
    }
    const candidates = parseRunDetails(run.details);
    const candidate = candidates[index];
    if (!candidate || candidate.reviewStatus !== "pending") {
      skipped += 1;
      continue;
    }
    if (!candidateHasLyrics(candidate) || !candidateHasInterpretation(candidate)) {
      skipped += 1;
      continue;
    }
    if (findCatalogDuplicate(candidate, catalog)) {
      skipped += 1;
      continue;
    }
    const key = duplicateKeyForCandidate(candidate);
    if (acceptedKeys.has(key)) {
      skipped += 1;
      continue;
    }
    if (!(await isCanonicalPendingCandidate(candidate, { runId, index }))) {
      skipped += 1;
      continue;
    }

    try {
      const artistIds = await resolveArtistIds(candidate);
      const movieId = await resolveMovieId(candidate);
      const description = ensureDescription(candidate);
      const songSlug = await resolveUniqueSongSlug(candidate.title, candidate.releaseYear);
      const song = await saveSong({
        title: candidate.title,
        slug: songSlug,
        alternateTitle: candidate.alternateTitle,
        description,
        releaseYear: candidate.releaseYear,
        language: candidate.language,
        category: candidate.category,
        genre: candidate.genre,
        tags: candidate.tags,
        artistIds,
        movieId,
        lyrics: toSongLyrics(candidate),
        platformLinks: toSongPlatformLinks(candidate),
        interpretation: toSongInterpretation(candidate),
        status: "draft",
        featured: false,
      });
      await persistCandidateDecision(runId, index, "accepted", song.id);
      catalog.push(song);
      acceptedKeys.add(key);
      accepted += 1;
    } catch {
      skipped += 1;
    }
  }

  revalidatePath("/admin/ai");
  revalidatePath("/admin");
  revalidatePath("/admin/songs");
  revalidatePath("/admin/artists");
  redirect(
    `/admin/ai?notice=${encodeURIComponent(
      `Accepted ${accepted} draft${accepted === 1 ? "" : "s"}${skipped ? ` · skipped ${skipped}` : ""}`,
    )}`,
  );
}
