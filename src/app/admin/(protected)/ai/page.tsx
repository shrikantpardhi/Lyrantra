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
import { formatDiscoveryCriteria, parseRunDetails, parseRunPayload } from "@/lib/ai-discovery";
import { listAIProviders, listAIRuns } from "@/lib/repository";

export const maxDuration = 300;

function runStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default async function AIWorkspace() {
  const [providers, runs] = await Promise.all([listAIProviders(), listAIRuns(10)]);
  const reviewQueue = runs.flatMap((run) =>
    parseRunDetails(run.details)
      .map((candidate, index) => ({ run, candidate, index }))
      .filter(({ candidate }) => candidate.reviewStatus === "pending"),
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
      <div className="notice">
        <ShieldCheck size={16} style={{ verticalAlign: "middle", marginRight: 7 }} />
        AI returns full catalog metadata, artist bios, links, and a meaning draft for review. It never
        returns lyric text — editors paste authorized lyrics before publish.
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
        <h2>Needs review</h2>
        {reviewQueue.length ? (
          reviewQueue.map(({ run, candidate, index }) => (
            <article className="provider-card" key={`${run.id}-${index}`} style={{ alignItems: "flex-start" }}>
              <span style={{ minWidth: 0, flex: 1 }}>
                <strong>
                  {candidate.title}
                  {candidate.alternateTitle ? ` / ${candidate.alternateTitle}` : ""}
                </strong>
                <small>
                  {candidate.artists.join(", ")} · {candidate.releaseYear} · {candidate.language} ({candidate.languageCode})
                  {" · "}
                  {candidate.category} · {candidate.genre}
                  {candidate.movie ? ` · ${candidate.movie}` : ""}
                </small>
                <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.65 }}>{candidate.description}</p>
                {candidate.tags.length > 0 && (
                  <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                    Tags: {candidate.tags.join(", ")}
                  </p>
                )}
                {candidate.platformLinks.length > 0 && (
                  <p style={{ marginTop: 8, fontSize: 12, lineHeight: 1.7 }}>
                    {candidate.platformLinks.map((link) => (
                      <span key={`${link.platform}-${link.url}`} style={{ display: "inline-block", marginRight: 12 }}>
                        <a className="text-link" href={link.url} target="_blank" rel="noreferrer">
                          {link.platform}
                        </a>
                      </span>
                    ))}
                  </p>
                )}
                {candidate.interpretation && (
                  <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.65 }}>
                    <p><strong>Meaning draft:</strong> {candidate.interpretation.summary}</p>
                    {candidate.interpretation.themes.length > 0 && (
                      <p className="muted" style={{ marginTop: 6 }}>
                        Themes: {candidate.interpretation.themes.join(", ")}
                      </p>
                    )}
                    {candidate.interpretation.culturalContext && (
                      <p style={{ marginTop: 6 }}>{candidate.interpretation.culturalContext}</p>
                    )}
                    {candidate.interpretation.sections.length > 0 && (
                      <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                        {candidate.interpretation.sections.map((section) => (
                          <li key={`${section.label}-${section.meaning.slice(0, 24)}`}>
                            <strong>{section.label}:</strong> {section.meaning}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <p className="muted" style={{ marginTop: 10, fontSize: 11 }}>
                  Lyric editions planned:{" "}
                  {candidate.lyricEditions.map((edition) => `${edition.language} (${edition.type})`).join(", ")}
                  {" · "}
                  Run {new Date(run.createdAt).toLocaleString()}
                </p>
              </span>
              <span className="row-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
                <form action={acceptAICandidateAction}>
                  <input type="hidden" name="runId" value={run.id} />
                  <input type="hidden" name="index" value={String(index)} />
                  <PendingSubmitButton className="button compact" type="submit" style={{ width: "100%" }} pendingLabel="Creating…">
                    <Check size={14} /> Accept draft
                  </PendingSubmitButton>
                </form>
                <form action={rejectAICandidateAction}>
                  <input type="hidden" name="runId" value={run.id} />
                  <input type="hidden" name="index" value={String(index)} />
                  <PendingSubmitButton type="submit" aria-label={`Reject ${candidate.title}`} pendingLabel="Rejecting…">
                    <X size={12} /> Reject
                  </PendingSubmitButton>
                </form>
              </span>
            </article>
          ))
        ) : (
          <p className="muted">No candidates waiting. Run discovery to collect official metadata for review.</p>
        )}
      </section>

      <div className="admin-grid">
        <section className="panel">
          <h2>Research runs</h2>
          <p className="muted" style={{ fontSize: 12, marginTop: -8, marginBottom: 14 }}>
            Latest 10 only. Status updates to failed, needs review, or completed when the background job finishes.
          </p>
          {runs.map((run) => {
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
                          <span className={`status ${candidate.reviewStatus === "pending" ? "needs_review" : candidate.reviewStatus === "accepted" ? "completed" : "failed"}`}>
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
                    <pre className="code-block" style={{ marginTop: 12 }}>{rawResponse}</pre>
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
                    <PendingSubmitButton type="submit" aria-label={provider.enabled ? "Pause provider" : "Enable provider"} pendingLabel="…">
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
