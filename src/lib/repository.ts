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

const globalStore = globalThis as unknown as { lyrantaStore?: MemoryStore };

function memory(): MemoryStore {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "In-memory demo catalog is disabled in production. Configure DATABASE_URL.",
    );
  }
  if (!globalStore.lyrantaStore) {
    globalStore.lyrantaStore = {
      songs: structuredClone(seedSongs),
      artists: structuredClone(seedArtists),
      movies: structuredClone(seedMovies),
      comments: structuredClone(seedComments),
      contacts: [],
      providers: [],
      runs: structuredClone(seedAIRuns),
    };
  }
  return globalStore.lyrantaStore;
}

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();
}

function slugify(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}\p{Mark}]+/gu, "-")
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
    interpretation: row.interpretation
      ? (row.interpretation as Song["interpretation"])
      : undefined,
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

async function hydrateSongRows(songRows: readonly Record<string, unknown>[]): Promise<Song[]> {
  if (!songRows.length) return [];
  const sql = db();
  const songIds = songRows.map((row) => String(row.id));
  const [relationRows, artists, movies] = await Promise.all([
    sql`select song_id, artist_id, sort_order from song_artists where song_id = any(${songIds})`,
    loadArtists(),
    loadMovies(),
  ]);
  const relations = relationRows as unknown as Array<{
    song_id: string;
    artist_id: string;
    sort_order: number;
  }>;
  return songRows.map((row) => rowToSong(row, artists, movies, relations));
}

async function loadSongs(includeUnpublished = false): Promise<Song[]> {
  if (!databaseEnabled) {
    return memory().songs.filter((song) => includeUnpublished || song.status === "published");
  }
  const sql = db();
  const songRows = includeUnpublished
    ? await sql`select * from songs order by created_at desc`
    : await sql`select * from songs where status = 'published' order by created_at desc`;
  return hydrateSongRows(songRows as unknown as Array<Record<string, unknown>>);
}

export async function listSongs(
  filters: SearchFilters = {},
  includeUnpublished = false,
): Promise<Paginated<Song>> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 12));

  if (databaseEnabled) {
    const parameters: Array<string | number> = [];
    const conditions: string[] = [];
    const parameter = (value: string | number) => {
      parameters.push(value);
      return `$${parameters.length}`;
    };

    if (!includeUnpublished) conditions.push("s.status = 'published'");
    let searchParameter: string | undefined;
    if (filters.query?.trim()) {
      searchParameter = parameter(filters.query.trim());
      const patternParameter = parameter(`%${filters.query.trim()}%`);
      conditions.push(`(
        s.search_document @@ websearch_to_tsquery('simple', ${searchParameter})
        or s.title ilike ${patternParameter}
        or coalesce(s.alternate_title, '') ilike ${patternParameter}
        or (
          coalesce(s.interpretation->>'status', '') = 'published'
          and coalesce(s.interpretation::text, '') ilike ${patternParameter}
        )
        or exists (
          select 1 from song_artists sa
          join artists a on a.id = sa.artist_id
          where sa.song_id = s.id and a.name ilike ${patternParameter}
        )
        or exists (
          select 1 from movies m
          where m.id = s.movie_id and m.title ilike ${patternParameter}
        )
      )`);
    }
    if (filters.category) conditions.push(`s.category = ${parameter(filters.category)}`);
    if (filters.genre) conditions.push(`s.genre = ${parameter(filters.genre)}`);
    if (filters.language) {
      const languageParameter = parameter(filters.language);
      conditions.push(`(
        s.language = ${languageParameter}
        or exists (
          select 1 from jsonb_array_elements(s.lyrics) lyric
          where lyric->>'language' = ${languageParameter}
        )
      )`);
    }
    if (filters.tag) conditions.push(`${parameter(filters.tag)} = any(s.tags)`);
    if (filters.artistId) {
      conditions.push(`exists (
        select 1 from song_artists selected_artist
        where selected_artist.song_id = s.id
          and selected_artist.artist_id = ${parameter(filters.artistId)}
      )`);
    }
    if (filters.movieId) conditions.push(`s.movie_id = ${parameter(filters.movieId)}`);
    if (filters.year && Number.isInteger(Number(filters.year))) {
      conditions.push(`s.release_year = ${parameter(Number(filters.year))}`);
    }

    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
    const ranking = searchParameter
      ? `ts_rank_cd(s.search_document, websearch_to_tsquery('simple', ${searchParameter})) desc,
         case when lower(s.title) like lower(${searchParameter}) || '%' then 0 else 1 end,`
      : "";
    const sql = db();
    const countRows = await sql.unsafe<Array<{ total: string }>>(
      `select count(*)::text as total from songs s ${where}`,
      parameters,
    );
    const rowParameters = [...parameters, limit, (page - 1) * limit];
    const songRows = await sql.unsafe<Array<Record<string, unknown>>>(
      `select s.* from songs s ${where}
       order by ${ranking} s.views desc, s.updated_at desc
       limit $${rowParameters.length - 1} offset $${rowParameters.length}`,
      rowParameters,
    );
    const total = Number(countRows[0]?.total ?? 0);
    return {
      items: await hydrateSongRows(songRows),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

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
          song.interpretation?.status === "published"
            ? [
                song.interpretation.summary,
                song.interpretation.themes.join(" "),
                song.interpretation.sections.map((section) => `${section.label} ${section.meaning}`).join(" "),
                song.interpretation.culturalContext,
              ].join(" ")
            : undefined,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(query),
    );
  }
  if (filters.category) songs = songs.filter((song) => song.category === filters.category);
  if (filters.genre) songs = songs.filter((song) => song.genre === filters.genre);
  if (filters.language) {
    songs = songs.filter(
      (song) =>
        song.language === filters.language ||
        song.lyrics.some((lyric) => lyric.language === filters.language),
    );
  }
  if (filters.tag) songs = songs.filter((song) => song.tags.includes(filters.tag as string));
  if (filters.year) songs = songs.filter((song) => String(song.releaseYear) === filters.year);
  if (filters.artistId) songs = songs.filter((song) => song.artistIds.includes(filters.artistId as string));
  if (filters.movieId) songs = songs.filter((song) => song.movieId === filters.movieId);

  songs.sort((a, b) => {
    if (query) {
      const aStarts = normalize(a.title).startsWith(query) ? 1 : 0;
      const bStarts = normalize(b.title).startsWith(query) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;
    }
    return b.views - a.views;
  });

  const total = songs.length;
  return {
    items: songs.slice((page - 1) * limit, page * limit),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function listPublishedSongs() {
  return loadSongs();
}

export async function getSongBySlug(slug: string) {
  if (databaseEnabled) {
    const rows = await db()`select * from songs where status = 'published' and slug = ${slug} limit 1`;
    return (await hydrateSongRows(rows as unknown as Array<Record<string, unknown>>))[0];
  }
  return (await loadSongs()).find((song) => song.slug === slug);
}

export async function getSongById(id: string) {
  if (databaseEnabled) {
    const rows = await db()`select * from songs where id = ${id} limit 1`;
    return (await hydrateSongRows(rows as unknown as Array<Record<string, unknown>>))[0];
  }
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
  return {
    artist,
    songs: await listSongs({ artistId: artist.id, page, limit }),
  };
}

export async function listMovies() {
  return loadMovies();
}

export async function saveMovie(input: Omit<Movie, "id">, id?: string) {
  const movie: Movie = {
    ...input,
    id: id || randomUUID(),
    slug: input.slug || slugify(input.title),
  };
  if (!databaseEnabled) {
    const index = memory().movies.findIndex((item) => item.id === movie.id);
    if (index >= 0) memory().movies[index] = movie;
    else memory().movies.push(movie);
  } else {
    await db()`insert into movies (id, slug, title, year, description)
      values (${movie.id}, ${movie.slug}, ${movie.title}, ${movie.year}, ${movie.description})
      on conflict (id) do update set slug = excluded.slug, title = excluded.title,
        year = excluded.year, description = excluded.description, updated_at = now()`;
  }
  return movie;
}

export async function getMovieBySlug(slug: string) {
  const movie = (await loadMovies()).find((item) => item.slug === slug);
  if (!movie) return undefined;
  return {
    movie,
    songs: (await listSongs({ movieId: movie.id, limit: 50 })).items,
  };
}

export async function getFacets() {
  if (databaseEnabled) {
    const rows = await db()`with facet_values as (
      select id as song_id, 'categories' as facet, category as value
      from songs where status = 'published'
      union all
      select id, 'genres', genre from songs where status = 'published'
      union all
      select id, 'languages', language from songs where status = 'published'
      union all
      select s.id, 'languages', lyric->>'language'
      from songs s cross join lateral jsonb_array_elements(s.lyrics) lyric
      where s.status = 'published'
      union all
      select s.id, 'tags', tag
      from songs s cross join lateral unnest(s.tags) tag
      where s.status = 'published'
      union all
      select id, 'years', release_year::text from songs where status = 'published'
    )
    select facet, value, count(distinct song_id)::int as total
    from facet_values
    where value is not null and value <> ''
    group by facet, value
    order by value`;
    const buckets = {
      categories: [] as string[],
      genres: [] as string[],
      languages: [] as string[],
      tags: [] as string[],
      years: [] as string[],
    };
    const counts = {
      categories: {} as Record<string, number>,
      genres: {} as Record<string, number>,
      languages: {} as Record<string, number>,
      tags: {} as Record<string, number>,
      years: {} as Record<string, number>,
    };
    for (const row of rows) {
      const facet = String(row.facet) as keyof typeof buckets;
      const value = String(row.value);
      if (!(facet in buckets)) continue;
      buckets[facet].push(value);
      counts[facet][value] = Number(row.total);
    }
    buckets.years.sort((a, b) => Number(b) - Number(a));
    return { ...buckets, counts };
  }

  const songs = await loadSongs();
  const unique = (items: string[]) => [...new Set(items)].sort();
  const count = (items: string[]) =>
    items.reduce<Record<string, number>>((counts, item) => {
      counts[item] = (counts[item] ?? 0) + 1;
      return counts;
    }, {});
  const songLanguages = songs.flatMap((song) => [
    ...new Set([song.language, ...song.lyrics.map((lyric) => lyric.language)]),
  ]);
  return {
    categories: unique(songs.map((song) => song.category)),
    genres: unique(songs.map((song) => song.genre)),
    languages: unique(songLanguages),
    tags: unique(songs.flatMap((song) => song.tags)),
    years: unique(songs.map((song) => String(song.releaseYear))).reverse(),
    counts: {
      categories: count(songs.map((song) => song.category)),
      genres: count(songs.map((song) => song.genre)),
      languages: count(songLanguages),
      tags: count(songs.flatMap((song) => song.tags)),
      years: count(songs.map((song) => String(song.releaseYear))),
    },
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
  interpretation?: Song["interpretation"];
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
    interpretation: input.interpretation,
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
      category, genre, tags, movie_id, lyrics, platform_links, interpretation,
      status, featured, views
    ) values (
      ${song.id}, ${song.slug}, ${song.title}, ${song.alternateTitle ?? null}, ${song.description},
      ${song.releaseYear}, ${song.language}, ${song.category}, ${song.genre}, ${song.tags},
      ${song.movieId ?? null}, ${tx.json(song.lyrics)}, ${tx.json(song.platformLinks)},
      ${song.interpretation ? tx.json(song.interpretation) : null},
      ${song.status}, ${Boolean(song.featured)}, ${song.views}
    ) on conflict (id) do update set
      slug = excluded.slug, title = excluded.title, alternate_title = excluded.alternate_title,
      description = excluded.description, release_year = excluded.release_year,
      language = excluded.language, category = excluded.category, genre = excluded.genre,
      tags = excluded.tags, movie_id = excluded.movie_id, lyrics = excluded.lyrics,
      platform_links = excluded.platform_links, interpretation = excluded.interpretation,
      status = excluded.status,
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

function mapAIRun(row: Record<string, unknown>): AIRun {
  return {
    id: String(row.id),
    providerId: row.provider_id ? String(row.provider_id) : undefined,
    status: row.status as AIRun["status"],
    source: row.source as AIRun["source"],
    summary: String(row.summary),
    candidates: Number(row.candidates),
    details: row.details ? String(row.details) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    finishedAt: row.finished_at ? new Date(String(row.finished_at)).toISOString() : undefined,
  };
}

export async function listAIRuns(limit = 10): Promise<AIRun[]> {
  const capped = Math.min(200, Math.max(1, limit));
  if (!databaseEnabled) return memory().runs.slice(0, capped);
  const rows = await db()`select * from ai_runs order by created_at desc limit ${capped}`;
  return rows.map((row) => mapAIRun(row as Record<string, unknown>));
}

export async function getAIRunById(id: string): Promise<AIRun | undefined> {
  if (!databaseEnabled) return memory().runs.find((run) => run.id === id);
  const rows = await db()`select * from ai_runs where id = ${id} limit 1`;
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? mapAIRun(row) : undefined;
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
    ) on conflict (id) do update set
      provider_id = excluded.provider_id,
      status = excluded.status,
      summary = excluded.summary,
      candidates = excluded.candidates,
      details = excluded.details,
      finished_at = excluded.finished_at`;
  }
}

export async function resolveUniqueSongSlug(
  title: string,
  releaseYear: number,
  excludeId?: string,
) {
  const songs = await loadSongs(true);
  const taken = (slug: string) =>
    songs.some((song) => song.slug === slug && song.id !== excludeId);

  const baseSlug = slugify(title);
  if (!taken(baseSlug)) return baseSlug;

  const withYear = `${baseSlug}-${releaseYear}`;
  if (!taken(withYear)) return withYear;

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!taken(candidate)) return candidate;
  }

  return `${baseSlug}-${releaseYear}-alt`;
}

export async function listCatalogSongsForDedup() {
  return loadSongs(true);
}

export { slugify };
