import Link from "next/link";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { deleteArtistAction, saveArtistAction } from "@/app/actions";
import { PendingSubmitButton } from "@/components/ui-feedback";
import { listArtists, listArtistsPaginated } from "@/lib/repository";

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
    <nav className="pagination" aria-label="Artists pagination" style={{ marginTop: 16 }}>
      {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span />}
      <span>
        Page {page} of {pages}
      </span>
      {page < pages ? <Link href={href(page + 1)}>Next</Link> : <span />}
    </nav>
  );
}

function artistsHref(filters: { q?: string; edit?: string }, page?: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.edit) params.set("edit", filters.edit);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/artists?${query}` : "/admin/artists";
}

export default async function AdminArtists({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; edit?: string }>;
}) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const q = query.q?.trim() || undefined;
  const editId = query.edit?.trim() || undefined;

  const [artists, allArtists] = await Promise.all([
    listArtistsPaginated({ query: q, page, limit: PAGE_SIZE }),
    editId ? listArtists() : Promise.resolve([]),
  ]);
  const editArtist = editId ? allArtists.find((artist) => artist.id === editId) : undefined;

  return (
    <>
      <header className="admin-heading">
        <div>
          <div className="eyebrow">Relationships</div>
          <h1>Artists</h1>
          <p>Create and update the people and groups linked to songs.</p>
        </div>
      </header>

      <div className="admin-grid">
        <section className="panel">
          <h2>Artist directory</h2>
          <form className="form-grid" method="get" style={{ marginBottom: 16 }}>
            {editId && <input type="hidden" name="edit" value={editId} />}
            <label className="field">
              <span>Search</span>
              <input name="q" defaultValue={q || ""} placeholder="Name, slug, bio…" />
            </label>
            <div className="field" style={{ display: "flex", alignItems: "end", gap: 8 }}>
              <button className="button compact" type="submit">
                Apply
              </button>
              <Link className="text-link" href="/admin/artists" style={{ fontSize: 12, padding: "8px 0" }}>
                Clear
              </Link>
            </div>
          </form>

          <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
            {artists.total} artist{artists.total === 1 ? "" : "s"} · page {artists.page} of{" "}
            {artists.pages}
          </p>

          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Songs</th>
                  <th>Bio</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {artists.items.map((artist) => (
                  <tr key={artist.id}>
                    <td>
                      <strong>{artist.name}</strong>
                    </td>
                    <td>
                      <code style={{ fontSize: 11 }}>{artist.slug}</code>
                    </td>
                    <td>{artist.songCount}</td>
                    <td>
                      <span className="muted" title={artist.bio}>
                        {artist.bio.length > 90 ? `${artist.bio.slice(0, 89)}…` : artist.bio}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link
                          href={artistsHref({ q, edit: artist.id }, page)}
                          aria-label={`Edit ${artist.name}`}
                        >
                          <Pencil size={13} />
                        </Link>
                        <form action={deleteArtistAction}>
                          <input type="hidden" name="id" value={artist.id} />
                          <PendingSubmitButton
                            aria-label={`Delete ${artist.name}`}
                            type="submit"
                            disabled={artist.songCount > 0}
                            title={
                              artist.songCount > 0
                                ? "Unlink this artist from songs before deleting"
                                : "Delete artist"
                            }
                            pendingLabel="…"
                          >
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
          {!artists.items.length && <p className="muted">No artists match this search.</p>}
          <AdminPagination
            page={artists.page}
            pages={artists.pages}
            href={(next) => artistsHref({ q, edit: editId }, next)}
          />
        </section>

        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          {editArtist && (
            <section className="panel">
              <h2>Edit artist</h2>
              <form className="form-grid" action={saveArtistAction}>
                <input type="hidden" name="id" value={editArtist.id} />
                <label className="field full">
                  <span>Name</span>
                  <input name="name" defaultValue={editArtist.name} required />
                </label>
                <label className="field full">
                  <span>Slug</span>
                  <input name="slug" defaultValue={editArtist.slug} required />
                </label>
                <label className="field full">
                  <span>Biography</span>
                  <textarea name="bio" defaultValue={editArtist.bio} required minLength={10} />
                </label>
                <div className="row-actions">
                  <PendingSubmitButton className="button compact" type="submit" pendingLabel="Saving…">
                    Save changes
                  </PendingSubmitButton>
                  <Link className="text-link" href={artistsHref({ q }, page)} style={{ fontSize: 12 }}>
                    Cancel
                  </Link>
                </div>
              </form>
            </section>
          )}

          <section className="panel">
            <h2>Add artist</h2>
            <form className="form-grid" action={saveArtistAction}>
              <label className="field full">
                <span>Name</span>
                <input name="name" required />
              </label>
              <label className="field full">
                <span>Slug (optional)</span>
                <input name="slug" />
              </label>
              <label className="field full">
                <span>Biography</span>
                <textarea name="bio" required minLength={10} />
              </label>
              <PendingSubmitButton className="button compact" type="submit" pendingLabel="Adding…">
                <UserPlus size={15} /> Add artist
              </PendingSubmitButton>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
