import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy, terms and copyright",
  description: "Lyranta privacy, community, copyright, and takedown principles.",
  alternates: { canonical: "/en/legal" },
};

export default function LegalPage() {
  return (
    <div className="page">
      <article className="narrow prose">
        <div className="eyebrow">Trust center</div>
        <h1>Privacy, terms and copyright</h1>
        <p>
          This launch version summarizes Lyranta’s operating principles. Territory-specific
          legal terms and licensing agreements must be reviewed by qualified counsel before a
          commercial catalog is published.
        </p>
        <h2>Copyright and licensing</h2>
        <p>
          Full lyrics are published only when they are public domain, provided by an authorized
          rights holder or licensed catalog partner, or created for Lyranta. Attribution does
          not replace permission. AI systems are not permitted to scrape or reconstruct protected lyrics.
        </p>
        <h2>Meaning and interpretation</h2>
        <p>
          Song meanings are original editorial commentary, not official artist statements unless
          an authoritative source is explicitly linked. Interpretations are reviewed separately
          from lyrics and may reflect one reasonable reading rather than a definitive explanation.
        </p>
        <h2>Takedown and correction requests</h2>
        <p>
          Rights holders can contact us with the work, ownership basis, affected URLs, and contact
          details. Requests receive an audit record and priority review. Content may be restricted
          while rights are verified.
        </p>
        <h2>Privacy</h2>
        <p>
          We collect information submitted through comments and contact forms, basic security
          logs, and privacy-conscious product analytics. Comment email addresses are never shown
          publicly. Data is retained only for moderation, support, legal, and security needs.
        </p>
        <h2>Community rules</h2>
        <ul>
          <li>Be constructive and discuss the song, translation, or credits.</li>
          <li>Do not post personal data, spam, harassment, or unauthorized lyrics.</li>
          <li>Moderators may reject content that creates legal, safety, or quality risks.</li>
        </ul>
      </article>
    </div>
  );
}
