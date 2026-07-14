import Link from "next/link";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteSongAction } from "@/app/actions";
import { PendingSubmitButton } from "@/components/ui-feedback";
import { getAdminSongFilterOptions, listSongs } from "@/lib/repository";
import type { Song } from "@/lib/types";

const PAGE_SIZE = 25;

function AdminPagination({
  page,
  pages,
  href,
}: {
  page: number;
  pages: number;
  href: (page: number) => string;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Songs pagination" style={{ marginTop: 16 }}>
      {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span />}
      <span>
        Page {page} of {pages}
      </span>
      {page < pages ? <Link href={href(page + 1)}>Next</Link> : <span />}
    </nav>
  );
}

function songsHref(filters: Record<string, string | undefined>, page?: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/songs?${query}` : "/admin/songs";
}

export default async function AdminSongs({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    language?: string;
    category?: string;
    genre?: string;
  }>;
}) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const status =
    query.status === "draft" ||
    query.status === "review" ||
    query.status === "published" ||
    query.status === "archived"
      ? (query.status as Song["status"])
      : undefined;
  const filters = {
    q: query.q?.trim() || undefined,
    status,
    language: query.language?.trim() || undefined,
    category: query.category?.trim() || undefined,
    genre: query.genre?.trim() || undefined,
  };

  const [songs, options] = await Promise.all([
    listSongs(
      {
        page,
        limit: PAGE_SIZE,
        query: filters.q,
        status: filters.status,
        language: filters.language,
        category: filters.category,
        genre: filters.genre,
      },
      true,
    ),
    getAdminSongFilterOptions(),
  ]);

  return (
    <>
      <header className="admin-heading">
        <div>
          <div className="eyebrow">Catalog</div>
          <h1>Songs & lyrics</h1>
          <p>Manage multilingual editions, meanings, credits, and publication state.</p>
        </div>
        <Link className="button compact" href="/admin/songs/new">
          <Plus size={16} /> Add song
        </Link>
      </header>

      <section className="panel" style={{ marginBottom: 18 }}>
        <h2>Filters</h2>
        <form className="form-grid" method="get">
          <label className="field">
            <span>Search</span>
            <input name="q" defaultValue={filters.q || ""} placeholder="Title, artist, lyrics…" />
          </label>
          <label className="field">
            <span>Status</span>
            <select name="status" defaultValue={filters.status || ""}>
              <option value="">Any</option>
              <option value="draft">Draft</option>
              <option value="review">Needs review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="field">
            <span>Language</span>
            <select name="language" defaultValue={filters.language || ""}>
              <option value="">Any</option>
              {options.languages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Category</span>
            <select name="category" defaultValue={filters.category || ""}>
              <option value="">Any</option>
              {options.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Genre</span>
            <select name="genre" defaultValue={filters.genre || ""}>
              <option value="">Any</option>
              {options.genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </label>
          <div className="field" style={{ display: "flex", alignItems: "end", gap: 8 }}>
            <button className="button compact" type="submit">
              Apply
            </button>
            <Link className="text-link" href="/admin/songs" style={{ fontSize: 12, padding: "8px 0" }}>
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section className="panel">
        <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
          {songs.total} song{songs.total === 1 ? "" : "s"} · page {songs.page} of {songs.pages}
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Artists</th>
                <th>Taxonomy</th>
                <th>Lyrics</th>
                <th>Meaning</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {songs.items.map((song) => (
                <tr key={song.id}>
                  <td>
                    <strong>{song.title}</strong>
                    <br />
                    <span className="muted">
                      {song.releaseYear} · {song.language}
                    </span>
                  </td>
                  <td>{song.artists.map((artist) => artist.name).join(", ")}</td>
                  <td>
                    {song.category}
                    <br />
                    <span className="muted">{song.genre}</span>
                  </td>
                  <td>
                    {song.lyrics.length} version{song.lyrics.length === 1 ? "" : "s"}
                  </td>
                  <td>
                    {song.interpretation ? (
                      <span className={`status ${song.interpretation.status}`}>
                        {song.interpretation.status}
                      </span>
                    ) : (
                      <span className="muted">Not added</span>
                    )}
                  </td>
                  <td>
                    <span className={`status ${song.status}`}>{song.status}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {song.status === "published" && (
                        <Link href={`/en/lyrics/${song.slug}`} target="_blank" aria-label="View">
                          <ExternalLink size={13} />
                        </Link>
                      )}
                      <Link href={`/admin/songs/${song.id}/edit`} aria-label="Edit">
                        <Pencil size={13} />
                      </Link>
                      <form action={deleteSongAction}>
                        <input type="hidden" name="id" value={song.id} />
                        <PendingSubmitButton aria-label="Delete" type="submit" pendingLabel="…">
                          <Trash2 size={13} />
                        </PendingSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!songs.items.length && <p className="muted">No songs match these filters.</p>}
        <AdminPagination
          page={songs.page}
          pages={songs.pages}
          href={(next) => songsHref(filters, next)}
        />
      </section>
    </>
  );
}
