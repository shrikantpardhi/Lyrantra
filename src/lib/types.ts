// UI locales are enabled only after their navigation, metadata, and page copy are translated.
// Lyrics in any language remain available through language filters and lyric editions.
export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];

export type Artist = {
  id: string;
  slug: string;
  name: string;
  bio: string;
  image?: string;
};

export type Movie = {
  id: string;
  slug: string;
  title: string;
  year: number;
  description: string;
};

export type LyricVersion = {
  id: string;
  language: string;
  languageCode: string;
  type: "original" | "translation" | "transliteration";
  text: string;
  source?: string;
};

export type PlatformLink = {
  platform: string;
  url: string;
};

export type Song = {
  id: string;
  slug: string;
  title: string;
  alternateTitle?: string;
  description: string;
  releaseYear: number;
  language: string;
  category: string;
  genre: string;
  tags: string[];
  artistIds: string[];
  artists: Artist[];
  movie?: Movie;
  movieId?: string;
  artwork?: string;
  lyrics: LyricVersion[];
  platformLinks: PlatformLink[];
  status: "draft" | "review" | "published" | "archived";
  featured?: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
};

export type Comment = {
  id: string;
  songId: string;
  name: string;
  email: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
};

export type AIProvider = {
  id: string;
  name: string;
  provider: "gemini" | "openai" | "anthropic" | "custom";
  model: string;
  encryptedApiKey: string;
  baseUrl?: string;
  enabled: boolean;
  dailyLimit: number;
  createdAt: string;
};

export type AIRun = {
  id: string;
  providerId?: string;
  status: "queued" | "running" | "needs_review" | "completed" | "failed";
  source: "manual" | "schedule";
  summary: string;
  candidates: number;
  details?: string;
  createdAt: string;
  finishedAt?: string;
};

export type SearchFilters = {
  query?: string;
  category?: string;
  genre?: string;
  language?: string;
  tag?: string;
  year?: string;
  artistId?: string;
  movieId?: string;
  page?: number;
  limit?: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pages: number;
};
