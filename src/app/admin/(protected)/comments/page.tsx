import { Check, X } from "lucide-react";
import { moderateCommentAction } from "@/app/actions";
import { PendingSubmitButton } from "@/components/ui-feedback";
import { getComments, getSongById } from "@/lib/repository";

export default async function AdminComments() {
  const comments = await getComments(undefined, true);
  const songEntries = await Promise.all(
    [...new Set(comments.map((comment) => comment.songId))].map(async (id) => [id, await getSongById(id)] as const),
  );
  const songs = new Map(songEntries);
  return (
    <>
      <header className="admin-heading">
        <div><div className="eyebrow">Community</div><h1>Comment moderation</h1><p>Approve constructive discussion and reject spam or unsafe content.</p></div>
      </header>
      <section className="panel">
        <table className="admin-table">
          <thead><tr><th>Author</th><th>Song</th><th>Comment</th><th>Status</th><th>Moderate</th></tr></thead>
          <tbody>
            {comments.map((comment) => (
              <tr key={comment.id}>
                <td><strong>{comment.name}</strong><br /><span className="muted">{comment.email}</span></td>
                <td>{songs.get(comment.songId)?.title ?? "Unknown song"}</td>
                <td style={{ maxWidth: 420, lineHeight: 1.5 }}>{comment.body}</td>
                <td><span className={`status ${comment.status}`}>{comment.status}</span></td>
                <td>
                  <div className="row-actions">
                    <form action={moderateCommentAction}>
                      <input type="hidden" name="id" value={comment.id} />
                      <input type="hidden" name="status" value="approved" />
                      <PendingSubmitButton type="submit" aria-label="Approve" pendingLabel="…"><Check size={13} /></PendingSubmitButton>
                    </form>
                    <form action={moderateCommentAction}>
                      <input type="hidden" name="id" value={comment.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <PendingSubmitButton type="submit" aria-label="Reject" pendingLabel="…"><X size={13} /></PendingSubmitButton>
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
