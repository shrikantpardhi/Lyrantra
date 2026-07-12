import { CheckCircle2, CircleAlert, Database, Globe2, KeyRound, Search } from "lucide-react";

function Status({ ready }: { ready: boolean }) {
  return ready
    ? <span className="status published"><CheckCircle2 size={11} /> ready</span>
    : <span className="status pending"><CircleAlert size={11} /> demo mode</span>;
}

export default function SettingsPage() {
  const checks = [
    { label: "Production database", detail: "PostgreSQL persistence for catalog, comments, and jobs", ready: Boolean(process.env.DATABASE_URL), icon: Database },
    { label: "Public site URL", detail: "Canonical URLs, sitemap, and social metadata", ready: Boolean(process.env.NEXT_PUBLIC_SITE_URL), icon: Globe2 },
    { label: "Authentication secret", detail: "Signed, HTTP-only administrative sessions", ready: Boolean(process.env.AUTH_SECRET), icon: KeyRound },
    { label: "Secret encryption", detail: "AES-256-GCM encryption for AI provider credentials", ready: Boolean(process.env.ENCRYPTION_KEY), icon: KeyRound },
    { label: "Search indexing", detail: "PostgreSQL multilingual simple-text index", ready: Boolean(process.env.DATABASE_URL), icon: Search },
  ];
  return (
    <>
      <header className="admin-heading">
        <div><div className="eyebrow">Environment</div><h1>Platform settings</h1><p>Production readiness without exposing secret values.</p></div>
      </header>
      <section className="panel">
        <h2>Configuration health</h2>
        {checks.map(({ label, detail, ready, icon: Icon }) => (
          <div className="provider-card" key={label}>
            <span style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Icon size={18} color="var(--green-2)" />
              <span><strong>{label}</strong><small>{detail}</small></span>
            </span>
            <Status ready={ready} />
          </div>
        ))}
      </section>
      <section className="panel" style={{ marginTop: 18 }}>
        <h2>Editorial defaults</h2>
        <p className="muted" style={{ lineHeight: 1.7 }}>
          New songs start as drafts. Comments start pending. AI discoveries always require review.
          Search and sitemap entries include published content only. API credentials are masked and
          decrypted only while a server-side job is running.
        </p>
      </section>
    </>
  );
}
