import Link from "next/link";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteSongAction } from "@/app/actions";
import { listSongs } from "@/lib/repository";

export default async function AdminSongs({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [songs, query] = await Promise.all([listSongs({ limit: 50 }, true), searchParams]);
  return (
    <>
      <header className="admin-heading">
        <div><div className="eyebrow">Catalog</div><h1>Songs & lyrics</h1><p>Manage multilingual editions, meanings, credits, and publication state.</p></div>
        <Link className="button compact" href="/admin/songs/new"><Plus size={16} /> Add song</Link>
      </header>
      {query.notice && <div className="notice">{query.notice}</div>}
      <section className="panel">
        <table className="admin-table">
          <thead><tr><th>Title</th><th>Artists</th><th>Taxonomy</th><th>Lyrics</th><th>Meaning</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {songs.items.map((song) => (
              <tr key={song.id}>
                <td><strong>{song.title}</strong><br /><span className="muted">{song.releaseYear} · {song.language}</span></td>
                <td>{song.artists.map((artist) => artist.name).join(", ")}</td>
                <td>{song.category}<br /><span className="muted">{song.genre}</span></td>
                <td>{song.lyrics.length} version{song.lyrics.length === 1 ? "" : "s"}</td>
                <td>
                  {song.interpretation
                    ? <span className={`status ${song.interpretation.status}`}>{song.interpretation.status}</span>
                    : <span className="muted">Not added</span>}
                </td>
                <td><span className={`status ${song.status}`}>{song.status}</span></td>
                <td>
                  <div className="row-actions">
                    {song.status === "published" && <Link href={`/en/lyrics/${song.slug}`} target="_blank" aria-label="View"><ExternalLink size={13} /></Link>}
                    <Link href={`/admin/songs/${song.id}/edit`} aria-label="Edit"><Pencil size={13} /></Link>
                    <form action={deleteSongAction}>
                      <input type="hidden" name="id" value={song.id} />
                      <button aria-label="Delete" type="submit"><Trash2 size={13} /></button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
