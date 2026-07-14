import Link from "next/link";
import { Bot, Check, KeyRound, Pause, Play, ShieldCheck, Trash2, X } from "lucide-react";
import {
  acceptAICandidateAction,
  deleteProviderAction,
  rejectAICandidateAction,
  runAIAction,
  saveProviderAction,
  toggleProviderAction,
} from "@/app/actions";
import { AIRunPoller } from "@/components/ai-run-poller";
import { PendingSubmitButton } from "@/components/ui-feedback";
import {
  duplicateKeyForCandidate,
  findCatalogDuplicate,
  formatDiscoveryCriteria,
  parseRunDetails,
  parseRunPayload,
} from "@/lib/ai-discovery";
import { listAIProviders, listAIRuns, listCatalogSongsForDedup, slugify } from "@/lib/repository";

export const maxDuration = 300;

const REVIEW_PAGE_SIZE = 12;

function runStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function truncate(value: string, max = 120) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function AdminPagination({
  page,
  pages,
  basePath = "/admin/ai",
}: {
  page: number;
  pages: number;
  basePath?: string;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Review pagination" style={{ marginTop: 16 }}>
      {page > 1 ? (
        <Link href={page === 2 ? basePath : `${basePath}?page=${page - 1}`}>Previous</Link>
      ) : (
        <span />
      )}
      <span>
        Page {page} of {pages}
      </span>
      {page < pages ? <Link href={`${basePath}?page=${page + 1}`}>Next</Link> : <span />}
    </nav>
  );
}

export default async function AIWorkspace({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);

  const [providers, runs, catalog] = await Promise.all([
    listAIProviders(),
    listAIRuns(200),
    listCatalogSongsForDedup(),
  ]);

  const seenQueueKeys = new Set<string>();
  const reviewQueue = runs.flatMap((run) =>
    parseRunDetails(run.details)
      .map((candidate, index) => {
        const key = duplicateKeyForCandidate(candidate);
        const queueDuplicate = seenQueueKeys.has(key);
        seenQueueKeys.add(key);
        const catalogMatch = findCatalogDuplicate(candidate, catalog);
        return {
          run,
          candidate,
          index,
          catalogMatch,
          queueDuplicate,
          slug: slugify(candidate.title),
        };
      })
      .filter(({ candidate }) => candidate.reviewStatus === "pending"),
  );

  const reviewPages = Math.max(1, Math.ceil(reviewQueue.length / REVIEW_PAGE_SIZE));
  const safePage = Math.min(page, reviewPages);
  const pageItems = reviewQueue.slice(
    (safePage - 1) * REVIEW_PAGE_SIZE,
    safePage * REVIEW_PAGE_SIZE,
  );

  const canRun = providers.some((provider) => provider.enabled);
  const hasActiveRun = runs.some((run) => run.status === "queued" || run.status === "running");
  const currentYear = new Date().getFullYear();

  return (
    <>
      <header className="admin-heading">
        <div>
          <div className="eyebrow">Admin-initiated research</div>
          <h1>AI workspace</h1>
          <p>Set a research brief, then run discovery in the background.</p>
        </div>
      </header>
      <AIRunPoller active={hasActiveRun} />
      {query.notice && (
        <div className="notice" style={{ marginTop: 12 }}>
          {query.notice}
        </div>
      )}
      <div className="notice">
        <ShieldCheck size={16} style={{ verticalAlign: "middle", marginRight: 7 }} />
        AI returns full catalog metadata, lyrics, artist bios, links, and a meaning draft for review.
        Accept or reject each candidate — duplicates are blocked from being added again.
      </div>

      <section className="panel" style={{ marginTop: 18 }}>
        <h2>Research brief</h2>
        <p className="muted" style={{ fontSize: 12, marginTop: -8, marginBottom: 16, lineHeight: 1.6 }}>
          Tell the agent what to pull — for example Bollywood soundtracks from 2024–2026 in Hindi.
          Leave years blank to default to the last seven days.
        </p>
        <form className="form-grid" action={runAIAction}>
          <label className="field">
            <span>Market / industry</span>
            <select name="market" defaultValue="Bollywood">
              <option value="">Any / global</option>
              <option value="Bollywood">Bollywood</option>
              <option value="Tollywood">Tollywood</option>
              <option value="Kollywood">Kollywood</option>
              <option value="Hollywood">Hollywood</option>
              <option value="K-pop">K-pop</option>
              <option value="Independent">Independent</option>
              <option value="Global pop">Global pop</option>
            </select>
          </label>
          <label className="field">
            <span>Language</span>
            <input name="language" placeholder="Hindi, English, Tamil…" />
          </label>
          <label className="field">
            <span>Year from</span>
            <input name="yearFrom" type="number" min="1900" max={currentYear + 2} placeholder="e.g. 2024" />
          </label>
          <label className="field">
            <span>Year to</span>
            <input name="yearTo" type="number" min="1900" max={currentYear + 2} placeholder="e.g. 2026" />
          </label>
          <label className="field">
            <span>Genre</span>
            <input name="genre" placeholder="Filmi, Pop, Folk…" />
          </label>
          <label className="field">
            <span>Category</span>
            <select name="category" defaultValue="">
              <option value="">Any</option>
              <option value="Soundtrack">Soundtrack</option>
              <option value="Singles">Singles</option>
              <option value="Albums">Albums</option>
            </select>
          </label>
          <label className="field">
            <span>Artist focus</span>
            <input name="artist" placeholder="Optional artist or composer" />
          </label>
          <label className="field">
            <span>Keywords</span>
            <input name="keywords" placeholder="romantic, monsoon, item song…" />
          </label>
          <label className="field full">
            <span>Extra notes</span>
            <textarea name="notes" placeholder="Any other research constraints for this run" />
          </label>
          <div className="field full" style={{ display: "flex", justifyContent: "flex-end" }}>
            <PendingSubmitButton
              className="button compact"
              type="submit"
              disabled={!canRun || hasActiveRun}
              pendingLabel="Starting…"
            >
              <Play size={15} /> Run discovery
            </PendingSubmitButton>
          </div>
        </form>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="admin-heading" style={{ marginBottom: 12 }}>
          <div>
            <h2>Needs review</h2>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {reviewQueue.length} candidate{reviewQueue.length === 1 ? "" : "s"} waiting
            </p>
          </div>
        </div>
        {pageItems.length ? (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Artists</th>
                    <th>Year</th>
                    <th>Language</th>
                    <th>Slug</th>
                    <th>Lyrics</th>
                    <th>Catalog</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(({ run, candidate, index, catalogMatch, queueDuplicate, slug }) => {
                    const lyricPreview = candidate.lyricEditions.find((edition) => edition.text)?.text || "";
                    const isDuplicate = Boolean(catalogMatch) || queueDuplicate;
                    return (
                      <tr key={`${run.id}-${index}`}>
                        <td>
                          <strong>{candidate.title}</strong>
                          {candidate.alternateTitle && (
                            <>
                              <br />
                              <span className="muted">{candidate.alternateTitle}</span>
                            </>
                          )}
                          <br />
                          <span className="muted">
                            {candidate.category} · {candidate.genre}
                            {candidate.movie ? ` · ${candidate.movie}` : ""}
                          </span>
                        </td>
                        <td>{candidate.artists.join(", ")}</td>
                        <td>{candidate.releaseYear}</td>
                        <td>{candidate.language}</td>
                        <td>
                          <code style={{ fontSize: 11 }}>{slug}</code>
                        </td>
                        <td>
                          {lyricPreview ? (
                            <span title={lyricPreview}>{truncate(lyricPreview, 80)}</span>
                          ) : (
                            <span className="muted">Missing</span>
                          )}
                        </td>
                        <td>
                          {catalogMatch ? (
                            <span className="status failed">In catalog</span>
                          ) : queueDuplicate ? (
                            <span className="status needs_review">Duplicate run</span>
                          ) : (
                            <span className="status published">New</span>
                          )}
                        </td>
                        <td>
                          <details style={{ minWidth: 220 }}>
                            <summary className="text-link" style={{ cursor: "pointer", fontSize: 12 }}>
                              Review
                            </summary>
                            <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.65, maxWidth: 420 }}>
                              <p>{candidate.description}</p>
                              {candidate.interpretation && (
                                <p style={{ marginTop: 8 }}>
                                  <strong>Meaning:</strong> {truncate(candidate.interpretation.summary, 240)}
                                </p>
                              )}
                              {candidate.lyricEditions.some((edition) => edition.text) && (
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
                                  {candidate.lyricEditions.find((edition) => edition.text)?.text}
                                </pre>
                              )}
                              {catalogMatch && (
                                <p style={{ marginTop: 8 }}>
                                  <Link className="text-link" href={`/admin/songs/${catalogMatch.id}/edit`}>
                                    Open existing song
                                  </Link>
                                </p>
                              )}
                              <div className="row-actions" style={{ marginTop: 10 }}>
                                <form action={acceptAICandidateAction}>
                                  <input type="hidden" name="runId" value={run.id} />
                                  <input type="hidden" name="index" value={String(index)} />
                                  <PendingSubmitButton
                                    className="button compact"
                                    type="submit"
                                    disabled={isDuplicate}
                                    pendingLabel="Creating…"
                                  >
                                    <Check size={14} /> Accept
                                  </PendingSubmitButton>
                                </form>
                                <form action={rejectAICandidateAction}>
                                  <input type="hidden" name="runId" value={run.id} />
                                  <input type="hidden" name="index" value={String(index)} />
                                  <PendingSubmitButton
                                    type="submit"
                                    aria-label={`Reject ${candidate.title}`}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
            <AdminPagination page={safePage} pages={reviewPages} />
          </>
        ) : (
          <p className="muted">No candidates waiting. Run discovery to collect metadata for review.</p>
        )}
      </section>

      <div className="admin-grid">
        <section className="panel">
          <h2>Research runs</h2>
          <p className="muted" style={{ fontSize: 12, marginTop: -8, marginBottom: 14 }}>
            Latest runs. Status updates when the background job finishes.
          </p>
          {runs.slice(0, 10).map((run) => {
            const { candidates, criteria, rawResponse } = parseRunPayload(run.details);
            const brief = formatDiscoveryCriteria(criteria);
            return (
              <article className="provider-card" key={run.id} style={{ alignItems: "flex-start" }}>
                <span style={{ minWidth: 0 }}>
                  <strong>{run.summary}</strong>
                  <small>
                    {new Date(run.createdAt).toLocaleString()}
                    {run.finishedAt ? ` · finished ${new Date(run.finishedAt).toLocaleString()}` : ""}
                    {" · "}
                    {run.source} · {run.candidates} candidates
                  </small>
                  {brief && (
                    <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                      Brief: {brief}
                    </p>
                  )}
                  {candidates.length > 0 && (
                    <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 12, lineHeight: 1.7 }}>
                      {candidates.map((candidate, index) => (
                        <li key={`${run.id}-list-${index}`}>
                          {candidate.title}
                          {" · "}
                          <span
                            className={`status ${candidate.reviewStatus === "pending" ? "needs_review" : candidate.reviewStatus === "accepted" ? "completed" : "failed"}`}
                          >
                            {candidate.reviewStatus}
                          </span>
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
                  {run.status === "failed" && rawResponse && !candidates.length && (
                    <pre className="code-block" style={{ marginTop: 12 }}>
                      {rawResponse}
                    </pre>
                  )}
                </span>
                <span className={`status ${run.status}`}>{runStatusLabel(run.status)}</span>
              </article>
            );
          })}
          {!runs.length && <p className="muted">No research runs yet.</p>}
        </section>
        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <section className="panel">
            <h2>Configured providers</h2>
            {providers.map((provider) => (
              <div className="provider-card" key={provider.id}>
                <span>
                  <strong>{provider.name}</strong>
                  <small>
                    {provider.provider} · {provider.model} · key ••••••••
                  </small>
                </span>
                <span className="row-actions">
                  <span className={`status ${provider.enabled ? "published" : ""}`}>
                    {provider.enabled ? "active" : "off"}
                  </span>
                  <form action={toggleProviderAction}>
                    <input type="hidden" name="id" value={provider.id} />
                    <input type="hidden" name="enabled" value={String(!provider.enabled)} />
                    <PendingSubmitButton
                      type="submit"
                      aria-label={provider.enabled ? "Pause provider" : "Enable provider"}
                      pendingLabel="…"
                    >
                      {provider.enabled ? <Pause size={12} /> : <Play size={12} />}
                    </PendingSubmitButton>
                  </form>
                  <form action={deleteProviderAction}>
                    <input type="hidden" name="id" value={provider.id} />
                    <PendingSubmitButton type="submit" aria-label="Delete provider" pendingLabel="…">
                      <Trash2 size={12} />
                    </PendingSubmitButton>
                  </form>
                </span>
              </div>
            ))}
            {!providers.length && <p className="muted">Add a provider to enable discovery.</p>}
          </section>
          <section className="panel">
            <h2>
              <KeyRound size={17} style={{ verticalAlign: "middle", marginRight: 7 }} />
              Add provider
            </h2>
            <form className="form-grid" action={saveProviderAction}>
              <label className="field full">
                <span>Configuration name</span>
                <input name="name" placeholder="Editorial Gemini" required />
              </label>
              <label className="field">
                <span>Provider</span>
                <select name="provider" defaultValue="gemini">
                  <option value="gemini">Gemini + Google Search</option>
                  <option value="openai">OpenAI + web search</option>
                  <option value="anthropic">Anthropic / compatible</option>
                  <option value="custom">Custom compatible API</option>
                </select>
              </label>
              <label className="field">
                <span>Candidates per run</span>
                <input name="dailyLimit" type="number" min="1" max="20" defaultValue="5" />
              </label>
              <label className="field full">
                <span>Model ID</span>
                <input name="model" placeholder="gemini-2.5-flash" required />
              </label>
              <label className="field full">
                <span>API key</span>
                <input name="apiKey" type="password" autoComplete="new-password" required />
              </label>
              <label className="field full">
                <span>Custom HTTPS base URL</span>
                <input name="baseUrl" type="url" placeholder="Optional for Gemini and OpenAI" />
              </label>
              <PendingSubmitButton className="button compact" type="submit" pendingLabel="Saving…">
                <Bot size={15} /> Encrypt and save
              </PendingSubmitButton>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
