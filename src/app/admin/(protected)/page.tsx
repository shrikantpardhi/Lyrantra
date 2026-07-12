import Link from "next/link";
import { ArrowUpRight, BookOpenText, Eye, MessageSquare, Plus, Sparkles, Users } from "lucide-react";
import { getDashboardStats, listAIRuns, listSongs } from "@/lib/repository";

export default async function AdminDashboard() {
  const [stats, songs, runs] = await Promise.all([
    getDashboardStats(),
    listSongs({ limit: 6 }, true),
    listAIRuns(),
  ]);
  const cards = [
    { label: "Total songs", value: stats.songs.toLocaleString(), icon: BookOpenText },
    { label: "Published", value: stats.published.toLocaleString(), icon: Eye },
    { label: "Artists", value: stats.artists.toLocaleString(), icon: Users },
    { label: "Pending comments", value: stats.pendingComments.toLocaleString(), icon: MessageSquare },
  ];

  return (
    <>
      <header className="admin-heading">
        <div><div className="eyebrow">LyricsPro Studio</div><h1>Editorial overview</h1><p>{stats.views.toLocaleString()} catalog reads tracked.</p></div>
        <Link className="button compact" href="/admin/songs/new"><Plus size={16} /> Add song</Link>
      </header>
      <section className="stats-grid">
        {cards.map(({ label, value, icon: Icon }) => (
          <div className="stat-card" key={label}>
            <Icon size={18} color="var(--green-2)" />
            <span>{label}</span><strong>{value}</strong>
          </div>
        ))}
      </section>
      <div className="admin-grid">
        <section className="panel">
          <h2>Recent catalog</h2>
          <table className="admin-table">
            <thead><tr><th>Song</th><th>Artists</th><th>Status</th><th /></tr></thead>
            <tbody>
              {songs.items.map((song) => (
                <tr key={song.id}>
                  <td><strong>{song.title}</strong><br /><span className="muted">{song.language} · {song.releaseYear}</span></td>
                  <td>{song.artists.map((artist) => artist.name).join(", ")}</td>
                  <td><span className={`status ${song.status}`}>{song.status}</span></td>
                  <td><Link className="text-link" href={`/admin/songs/${song.id}/edit`} aria-label={`Edit ${song.title}`}><ArrowUpRight size={15} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>AI research</h2>
          {runs.slice(0, 3).map((run) => (
            <div className="provider-card" key={run.id}>
              <span><strong>{run.summary}</strong><small>{new Date(run.createdAt).toLocaleDateString()}</small></span>
              <span className={`status ${run.status}`}>{run.status.replace("_", " ")}</span>
            </div>
          ))}
          <Link className="text-link" href="/admin/ai" style={{ marginTop: 10 }}><Sparkles size={15} /> Open AI workspace</Link>
        </section>
      </div>
    </>
  );
}
