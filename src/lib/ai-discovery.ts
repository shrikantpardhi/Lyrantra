import { randomUUID } from "node:crypto";
import { DEFAULT_INTERPRETATION_DISCLAIMER } from "@/lib/interpretation";
import { slugify } from "@/lib/repository";
import type { PlatformLink, Song, SongInterpretation } from "@/lib/types";

export type DiscoveryPlatformLink = {
  platform: string;
  url: string;
};

export type DiscoveryInterpretationSection = {
  label: string;
  meaning: string;
};

export type DiscoveryInterpretation = {
  summary: string;
  themes: string[];
  culturalContext: string;
  sections: DiscoveryInterpretationSection[];
  sourceUrl?: string;
};

export type DiscoveryArtist = {
  name: string;
  bio?: string;
};

export type DiscoveryCandidate = {
  title: string;
  alternateTitle?: string;
  artists: string[];
  artistDetails: DiscoveryArtist[];
  releaseYear: number;
  language: string;
  languageCode: string;
  category: string;
  genre: string;
  tags: string[];
  movie?: string;
  movieYear?: number;
  movieDescription?: string;
  officialSourceUrl: string;
  description: string;
  platformLinks: DiscoveryPlatformLink[];
  interpretation?: DiscoveryInterpretation;
  lyricEditions: Array<{
    language: string;
    languageCode: string;
    type: "original" | "translation" | "transliteration";
    text: string;
    sourceNote: string;
  }>;
  lyricSourceNote?: string;
  reviewStatus: "pending" | "accepted" | "rejected";
  songId?: string;
};

export type DiscoveryCriteria = {
  market?: string;
  yearFrom?: number;
  yearTo?: number;
  language?: string;
  genre?: string;
  category?: string;
  artist?: string;
  keywords?: string;
  notes?: string;
};

export type AIRunDetailsPayload = {
  criteria?: DiscoveryCriteria;
  candidates: DiscoveryCandidate[];
  rawResponse?: string;
  metrics?: {
    durationMs?: number;
    responseChars?: number;
    catalogExcluded?: number;
    autoRejectedDuplicates?: number;
  };
};

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asYear(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return undefined;
}

function asStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => asTrimmedString(item)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/,|&|\band\b/i)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function asArtists(value: unknown): { names: string[]; details: DiscoveryArtist[] } {
  if (!Array.isArray(value)) {
    const names = asStringList(value);
    return { names, details: names.map((name) => ({ name })) };
  }
  const details: DiscoveryArtist[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      details.push({ name: item.trim() });
      continue;
    }
    if (item && typeof item === "object") {
      const row = item as Record<string, unknown>;
      const name = asTrimmedString(row.name) || asTrimmedString(row.artist);
      if (!name) continue;
      const bio = asTrimmedString(row.bio) || undefined;
      details.push({ name, bio });
    }
  }
  return {
    names: details.map((item) => item.name),
    details,
  };
}

function asLyricText(value: unknown) {
  return asTrimmedString(value).slice(0, 50_000);
}

function asLyricEditions(
  value: unknown,
  language: string,
  languageCode: string,
  lyricSourceNote: string,
  fallbackLyrics?: unknown,
) {
  const editions: DiscoveryCandidate["lyricEditions"] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const editionLanguage = asTrimmedString(row.language) || language;
      const editionCode = asTrimmedString(row.languageCode) || guessLanguageCode(editionLanguage);
      const typeValue = asTrimmedString(row.type);
      const type =
        typeValue === "translation" || typeValue === "transliteration" ? typeValue : "original";
      const sourceNote =
        asTrimmedString(row.sourceNote) ||
        asTrimmedString(row.source) ||
        lyricSourceNote;
      editions.push({
        language: editionLanguage,
        languageCode: editionCode,
        type,
        text: asLyricText(row.text),
        sourceNote,
      });
    }
  }
  if (Array.isArray(fallbackLyrics)) {
    for (const item of fallbackLyrics) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const editionLanguage = asTrimmedString(row.language) || language;
      const text = asLyricText(row.text);
      if (!text) continue;
      const typeValue = asTrimmedString(row.type);
      const editionType =
        typeValue === "translation" || typeValue === "transliteration" ? typeValue : "original";
      const existing = editions.find(
        (edition) =>
          edition.language.toLowerCase() === editionLanguage.toLowerCase() &&
          edition.type === editionType,
      );
      if (existing) {
        if (!existing.text) existing.text = text;
        continue;
      }
      editions.push({
        language: editionLanguage,
        languageCode: asTrimmedString(row.languageCode) || guessLanguageCode(editionLanguage),
        type: editionType,
        text,
        sourceNote:
          asTrimmedString(row.sourceNote) || asTrimmedString(row.source) || lyricSourceNote,
      });
    }
  }
  if (!editions.length) {
    editions.push({
      language,
      languageCode,
      type: "original",
      text: "",
      sourceNote: lyricSourceNote,
    });
  }
  return editions.slice(0, 6);
}

function asHttpsUrl(value: unknown) {
  const url = asTrimmedString(value);
  return /^https:\/\//i.test(url) ? url : "";
}

function asPlatformLinks(value: unknown, officialSourceUrl: string): DiscoveryPlatformLink[] {
  const links: DiscoveryPlatformLink[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const platform = asTrimmedString(row.platform);
      const url = asHttpsUrl(row.url);
      if (platform && url) links.push({ platform, url });
    }
  }
  if (!links.some((link) => link.url === officialSourceUrl)) {
    links.unshift({ platform: "Official source", url: officialSourceUrl });
  }
  return links.slice(0, 12);
}

function asInterpretation(value: unknown, officialSourceUrl: string): DiscoveryInterpretation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const summary = asTrimmedString(row.summary);
  const culturalContext = asTrimmedString(row.culturalContext);
  const themes = asStringList(row.themes).slice(0, 12);
  const sections: DiscoveryInterpretationSection[] = [];
  if (Array.isArray(row.sections)) {
    for (const item of row.sections) {
      if (!item || typeof item !== "object") continue;
      const section = item as Record<string, unknown>;
      const label = asTrimmedString(section.label);
      const meaning = asTrimmedString(section.meaning);
      if (label && meaning) sections.push({ label, meaning });
    }
  }
  if (!summary && !culturalContext && !themes.length && !sections.length) return undefined;
  const sourceUrl = asHttpsUrl(row.sourceUrl) || officialSourceUrl;
  return {
    summary: summary || "Editorial meaning draft pending review.",
    themes,
    culturalContext,
    sections: sections.slice(0, 20),
    sourceUrl,
  };
}

function guessLanguageCode(language: string) {
  const key = language.toLowerCase();
  const map: Record<string, string> = {
    english: "en",
    hindi: "hi",
    spanish: "es",
    arabic: "ar",
    french: "fr",
    german: "de",
    portuguese: "pt",
    tamil: "ta",
    telugu: "te",
    korean: "ko",
    japanese: "ja",
    chinese: "zh",
    punjabi: "pa",
    bengali: "bn",
    urdu: "ur",
  };
  return map[key] || "und";
}

function normalizeCandidate(item: unknown): DiscoveryCandidate | undefined {
  if (!item || typeof item !== "object") return undefined;
  const candidate = item as Record<string, unknown>;
  const title = asTrimmedString(candidate.title);
  const { names: artists, details: artistDetails } = asArtists(candidate.artists);
  const releaseYear = asYear(candidate.releaseYear);
  const language = asTrimmedString(candidate.language);
  const officialSourceUrl = asHttpsUrl(candidate.officialSourceUrl);
  let description = asTrimmedString(candidate.description);
  if (!title || !artists.length || !releaseYear || !language || !officialSourceUrl) return undefined;
  if (!description) description = `${title} by ${artists.join(", ")}.`;

  const alternateTitle = asTrimmedString(candidate.alternateTitle) || undefined;
  const languageCode =
    asTrimmedString(candidate.languageCode) || guessLanguageCode(language);
  const category =
    asTrimmedString(candidate.category) ||
    (asTrimmedString(candidate.movie) ? "Soundtrack" : "Singles");
  const genre = asTrimmedString(candidate.genre) || "Uncategorized";
  const movie = asTrimmedString(candidate.movie) || undefined;
  const movieYear = asYear(candidate.movieYear) || (movie ? releaseYear : undefined);
  const movieDescription = asTrimmedString(candidate.movieDescription) || undefined;
  const tags = [...new Set(["ai-discovery", ...asStringList(candidate.tags), ...(movie ? [movie] : [])])];
  const platformLinks = asPlatformLinks(candidate.platformLinks, officialSourceUrl);
  const interpretation = asInterpretation(candidate.interpretation, officialSourceUrl);
  const lyricSourceNote =
    asTrimmedString(candidate.lyricSourceNote) ||
    "Lyrics pending editorial sourcing from an authorized rights holder.";
  const lyricEditions = asLyricEditions(
    candidate.lyricEditions,
    language,
    languageCode,
    lyricSourceNote,
    candidate.lyrics,
  );
  const reviewStatus =
    candidate.reviewStatus === "accepted" || candidate.reviewStatus === "rejected"
      ? candidate.reviewStatus
      : "pending";
  const songId = asTrimmedString(candidate.songId) || undefined;

  return {
    title,
    alternateTitle,
    artists,
    artistDetails,
    releaseYear,
    language,
    languageCode,
    category,
    genre,
    tags,
    movie,
    movieYear,
    movieDescription,
    officialSourceUrl,
    description,
    platformLinks,
    interpretation,
    lyricEditions,
    lyricSourceNote,
    reviewStatus,
    songId,
  };
}

type SongDuplicateLookup = Pick<Song, "id" | "slug" | "title" | "releaseYear" | "artists">;

function normalizeDuplicateToken(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();
}

export function duplicateKeyForCandidate(
  candidate: Pick<DiscoveryCandidate, "title" | "artists" | "releaseYear">,
) {
  return [
    normalizeDuplicateToken(candidate.title),
    candidate.releaseYear,
    [...candidate.artists].map((artist) => normalizeDuplicateToken(artist)).sort().join("\0"),
  ].join("\0");
}

export function duplicateKeyForSong(song: SongDuplicateLookup) {
  return duplicateKeyForCandidate({
    title: song.title,
    artists: song.artists.map((artist) => artist.name),
    releaseYear: song.releaseYear,
  });
}

export function findCatalogDuplicate(
  candidate: DiscoveryCandidate,
  catalog: SongDuplicateLookup[],
): SongDuplicateLookup | undefined {
  const candidateKey = duplicateKeyForCandidate(candidate);
  const candidateSlug = slugify(candidate.title);
  return catalog.find(
    (song) => song.slug === candidateSlug || duplicateKeyForSong(song) === candidateKey,
  );
}

export function candidateHasLyrics(candidate: DiscoveryCandidate) {
  return candidate.lyricEditions.some((edition) => edition.text.trim().length > 0);
}

export function candidateHasInterpretation(candidate: DiscoveryCandidate) {
  const draft = candidate.interpretation;
  if (!draft) return false;
  return Boolean(
    draft.summary.trim() &&
    draft.themes.length > 0 &&
    draft.sections.length > 0,
  );
}

/** Thin drafts (no lyrics or meaning) are dropped before review. */
export function isCompleteCandidate(candidate: DiscoveryCandidate) {
  return candidateHasLyrics(candidate) && candidateHasInterpretation(candidate);
}

export function formatCatalogExclusions(
  catalog: Array<Pick<Song, "title" | "releaseYear" | "artists">>,
  limit = 80,
) {
  return catalog
    .slice(0, limit)
    .map(
      (song) =>
        `- ${song.title} (${song.releaseYear}) — ${song.artists.map((artist) => artist.name).join(", ")}`,
    )
    .join("\n");
}

function dedupeDiscoveryBatch(candidates: DiscoveryCandidate[]) {
  const seen = new Set<string>();
  const unique: DiscoveryCandidate[] = [];
  for (const candidate of candidates) {
    const key = duplicateKeyForCandidate(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }
  return unique;
}

/** Extract a JSON array from model output (plain JSON or fenced markdown). */
export function parseDiscovery(text: string, limit: number): DiscoveryCandidate[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] || text;
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  if (start < 0 || end < start) return [];
  try {
    const parsed = JSON.parse(source.slice(start, end + 1)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return dedupeDiscoveryBatch(
      parsed
        .map((item) => normalizeCandidate(item))
        .filter((item): item is DiscoveryCandidate => Boolean(item))
        .filter(isCompleteCandidate)
        .map((item) => ({ ...item, reviewStatus: "pending" as const, songId: undefined })),
    ).slice(0, limit);
  } catch {
    return [];
  }
}

export function normalizeDiscoveryCriteria(input: unknown): DiscoveryCriteria {
  if (!input || typeof input !== "object") return {};
  const row = input as Record<string, unknown>;
  const yearFrom = asYear(row.yearFrom);
  const yearTo = asYear(row.yearTo);
  return {
    market: asTrimmedString(row.market) || undefined,
    yearFrom,
    yearTo,
    language: asTrimmedString(row.language) || undefined,
    genre: asTrimmedString(row.genre) || undefined,
    category: asTrimmedString(row.category) || undefined,
    artist: asTrimmedString(row.artist) || undefined,
    keywords: asTrimmedString(row.keywords) || undefined,
    notes: asTrimmedString(row.notes) || undefined,
  };
}

export function formatDiscoveryCriteria(criteria?: DiscoveryCriteria) {
  if (!criteria) return "";
  const parts: string[] = [];
  if (criteria.market) parts.push(criteria.market);
  if (criteria.yearFrom || criteria.yearTo) {
    parts.push(
      criteria.yearFrom && criteria.yearTo
        ? `${criteria.yearFrom}–${criteria.yearTo}`
        : String(criteria.yearFrom || criteria.yearTo),
    );
  }
  if (criteria.language) parts.push(criteria.language);
  if (criteria.genre) parts.push(criteria.genre);
  if (criteria.category) parts.push(criteria.category);
  if (criteria.artist) parts.push(`artist: ${criteria.artist}`);
  if (criteria.keywords) parts.push(criteria.keywords);
  return parts.join(" · ");
}

export function serializeRunDetails(
  candidates: DiscoveryCandidate[],
  criteria?: DiscoveryCriteria,
  extras?: {
    rawResponse?: string;
    metrics?: AIRunDetailsPayload["metrics"];
  },
) {
  const payload: AIRunDetailsPayload = {
    criteria: criteria && Object.keys(criteria).length ? criteria : undefined,
    candidates,
    rawResponse: extras?.rawResponse,
    metrics: extras?.metrics,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseRunDetails(details?: string): DiscoveryCandidate[] {
  return parseRunPayload(details).candidates;
}

export function parseRunCriteria(details?: string): DiscoveryCriteria | undefined {
  return parseRunPayload(details).criteria;
}

export function parseRunPayload(details?: string): {
  candidates: DiscoveryCandidate[];
  criteria?: DiscoveryCriteria;
  rawResponse?: string;
  metrics?: AIRunDetailsPayload["metrics"];
} {
  if (!details?.trim()) return { candidates: [] };
  try {
    const parsed = JSON.parse(details) as unknown;
    if (Array.isArray(parsed)) {
      return {
        candidates: parsed
          .map((item) => normalizeCandidate(item))
          .filter((item): item is DiscoveryCandidate => Boolean(item)),
      };
    }
    if (parsed && typeof parsed === "object") {
      const payload = parsed as AIRunDetailsPayload;
      const candidates = Array.isArray(payload.candidates)
        ? payload.candidates
            .map((item) => normalizeCandidate(item))
            .filter((item): item is DiscoveryCandidate => Boolean(item))
        : [];
      const criteria = payload.criteria ? normalizeDiscoveryCriteria(payload.criteria) : undefined;
      const rawResponse = asTrimmedString(payload.rawResponse) || undefined;
      return { candidates, criteria, rawResponse, metrics: payload.metrics };
    }
  } catch {
    return { candidates: [] };
  }
  return { candidates: [] };
}

export function markCatalogDuplicatesRejected(
  candidates: DiscoveryCandidate[],
  catalog: Array<Pick<Song, "id" | "slug" | "title" | "releaseYear" | "artists">>,
) {
  let autoRejected = 0;
  const next = candidates.map((candidate) => {
    if (candidate.reviewStatus !== "pending") return candidate;
    if (!findCatalogDuplicate(candidate, catalog)) return candidate;
    autoRejected += 1;
    return { ...candidate, reviewStatus: "rejected" as const };
  });
  return { candidates: next, autoRejected };
}

export function pendingCandidates(candidates: DiscoveryCandidate[]) {
  return candidates.filter((item) => item.reviewStatus === "pending");
}

export function finalizeRunStatus(candidates: DiscoveryCandidate[]) {
  if (!candidates.length) return "completed" as const;
  return pendingCandidates(candidates).length ? ("needs_review" as const) : ("completed" as const);
}

export function ensureDescription(candidate: DiscoveryCandidate) {
  const base = candidate.description.trim();
  if (base.length >= 20) return base.slice(0, 2000);
  return `${base} Official source: ${candidate.officialSourceUrl}`.slice(0, 2000);
}

export function toSongPlatformLinks(candidate: DiscoveryCandidate): PlatformLink[] {
  return candidate.platformLinks.filter((link) => link.platform && /^https:\/\//i.test(link.url));
}

export function toSongInterpretation(candidate: DiscoveryCandidate): SongInterpretation | undefined {
  const draft = candidate.interpretation;
  if (!draft) return undefined;
  const hasContent = Boolean(
    draft.summary.trim() ||
    draft.themes.length ||
    draft.culturalContext.trim() ||
    draft.sections.length ||
    draft.sourceUrl,
  );
  if (!hasContent) return undefined;
  return {
    status: "draft",
    summary: draft.summary.slice(0, 4000),
    themes: draft.themes.slice(0, 12),
    sections: draft.sections.slice(0, 20).map((section) => ({
      id: randomUUID(),
      label: section.label.slice(0, 100),
      meaning: section.meaning.slice(0, 4000),
    })),
    culturalContext: draft.culturalContext.slice(0, 4000),
    sourceUrl: draft.sourceUrl,
    disclaimer: DEFAULT_INTERPRETATION_DISCLAIMER,
  };
}

export function toSongLyrics(candidate: DiscoveryCandidate) {
  return candidate.lyricEditions.map((edition) => ({
    id: randomUUID(),
    language: edition.language,
    languageCode: edition.languageCode,
    type: edition.type,
    text: edition.text,
    source: edition.sourceNote || candidate.lyricSourceNote || "AI discovery",
  }));
}

/** @deprecated Use toSongLyrics — name kept for older call sites. */
export const toSongLyricPlaceholders = toSongLyrics;

export const DISCOVERY_JSON_SCHEMA = `{
  "title": "string",
  "alternateTitle": "string (romanized or alternate title, optional)",
  "artists": [{ "name": "string", "bio": "short public bio from official sources" }],
  "releaseYear": 2026,
  "language": "English",
  "languageCode": "en",
  "category": "Singles | Soundtrack | Albums | ...",
  "genre": "Pop",
  "tags": ["string"],
  "movie": "string (optional soundtrack film/collection title)",
  "movieYear": 2026,
  "movieDescription": "string (optional short film synopsis)",
  "officialSourceUrl": "https://...",
  "description": "factual editorial blurb, at least 2-3 sentences",
  "platformLinks": [{ "platform": "Spotify", "url": "https://..." }],
  "lyricSourceNote": "where the lyric text was found",
  "lyricEditions": [
    {
      "language": "English",
      "languageCode": "en",
      "type": "original | translation | transliteration",
      "text": "REQUIRED — full lyric text for this edition, preserve line breaks with \\n",
      "sourceNote": "official page or platform where this text was found"
    }
  ],
  "interpretation": {
    "summary": "required overall meaning draft, 3-6 sentences",
    "themes": ["longing", "hope", "identity"],
    "culturalContext": "required language, cultural, or release context",
    "sections": [
      { "label": "Verse 1", "meaning": "what this part contributes thematically" },
      { "label": "Chorus", "meaning": "central idea listeners take away" },
      { "label": "Bridge", "meaning": "how the song turns or resolves" }
    ],
    "sourceUrl": "https://..."
  }
}`;
