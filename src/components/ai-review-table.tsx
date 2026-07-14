"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import {
  acceptAICandidateAction,
  bulkAcceptAICandidatesAction,
  bulkRejectAICandidatesAction,
  rejectAICandidateAction,
  rejectDuplicateAICandidatesAction,
} from "@/app/actions";
import { PendingSubmitButton } from "@/components/ui-feedback";

export type ReviewRow = {
  key: string;
  runId: string;
  index: number;
  title: string;
  alternateTitle?: string;
  artists: string;
  releaseYear: number;
  language: string;
  category: string;
  genre: string;
  movie?: string;
  slug: string;
  lyricPreview: string;
  lyricsFull?: string;
  description: string;
  meaningPreview?: string;
  catalogSongId?: string;
  status: "new" | "catalog" | "queue_duplicate" | "missing_lyrics";
  canAccept: boolean;
};

function truncate(value: string, max = 120) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function statusLabel(status: ReviewRow["status"]) {
  if (status === "catalog") return <span className="status failed">In catalog</span>;
  if (status === "queue_duplicate") return <span className="status needs_review">Duplicate run</span>;
  if (status === "missing_lyrics") return <span className="status failed">Missing lyrics</span>;
  return <span className="status published">New</span>;
}

export function AIReviewTable({
  rows,
  duplicateCount,
}: {
  rows: ReviewRow[];
  duplicateCount: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectableKeys = useMemo(() => rows.map((row) => row.key), [rows]);

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      if (current.size === selectableKeys.length) return new Set();
      return new Set(selectableKeys);
    });
  }

  const selectedList = Array.from(selected);

  return (
    <>
      <div
        className="row-actions"
        style={{ marginBottom: 12, flexWrap: "wrap", justifyContent: "flex-start", gap: 8 }}
      >
        <form action={rejectDuplicateAICandidatesAction}>
          <PendingSubmitButton
            className="button compact"
            type="submit"
            disabled={duplicateCount === 0}
            pendingLabel="Rejecting…"
          >
            <X size={14} /> Reject all duplicates ({duplicateCount})
          </PendingSubmitButton>
        </form>
        <form action={bulkAcceptAICandidatesAction}>
          {selectedList.map((key) => (
            <input key={`accept-${key}`} type="hidden" name="selection" value={key} />
          ))}
          <PendingSubmitButton
            className="button compact"
            type="submit"
            disabled={!selectedList.length}
            pendingLabel="Accepting…"
          >
            <Check size={14} /> Accept selected ({selectedList.length})
          </PendingSubmitButton>
        </form>
        <form action={bulkRejectAICandidatesAction}>
          {selectedList.map((key) => (
            <input key={`reject-${key}`} type="hidden" name="selection" value={key} />
          ))}
          <PendingSubmitButton type="submit" disabled={!selectedList.length} pendingLabel="Rejecting…">
            <X size={12} /> Reject selected ({selectedList.length})
          </PendingSubmitButton>
        </form>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectableKeys.length > 0 && selected.size === selectableKeys.length}
                  onChange={toggleAll}
                  aria-label="Select all on this page"
                />
              </th>
              <th>Title</th>
              <th>Artists</th>
              <th>Year</th>
              <th>Language</th>
              <th>Slug</th>
              <th>Lyrics</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(row.key)}
                    onChange={() => toggle(row.key)}
                    aria-label={`Select ${row.title}`}
                  />
                </td>
                <td>
                  <strong>{row.title}</strong>
                  {row.alternateTitle && (
                    <>
                      <br />
                      <span className="muted">{row.alternateTitle}</span>
                    </>
                  )}
                  <br />
                  <span className="muted">
                    {row.category} · {row.genre}
                    {row.movie ? ` · ${row.movie}` : ""}
                  </span>
                </td>
                <td>{row.artists}</td>
                <td>{row.releaseYear}</td>
                <td>{row.language}</td>
                <td>
                  <code style={{ fontSize: 11 }}>{row.slug}</code>
                </td>
                <td>
                  {row.lyricPreview ? (
                    <span title={row.lyricPreview}>{truncate(row.lyricPreview, 80)}</span>
                  ) : (
                    <span className="muted">Missing</span>
                  )}
                </td>
                <td>{statusLabel(row.status)}</td>
                <td>
                  <details style={{ minWidth: 220 }}>
                    <summary className="text-link" style={{ cursor: "pointer", fontSize: 12 }}>
                      Review
                    </summary>
                    <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.65, maxWidth: 420 }}>
                      <p>{row.description}</p>
                      {row.meaningPreview && (
                        <p style={{ marginTop: 8 }}>
                          <strong>Meaning:</strong> {truncate(row.meaningPreview, 240)}
                        </p>
                      )}
                      {row.lyricsFull && (
                        <pre
                          className="code-block"
                          style={{
                            marginTop: 8,
                            fontSize: 11,
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                            maxHeight: 200,
                            overflow: "auto",
                          }}
                        >
                          {row.lyricsFull}
                        </pre>
                      )}
                      {row.catalogSongId && (
                        <p style={{ marginTop: 8 }}>
                          <Link className="text-link" href={`/admin/songs/${row.catalogSongId}/edit`}>
                            Open existing song
                          </Link>
                        </p>
                      )}
                      <div className="row-actions" style={{ marginTop: 10 }}>
                        <form action={acceptAICandidateAction}>
                          <input type="hidden" name="runId" value={row.runId} />
                          <input type="hidden" name="index" value={String(row.index)} />
                          <PendingSubmitButton
                            className="button compact"
                            type="submit"
                            disabled={!row.canAccept}
                            pendingLabel="Creating…"
                          >
                            <Check size={14} /> Accept
                          </PendingSubmitButton>
                        </form>
                        <form action={rejectAICandidateAction}>
                          <input type="hidden" name="runId" value={row.runId} />
                          <input type="hidden" name="index" value={String(row.index)} />
                          <PendingSubmitButton
                            type="submit"
                            aria-label={`Reject ${row.title}`}
                            pendingLabel="Rejecting…"
                          >
                            <X size={12} /> Reject
                          </PendingSubmitButton>
                        </form>
                      </div>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
