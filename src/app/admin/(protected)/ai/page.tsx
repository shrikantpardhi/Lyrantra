import Link from "next/link";
import { Bot, KeyRound, Pause, Play, ShieldCheck, Trash2 } from "lucide-react";
import {
  deleteProviderAction,
  runAIAction,
  saveProviderAction,
  toggleProviderAction,
} from "@/app/actions";
import { AIReviewTable, type ReviewRow } from "@/components/ai-review-table";
import { AIRunsTable, type AIRunRow } from "@/components/ai-runs-table";
import { AIRunPoller } from "@/components/ai-run-poller";
import { PendingSubmitButton } from "@/components/ui-feedback";
import {
  candidateHasLyrics,
  duplicateKeyForCandidate,
  findCatalogDuplicate,
  formatDiscoveryCriteria,
  parseRunDetails,
  parseRunPayload,
} from "@/lib/ai-discovery";
import { listAIProviders, listAIRuns, listCatalogSongsForDedup, slugify } from "@/lib/repository";

export const maxDuration = 300;

const REVIEW_PAGE_SIZE = 12;

type ReviewFilter = "all" | "new" | "catalog" | "missing";

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
    <nav className="pagination" aria-label="Review pagination" style={{ marginTop: 16 }}>
      {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span />}
      <span>
        Page {page} of {pages}
      </span>
      {page < pages ? <Link href={href(page + 1)}>Next</Link> : <span />}
    </nav>
  );
}

function filterHref(filter: ReviewFilter, page?: number) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/ai?${query}` : "/admin/ai";
}

export default async function AIWorkspace({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; notice?: string; filter?: string }>;
}) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const filter: ReviewFilter =
    query.filter === "new" || query.filter === "catalog" || query.filter === "missing"
      ? query.filter
      : "all";

  const [providers, runs, catalog] = await Promise.all([
    listAIProviders(),
    listAIRuns(200),
    listCatalogSongsForDedup(),
  ]);

  const seenQueueKeys = new Set<string>();
  const reviewQueue: ReviewRow[] = runs.flatMap((run) =>
    parseRunDetails(run.details)
      .map((candidate, index) => ({ candidate, index }))
      .filter(({ candidate }) => candidate.reviewStatus === "pending")
      .map(({ candidate, index }) => {
        const key = duplicateKeyForCandidate(candidate);
        const queueDuplicate = seenQueueKeys.has(key);
        seenQueueKeys.add(key);
        const catalogMatch = findCatalogDuplicate(candidate, catalog);
        const hasLyrics = candidateHasLyrics(candidate);
        const status: ReviewRow["status"] = catalogMatch
          ? "catalog"
          : queueDuplicate
            ? "queue_duplicate"
            : !hasLyrics
              ? "missing_lyrics"
              : "new";
        return {
          key: `${run.id}:${index}`,
          runId: run.id,
          index,
          title: candidate.title,
          alternateTitle: candidate.alternateTitle,
          artists: candidate.artists.join(", "),
          releaseYear: candidate.releaseYear,
          language: candidate.language,
          category: candidate.category,
          genre: candidate.genre,
          movie: candidate.movie,
          slug: slugify(candidate.title),
          lyricPreview: candidate.lyricEditions.find((edition) => edition.text)?.text || "",
          lyricsFull: candidate.lyricEditions.find((edition) => edition.text)?.text,
          description: candidate.description,
          meaningPreview: candidate.interpretation?.summary,
          catalogSongId: catalogMatch?.id,
          status,
          canAccept: status === "new",
        } satisfies ReviewRow;
      }),
  );

  const duplicateCount = reviewQueue.filter(
    (row) => row.status === "catalog" || row.status === "queue_duplicate",
  ).length;

  const filteredQueue = reviewQueue.filter((row) => {
    if (filter === "new") return row.status === "new";
    if (filter === "catalog") return row.status === "catalog" || row.status === "queue_duplicate";
    if (filter === "missing") return row.status === "missing_lyrics" || !row.lyricPreview;
    return true;
  });

  const reviewPages = Math.max(1, Math.ceil(filteredQueue.length / REVIEW_PAGE_SIZE));
  const safePage = Math.min(page, reviewPages);
  const pageItems = filteredQueue.slice(
    (safePage - 1) * REVIEW_PAGE_SIZE,
    safePage * REVIEW_PAGE_SIZE,
  );

  const canRun = providers.some((provider) => provider.enabled);
  const hasActiveRun = runs.some((run) => run.status === "queued" || run.status === "running");
  const currentYear = new Date().getFullYear();

  const filterCounts = {
    all: reviewQueue.length,
    new: reviewQueue.filter((row) => row.status === "new").length,
    catalog: duplicateCount,
    missing: reviewQueue.filter((row) => row.status === "missing_lyrics" || !row.lyricPreview).length,
  };

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
        AI returns lyrics, meaning, and catalog metadata. Incomplete drafts are dropped. Known catalog
        titles are excluded from the research brief. Accept stays draft-only.
      </div>

      <section className="panel" style={{ marginTop: 18 }}>
        <h2>Research brief</h2>
        <p className="muted" style={{ fontSize: 12, marginTop: -8, marginBottom: 16, lineHeight: 1.6 }}>
          Tell the agent what to pull — for example Bollywood soundtracks from 2024–2026 in Hindi.
          Leave years blank to default to the last seven days. Max 5 candidates per run.
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
              {filteredQueue.length} shown · {reviewQueue.length} pending total
            </p>
          </div>
        </div>
        <div className="row-actions" style={{ marginBottom: 14, flexWrap: "wrap", justifyContent: "flex-start" }}>
          {(
            [
              ["all", "All"],
              ["new", "New"],
              ["catalog", "Duplicates"],
              ["missing", "Missing lyrics"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              className={filter === value ? "button compact" : "text-link"}
              href={filterHref(value)}
              style={filter === value ? undefined : { fontSize: 12, padding: "6px 10px" }}
            >
              {label} ({filterCounts[value]})
            </Link>
          ))}
        </div>
        {pageItems.length ? (
          <>
            <AIReviewTable rows={pageItems} duplicateCount={duplicateCount} />
            <AdminPagination
              page={safePage}
              pages={reviewPages}
              href={(next) => filterHref(filter, next)}
            />
          </>
        ) : (
          <p className="muted">No candidates in this filter. Run discovery or clear the filter.</p>
        )}
      </section>

      <div className="admin-grid">
        <section className="panel">
          <h2>Research runs</h2>
          <p className="muted" style={{ fontSize: 12, marginTop: -8, marginBottom: 14 }}>
            Delete finished or selected runs when you no longer need their review history. Active
            queued/running jobs cannot be deleted.
          </p>
          {runs.length ? (
            <AIRunsTable
              finishedCount={
                runs.filter((run) => run.status === "completed" || run.status === "failed").length
              }
              rows={runs.slice(0, 20).map((run): AIRunRow => {
                const { candidates, criteria, rawResponse } = parseRunPayload(run.details);
                return {
                  id: run.id,
                  summary: run.summary,
                  status: run.status,
                  source: run.source,
                  candidates: run.candidates,
                  createdAt: run.createdAt,
                  finishedAt: run.finishedAt,
                  brief: formatDiscoveryCriteria(criteria) || undefined,
                  candidateLines: candidates.map((candidate) => ({
                    title: candidate.title,
                    reviewStatus: candidate.reviewStatus,
                    songId: candidate.songId,
                  })),
                  rawResponse,
                  deletable: run.status !== "queued" && run.status !== "running",
                };
              })}
            />
          ) : (
            <p className="muted">No research runs yet.</p>
          )}
        </section>
        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <section className="panel">
            <h2>Configured providers</h2>
            {providers.map((provider) => (
              <div className="provider-card" key={provider.id}>
                <span>
                  <strong>{provider.name}</strong>
                  <small>
                    {provider.provider} · {provider.model} · key •••••••• · ≤{provider.dailyLimit}/run
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
                <input name="dailyLimit" type="number" min="1" max="5" defaultValue="5" />
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
