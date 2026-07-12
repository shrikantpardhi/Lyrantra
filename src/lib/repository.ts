import { randomUUID } from "node:crypto";
import { db, databaseEnabled } from "@/lib/db";
import {
  seedAIRuns,
  seedArtists,
  seedComments,
  seedMovies,
  seedSongs,
} from "@/lib/seed-data";
import type {
  AIProvider,
  AIRun,
  Artist,
  Comment,
  ContactMessage,
  Movie,
  Paginated,
  SearchFilters,
  Song,
} from "@/lib/types";

type MemoryStore = {
  songs: Song[];
  artists: Artist[];
  movies: Movie[];
  comments: Comment[];
  contacts: ContactMessage[];
  providers: AIProvider[];
  runs: AIRun[];
};

const globalStore = globalThis as unknown as { lyricsproStore?: MemoryStore };

function memory(): MemoryStore {
  if (!globalStore.lyricsproStore) {
    globalStore.lyricsproStore = {
      songs: structuredClone(seedSongs),
      artists: structuredClone(seedArtists),
      movies: structuredClone(seedMovies),
      comments: structuredClone(seedComments),
      contacts: [],
      providers: [],
      runs: structuredClone(seedAIRuns),
    };
  }
  return globalStore.lyricsproStore;
}

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();
}

function slugify(value: string) {
  return normalize(value)
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/(^-|-$)/g, "");
}

function rowToSong(
  row: Record<string, unknown>,
  artists: Artist[],
  movies: Movie[],
  relations: Array<{ song_id: string; artist_id: string; sort_order: number }>,
): Song {
  const artistIds = relations
    .filter((item) => item.song_id === row.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => item.artist_id);
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    alternateTitle: row.alternate_title ? String(row.alternate_title) : undefined,
    description: String(row.description ?? ""),
    releaseYear: Number(row.release_year),
    language: String(row.language),
    category: String(row.category),
    genre: String(row.genre),
    tags: (row.tags as string[]) ?? [],
    artistIds,
    artists: artistIds
      .map((id) => artists.find((artist) => artist.id === id))
      .filter((artist): artist is Artist => Boolean(artist)),
    movieId: row.movie_id ? String(row.movie_id) : undefined,
    movie: movies.find((movie) => movie.id === row.movie_id),
    artwork: row.artwork ? String(row.artwork) : undefined,
    lyrics: (row.lyrics as Song["lyrics"]) ?? [],
    platformLinks: (row.platform_links as Song["platformLinks"]) ?? [],
    status: row.status as Song["status"],
    featured: Boolean(row.featured),
    views: Number(row.views ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

async function loadArtists(): Promise<Artist[]> {
  if (!databaseEnabled) return memory().artists;
  const rows = await db()`select id, slug, name, bio, image from artists order by name`;
  return rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    bio: String(row.bio ?? ""),
    image: row.image ? String(row.image) : undefined,
  }));
}

async function loadMovies(): Promise<Movie[]> {
  if (!databaseEnabled) return memory().movies;
  const rows = await db()`select id, slug, title, year, description from movies order by title`;
  return rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    year: Number(row.year),
    description: String(row.description ?? ""),
  }));
}

async function loadSongs(includeUnpublished = false): Promise<Song[]> {
  if (!databaseEnabled) {
    return memory().songs.filter((song) => includeUnpublished || song.status === "published");
  }
  const sql = db();
  const [songRows, relationRows, artists, movies] = await Promise.all([
    includeUnpublished
      ? sql`select * from songs order by created_at desc`
      : sql`select * from songs where status = 'published' order by created_at desc`,
    sql`select song_id, artist_id, sort_order from song_artists`,
    loadArtists(),
    loadMovies(),
  ]);
  return songRows.map((row) =>
    rowToSong(
      row as Record<string, unknown>,
      artists,
      movies,
      relationRows as Array<{ song_id: string; artist_id: string; sort_order: number }>,
    ),
  );
}

export async function listSongs(
  filters: SearchFilters = {},
  includeUnpublished = false,
): Promise<Paginated<Song>> {
  const query = normalize(filters.query ?? "");
  let songs = await loadSongs(includeUnpublished);
  if (query) {
    songs = songs.filter((song) =>
      normalize(
        [
          song.title,
          song.alternateTitle,
          song.description,
          song.language,
          song.category,
          song.genre,
          song.tags.join(" "),
          song.artists.map((artist) => artist.name).join(" "),
          song.movie?.title,
          song.lyrics.map((lyric) => lyric.text).join(" "),
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(query),
    );
  }
  if (filters.category) songs = songs.filter((song) => song.category === filters.category);
  if (filters.genre) songs = songs.filter((song) => song.genre === filters.genre);
  if (filters.language) songs = songs.filter((song) => song.language === filters.language);
  if (filters.year) songs = songs.filter((song) => String(song.releaseYear) === filters.year);

  songs.sort((a, b) => {
    if (query) {
      const aStarts = normalize(a.title).startsWith(query) ? 1 : 0;
      const bStarts = normalize(b.title).startsWith(query) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;
    }
    return b.views - a.views;
  });

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 12));
  const total = songs.length;
  return {
    items: songs.slice((page - 1) * limit, page * limit),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getSongBySlug(slug: string) {
  return (await loadSongs()).find((song) => song.slug === slug);
}

export async function getSongById(id: string) {
  return (await loadSongs(true)).find((song) => song.id === id);
}

export async function listArtists() {
  return loadArtists();
}

export async function saveArtist(input: Omit<Artist, "id">, id?: string) {
  const artist: Artist = { ...input, id: id || randomUUID(), slug: input.slug || slugify(input.name) };
  if (!databaseEnabled) {
    const index = memory().artists.findIndex((item) => item.id === artist.id);
    if (index >= 0) memory().artists[index] = artist;
    else memory().artists.push(artist);
    memory().songs.forEach((song) => {
      song.artists = song.artistIds
        .map((artistId) => memory().artists.find((item) => item.id === artistId))
        .filter((item): item is Artist => Boolean(item));
    });
  } else {
    await db()`insert into artists (id, slug, name, bio, image)
      values (${artist.id}, ${artist.slug}, ${artist.name}, ${artist.bio}, ${artist.image ?? null})
      on conflict (id) do update set slug = excluded.slug, name = excluded.name,
        bio = excluded.bio, image = excluded.image, updated_at = now()`;
  }
  return artist;
}

export async function deleteArtist(id: string) {
  const linked = (await loadSongs(true)).some((song) => song.artistIds.includes(id));
  if (linked) throw new Error("Remove this artist from linked songs before deleting");
  if (!databaseEnabled) memory().artists = memory().artists.filter((artist) => artist.id !== id);
  else await db()`delete from artists where id = ${id}`;
}

export async function getArtistBySlug(slug: string) {
  return (await loadArtists()).find((artist) => artist.slug === slug);
}

export async function listArtistSongs(slug: string, page = 1, limit = 8) {
  const artist = await getArtistBySlug(slug);
  if (!artist) return undefined;
  const all = (await loadSongs()).filter((song) => song.artistIds.includes(artist.id));
  return {
    artist,
    songs: {
      items: all.slice((page - 1) * limit, page * limit),
      total: all.length,
      page,
      pages: Math.max(1, Math.ceil(all.length / limit)),
    } satisfies Paginated<Song>,
  };
}

export async function listMovies() {
  return loadMovies();
}

export async function getMovieBySlug(slug: string) {
  const movie = (await loadMovies()).find((item) => item.slug === slug);
  if (!movie) return undefined;
  return {
    movie,
    songs: (await loadSongs()).filter((song) => song.movieId === movie.id),
  };
}

export async function getFacets() {
  const songs = await loadSongs();
  const unique = (items: string[]) => [...new Set(items)].sort();
  return {
    categories: unique(songs.map((song) => song.category)),
    genres: unique(songs.map((song) => song.genre)),
    languages: unique(songs.map((song) => song.language)),
    years: unique(songs.map((song) => String(song.releaseYear))).reverse(),
  };
}

export async function getComments(songId?: string, includePending = false) {
  if (!databaseEnabled) {
    return memory().comments
      .filter((comment) => (!songId || comment.songId === songId) && (includePending || comment.status === "approved"))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const rows = await db()`select * from comments order by created_at desc`;
  return rows
    .map((row) => ({
      id: String(row.id),
      songId: String(row.song_id),
      name: String(row.name),
      email: String(row.email),
      body: String(row.body),
      status: row.status as Comment["status"],
      createdAt: new Date(row.created_at).toISOString(),
    }))
    .filter((comment) => (!songId || comment.songId === songId) && (includePending || comment.status === "approved"));
}

export async function createComment(input: Pick<Comment, "songId" | "name" | "email" | "body">) {
  const comment: Comment = {
    ...input,
    id: randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  if (!databaseEnabled) memory().comments.unshift(comment);
  else {
    await db()`insert into comments (id, song_id, name, email, body, status, created_at)
      values (${comment.id}, ${comment.songId}, ${comment.name}, ${comment.email},
        ${comment.body}, ${comment.status}, ${comment.createdAt})`;
  }
  return comment;
}

export async function moderateComment(id: string, status: Comment["status"]) {
  if (!databaseEnabled) {
    const comment = memory().comments.find((item) => item.id === id);
    if (comment) comment.status = status;
  } else {
    await db()`update comments set status = ${status} where id = ${id}`;
  }
}

export async function createContactMessage(input: Omit<ContactMessage, "id" | "createdAt">) {
  const message = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  if (!databaseEnabled) memory().contacts.unshift(message);
  else {
    await db()`insert into contact_messages (id, name, email, subject, message)
      values (${message.id}, ${message.name}, ${message.email}, ${message.subject}, ${message.message})`;
  }
  return message;
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  if (!databaseEnabled) return memory().contacts;
  const rows = await db()`select * from contact_messages order by created_at desc`;
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    subject: String(row.subject),
    message: String(row.message),
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export type SongInput = {
  title: string;
  slug?: string;
  alternateTitle?: string;
  description: string;
  releaseYear: number;
  language: string;
  category: string;
  genre: string;
  tags: string[];
  artistIds: string[];
  movieId?: string;
  lyrics: Song["lyrics"];
  platformLinks: Song["platformLinks"];
  status: Song["status"];
  featured?: boolean;
};

export async function saveSong(input: SongInput, id?: string) {
  const artists = (await loadArtists()).filter((artist) => input.artistIds.includes(artist.id));
  const movies = await loadMovies();
  const existing = id ? await getSongById(id) : undefined;
  const song: Song = {
    id: existing?.id ?? randomUUID(),
    slug: input.slug || slugify(input.title),
    title: input.title,
    alternateTitle: input.alternateTitle,
    description: input.description,
    releaseYear: input.releaseYear,
    language: input.language,
    category: input.category,
    genre: input.genre,
    tags: input.tags,
    artistIds: input.artistIds,
    artists,
    movieId: input.movieId,
    movie: movies.find((movie) => movie.id === input.movieId),
    lyrics: input.lyrics,
    platformLinks: input.platformLinks,
    status: input.status,
    featured: input.featured,
    views: existing?.views ?? 0,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!databaseEnabled) {
    const index = memory().songs.findIndex((item) => item.id === song.id);
    if (index >= 0) memory().songs[index] = song;
    else memory().songs.unshift(song);
    return song;
  }

  const sql = db();
  await sql.begin(async (tx) => {
    await tx`insert into songs (
      id, slug, title, alternate_title, description, release_year, language,
      category, genre, tags, movie_id, lyrics, platform_links, status, featured, views
    ) values (
      ${song.id}, ${song.slug}, ${song.title}, ${song.alternateTitle ?? null}, ${song.description},
      ${song.releaseYear}, ${song.language}, ${song.category}, ${song.genre}, ${song.tags},
      ${song.movieId ?? null}, ${tx.json(song.lyrics)}, ${tx.json(song.platformLinks)},
      ${song.status}, ${Boolean(song.featured)}, ${song.views}
    ) on conflict (id) do update set
      slug = excluded.slug, title = excluded.title, alternate_title = excluded.alternate_title,
      description = excluded.description, release_year = excluded.release_year,
      language = excluded.language, category = excluded.category, genre = excluded.genre,
      tags = excluded.tags, movie_id = excluded.movie_id, lyrics = excluded.lyrics,
      platform_links = excluded.platform_links, status = excluded.status,
      featured = excluded.featured, updated_at = now()`;
    await tx`delete from song_artists where song_id = ${song.id}`;
    for (const [sortOrder, artistId] of song.artistIds.entries()) {
      await tx`insert into song_artists (song_id, artist_id, sort_order)
        values (${song.id}, ${artistId}, ${sortOrder})`;
    }
  });
  return song;
}

export async function deleteSong(id: string) {
  if (!databaseEnabled) {
    memory().songs = memory().songs.filter((song) => song.id !== id);
  } else {
    await db()`delete from songs where id = ${id}`;
  }
}

export async function getDashboardStats() {
  const [songs, artists, comments] = await Promise.all([
    loadSongs(true),
    loadArtists(),
    getComments(undefined, true),
  ]);
  return {
    songs: songs.length,
    published: songs.filter((song) => song.status === "published").length,
    artists: artists.length,
    pendingComments: comments.filter((comment) => comment.status === "pending").length,
    views: songs.reduce((total, song) => total + song.views, 0),
  };
}

export async function listAIProviders(): Promise<AIProvider[]> {
  if (!databaseEnabled) return memory().providers;
  const rows = await db()`select * from ai_providers order by created_at desc`;
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    provider: row.provider as AIProvider["provider"],
    model: String(row.model),
    encryptedApiKey: String(row.encrypted_api_key),
    baseUrl: row.base_url ? String(row.base_url) : undefined,
    enabled: Boolean(row.enabled),
    dailyLimit: Number(row.daily_limit),
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function saveAIProvider(provider: AIProvider) {
  if (!databaseEnabled) {
    const index = memory().providers.findIndex((item) => item.id === provider.id);
    if (index >= 0) memory().providers[index] = provider;
    else memory().providers.unshift(provider);
  } else {
    await db()`insert into ai_providers (
      id, name, provider, model, encrypted_api_key, base_url, enabled, daily_limit
    ) values (
      ${provider.id}, ${provider.name}, ${provider.provider}, ${provider.model},
      ${provider.encryptedApiKey}, ${provider.baseUrl ?? null}, ${provider.enabled}, ${provider.dailyLimit}
    ) on conflict (id) do update set name = excluded.name, provider = excluded.provider,
      model = excluded.model, encrypted_api_key = excluded.encrypted_api_key,
      base_url = excluded.base_url, enabled = excluded.enabled, daily_limit = excluded.daily_limit`;
  }
}

export async function setAIProviderEnabled(id: string, enabled: boolean) {
  if (!databaseEnabled) {
    const provider = memory().providers.find((item) => item.id === id);
    if (provider) provider.enabled = enabled;
  } else {
    await db()`update ai_providers set enabled = ${enabled} where id = ${id}`;
  }
}

export async function deleteAIProvider(id: string) {
  if (!databaseEnabled) {
    memory().providers = memory().providers.filter((item) => item.id !== id);
  } else {
    await db()`delete from ai_providers where id = ${id}`;
  }
}

export async function listAIRuns(): Promise<AIRun[]> {
  if (!databaseEnabled) return memory().runs;
  const rows = await db()`select * from ai_runs order by created_at desc limit 50`;
  return rows.map((row) => ({
    id: String(row.id),
    providerId: row.provider_id ? String(row.provider_id) : undefined,
    status: row.status as AIRun["status"],
    source: row.source as AIRun["source"],
    summary: String(row.summary),
    candidates: Number(row.candidates),
    details: row.details ? String(row.details) : undefined,
    createdAt: new Date(row.created_at).toISOString(),
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : undefined,
  }));
}

export async function saveAIRun(run: AIRun) {
  if (!databaseEnabled) {
    const index = memory().runs.findIndex((item) => item.id === run.id);
    if (index >= 0) memory().runs[index] = run;
    else memory().runs.unshift(run);
  } else {
    await db()`insert into ai_runs (
      id, provider_id, status, source, summary, candidates, details, created_at, finished_at
    ) values (
      ${run.id}, ${run.providerId ?? null}, ${run.status}, ${run.source}, ${run.summary},
      ${run.candidates}, ${run.details ?? null}, ${run.createdAt}, ${run.finishedAt ?? null}
    ) on conflict (id) do update set status = excluded.status, summary = excluded.summary,
      candidates = excluded.candidates, details = excluded.details, finished_at = excluded.finished_at`;
  }
}

export { slugify };
