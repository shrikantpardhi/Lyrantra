"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { bulkDeleteAIRunsAction, deleteAIRunAction, deleteFinishedAIRunsAction } from "@/app/actions";
import { PendingSubmitButton } from "@/components/ui-feedback";

export type AIRunRow = {
  id: string;
  summary: string;
  status: string;
  source: string;
  candidates: number;
  createdAt: string;
  finishedAt?: string;
  brief?: string;
  candidateLines: Array<{ title: string; reviewStatus: string; songId?: string }>;
  rawResponse?: string;
  deletable: boolean;
};

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function AIRunsTable({
  rows,
  finishedCount,
}: {
  rows: AIRunRow[];
  finishedCount: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectable = useMemo(() => rows.filter((row) => row.deletable).map((row) => row.id), [rows]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      if (current.size === selectable.length) return new Set();
      return new Set(selectable);
    });
  }

  const selectedList = Array.from(selected);

  return (
    <>
      <div
        className="row-actions"
        style={{ marginBottom: 12, flexWrap: "wrap", justifyContent: "flex-start", gap: 8 }}
      >
        <form action={deleteFinishedAIRunsAction}>
          <PendingSubmitButton
            type="submit"
            disabled={finishedCount === 0}
            pendingLabel="Deleting…"
          >
            <Trash2 size={13} /> Clear finished ({finishedCount})
          </PendingSubmitButton>
        </form>
        <form action={bulkDeleteAIRunsAction}>
          {selectedList.map((id) => (
            <input key={id} type="hidden" name="runId" value={id} />
          ))}
          <PendingSubmitButton type="submit" disabled={!selectedList.length} pendingLabel="Deleting…">
            <Trash2 size={13} /> Delete selected ({selectedList.length})
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
                  checked={selectable.length > 0 && selected.size === selectable.length}
                  onChange={toggleAll}
                  aria-label="Select all deletable runs"
                />
              </th>
              <th>Summary</th>
              <th>Status</th>
              <th>Candidates</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <input
                    type="checkbox"
                    disabled={!row.deletable}
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    aria-label={`Select run ${row.summary}`}
                  />
                </td>
                <td>
                  <strong>{row.summary}</strong>
                  <br />
                  <span className="muted" style={{ fontSize: 11 }}>
                    {row.source}
                    {row.brief ? ` · ${row.brief}` : ""}
                    {row.finishedAt ? ` · finished ${new Date(row.finishedAt).toLocaleString()}` : ""}
                  </span>
                  {row.candidateLines.length > 0 && (
                    <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 11, lineHeight: 1.6 }}>
                      {row.candidateLines.map((candidate, index) => (
                        <li key={`${row.id}-${index}`}>
                          {candidate.title} · {candidate.reviewStatus}
                          {candidate.songId && (
                            <>
                              {" "}
                              <Link className="text-link" href={`/admin/songs/${candidate.songId}/edit`}>
                                Open draft
                              </Link>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {row.status === "failed" && row.rawResponse && (
                    <pre className="code-block" style={{ marginTop: 8, maxHeight: 120, overflow: "auto" }}>
                      {row.rawResponse}
                    </pre>
                  )}
                </td>
                <td>
                  <span className={`status ${row.status}`}>{statusLabel(row.status)}</span>
                </td>
                <td>{row.candidates}</td>
                <td>
                  <span className="muted" style={{ fontSize: 11 }}>
                    {new Date(row.createdAt).toLocaleString()}
                  </span>
                </td>
                <td>
                  <form action={deleteAIRunAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <PendingSubmitButton
                      type="submit"
                      aria-label="Delete research run"
                      disabled={!row.deletable}
                      pendingLabel="…"
                    >
                      <Trash2 size={13} />
                    </PendingSubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
