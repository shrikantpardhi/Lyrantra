import { Bot, KeyRound, Pause, Play, ShieldCheck, Trash2 } from "lucide-react";
import {
  deleteProviderAction,
  runAIAction,
  saveProviderAction,
  toggleProviderAction,
} from "@/app/actions";
import { listAIProviders, listAIRuns } from "@/lib/repository";

export default async function AIWorkspace({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [providers, runs, query] = await Promise.all([listAIProviders(), listAIRuns(), searchParams]);
  return (
    <>
      <header className="admin-heading">
        <div><div className="eyebrow">Admin-initiated research</div><h1>AI workspace</h1><p>Sign in and start metadata research when you need it. Nothing runs on a schedule.</p></div>
        <form action={runAIAction}><button className="button compact" type="submit" disabled={!providers.some((provider) => provider.enabled)}><Play size={15} /> Run discovery now</button></form>
      </header>
      {query.notice && <div className="notice">{query.notice}</div>}
      <div className="notice"><ShieldCheck size={16} style={{ verticalAlign: "middle", marginRight: 7 }} />
        Runs create cited metadata candidates for review. They never auto-publish or fetch lyric text.
      </div>
      <div className="admin-grid">
        <section className="panel">
          <h2>Research runs</h2>
          {runs.map((run) => (
            <article className="provider-card" key={run.id} style={{ alignItems: "flex-start" }}>
              <span style={{ minWidth: 0 }}>
                <strong>{run.summary}</strong>
                <small>{new Date(run.createdAt).toLocaleString()} · {run.source} · {run.candidates} candidates</small>
                {run.details && <pre className="code-block" style={{ marginTop: 12 }}>{run.details}</pre>}
              </span>
              <span className={`status ${run.status}`}>{run.status.replace("_", " ")}</span>
            </article>
          ))}
          {!runs.length && <p className="muted">No research runs yet.</p>}
        </section>
        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <section className="panel">
            <h2>Configured providers</h2>
            {providers.map((provider) => (
              <div className="provider-card" key={provider.id}>
                <span><strong>{provider.name}</strong><small>{provider.provider} · {provider.model} · key ••••••••</small></span>
                <span className="row-actions">
                  <span className={`status ${provider.enabled ? "published" : ""}`}>{provider.enabled ? "active" : "off"}</span>
                  <form action={toggleProviderAction}>
                    <input type="hidden" name="id" value={provider.id} />
                    <input type="hidden" name="enabled" value={String(!provider.enabled)} />
                    <button type="submit" aria-label={provider.enabled ? "Pause provider" : "Enable provider"}>
                      {provider.enabled ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                  </form>
                  <form action={deleteProviderAction}>
                    <input type="hidden" name="id" value={provider.id} />
                    <button type="submit" aria-label="Delete provider"><Trash2 size={12} /></button>
                  </form>
                </span>
              </div>
            ))}
            {!providers.length && <p className="muted">Add a provider to enable discovery.</p>}
          </section>
          <section className="panel">
            <h2><KeyRound size={17} style={{ verticalAlign: "middle", marginRight: 7 }} />Add provider</h2>
            <form className="form-grid" action={saveProviderAction}>
              <label className="field full"><span>Configuration name</span><input name="name" placeholder="Editorial Gemini" required /></label>
              <label className="field"><span>Provider</span>
                <select name="provider" defaultValue="gemini">
                  <option value="gemini">Gemini + Google Search</option>
                  <option value="openai">OpenAI + web search</option>
                  <option value="anthropic">Anthropic / compatible</option>
                  <option value="custom">Custom compatible API</option>
                </select>
              </label>
              <label className="field"><span>Candidates per run</span><input name="dailyLimit" type="number" min="1" max="20" defaultValue="5" /></label>
              <label className="field full"><span>Model ID</span><input name="model" placeholder="Use a current search-capable model ID" required /></label>
              <label className="field full"><span>API key</span><input name="apiKey" type="password" autoComplete="new-password" required /></label>
              <label className="field full"><span>Custom HTTPS base URL</span><input name="baseUrl" type="url" placeholder="Optional for Gemini and OpenAI" /></label>
              <button className="button compact" type="submit"><Bot size={15} /> Encrypt and save</button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
