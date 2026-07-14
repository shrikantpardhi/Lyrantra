import Link from "next/link";
import { ArrowUpRight, BookOpenText, Eye, MessageSquare, Plus, Sparkles, Users } from "lucide-react";
import { moderateCommentAction } from "@/app/actions";
import { PendingSubmitButton } from "@/components/ui-feedback";
import { getAdminAnalytics, getDashboardStats, listAIRuns, listSongs } from "@/lib/repository";

export default async function AdminDashboard() {
  const [stats, songs, runs, analytics] = await Promise.all([
    getDashboardStats(),
    listSongs({ limit: 6, sort: "trending" }, true),
    listAIRuns(3),
    getAdminAnalytics(),
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
        <div>
          <div className="eyebrow">Lyranta Studio</div>
          <h1>Editorial overview</h1>
          <p>
            {stats.views.toLocaleString()} lifetime reads · {stats.views7d.toLocaleString()} in the last 7 days
          </p>
        </div>
        <Link className="button compact" href="/admin/songs/new">
          <Plus size={16} /> Add song
        </Link>
      </header>
      <section className="stats-grid">
        {cards.map(({ label, value, icon: Icon }) => (
          <div className="stat-card" key={label}>
            <Icon size={18} color="var(--green-2)" />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <div className="admin-grid">
        <section className="panel">
          <h2>Pending comments</h2>
          {analytics.pendingComments.length ? (
            analytics.pendingComments.map((comment) => (
              <article className="provider-card" key={comment.id} style={{ alignItems: "flex-start" }}>
                <span style={{ minWidth: 0 }}>
                  <strong>{comment.name}</strong>
                  <small>{new Date(comment.createdAt).toLocaleString()}</small>
                  <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>{comment.body}</p>
                </span>
                <span className="row-actions" style={{ flexDirection: "column" }}>
                  <form action={moderateCommentAction}>
                    <input type="hidden" name="id" value={comment.id} />
                    <input type="hidden" name="status" value="approved" />
                    <PendingSubmitButton className="button compact" type="submit" pendingLabel="…">
                      Approve
                    </PendingSubmitButton>
                  </form>
                  <form action={moderateCommentAction}>
                    <input type="hidden" name="id" value={comment.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <PendingSubmitButton type="submit" pendingLabel="…">
                      Reject
                    </PendingSubmitButton>
                  </form>
                </span>
              </article>
            ))
          ) : (
            <p className="muted">No comments waiting.</p>
          )}
          <Link className="text-link" href="/admin/comments" style={{ marginTop: 10 }}>
            Open comment inbox
          </Link>
        </section>

        <section className="panel">
          <h2>Analytics</h2>
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>Top by lifetime reads</h3>
          <ul style={{ paddingLeft: 18, fontSize: 12, lineHeight: 1.7, marginBottom: 16 }}>
            {analytics.topByViews.map((song) => (
              <li key={`life-${song.id}`}>
                <Link className="text-link" href={`/admin/songs/${song.id}/edit`}>
                  {song.title}
                </Link>{" "}
                · {song.views.toLocaleString()}
              </li>
            ))}
            {!analytics.topByViews.length && <li className="muted">No published songs yet.</li>}
          </ul>
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>Trending (7 days)</h3>
          <ul style={{ paddingLeft: 18, fontSize: 12, lineHeight: 1.7, marginBottom: 16 }}>
            {analytics.topTrending.map((song) => (
              <li key={`trend-${song.id}`}>
                <Link className="text-link" href={`/admin/songs/${song.id}/edit`}>
                  {song.title}
                </Link>{" "}
                · {song.views7d.toLocaleString()} / 7d
              </li>
            ))}
          </ul>
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>AI markets</h3>
          <ul style={{ paddingLeft: 18, fontSize: 12, lineHeight: 1.7 }}>
            {analytics.aiMarkets.map((market) => (
              <li key={market.market}>
                {market.market}: {market.accepted} accepted · {market.rejected} rejected · {market.pending}{" "}
                pending
              </li>
            ))}
            {!analytics.aiMarkets.length && <li className="muted">No AI runs yet.</li>}
          </ul>
        </section>
      </div>

      <div className="admin-grid" style={{ marginTop: 18 }}>
        <section className="panel">
          <h2>Recent catalog</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Song</th>
                <th>Artists</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {songs.items.map((song) => (
                <tr key={song.id}>
                  <td>
                    <strong>{song.title}</strong>
                    <br />
                    <span className="muted">
                      {song.language} · {song.releaseYear}
                    </span>
                  </td>
                  <td>{song.artists.map((artist) => artist.name).join(", ")}</td>
                  <td>
                    <span className={`status ${song.status}`}>{song.status}</span>
                  </td>
                  <td>
                    <Link
                      className="text-link"
                      href={`/admin/songs/${song.id}/edit`}
                      aria-label={`Edit ${song.title}`}
                    >
                      <ArrowUpRight size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>AI research</h2>
          {runs.slice(0, 3).map((run) => (
            <div className="provider-card" key={run.id}>
              <span>
                <strong>{run.summary}</strong>
                <small>{new Date(run.createdAt).toLocaleDateString()}</small>
              </span>
              <span className={`status ${run.status}`}>{run.status.replace("_", " ")}</span>
            </div>
          ))}
          <Link className="text-link" href="/admin/ai" style={{ marginTop: 10 }}>
            <Sparkles size={15} /> Open AI workspace
          </Link>
        </section>
      </div>
    </>
  );
}
