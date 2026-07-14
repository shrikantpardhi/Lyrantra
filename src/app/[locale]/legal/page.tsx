import type { Metadata } from "next";
import Link from "next/link";

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
          This page explains how Lyranta handles content ownership, privacy, and removal requests.
          Territory-specific licensing should still be reviewed by qualified counsel before a
          commercial catalog is published.
        </p>

        <h2>Copyright and ownership</h2>
        <p>
          Lyrics, compositions, and related creative works remain the property of their writers,
          artists, publishers, labels, and other rights holders. Lyranta does not claim ownership
          of third-party song content displayed on this website. Publication on Lyranta is for
          reference and discovery only and does not transfer copyright to Lyranta.
        </p>
        <p>
          We aim to publish lyrics only when they are public domain, provided by an authorized
          rights holder or licensed partner, or otherwise cleared for display. Attribution and
          credit do not replace permission.
        </p>

        <h2>Meaning and interpretation</h2>
        <p>
          Song meanings are original editorial commentary by Lyranta editors, not official artist
          statements unless an authoritative source is explicitly linked. Interpretations are
          reviewed separately from lyrics and may reflect one reasonable reading rather than a
          definitive explanation.
        </p>

        <h2>Removal and correction requests</h2>
        <p>
          If you are a rights holder, writer, artist, or authorized representative and want content
          removed or corrected, contact us through the{" "}
          <Link href="/en/contact?subject=Copyright%20removal%20request">Contact</Link> form.
          Include the work title, ownership basis, affected URLs, and a reachable email address.
          Requests are reviewed with priority, and content may be restricted while rights are
          verified.
        </p>

        <h2>Privacy</h2>
        <p>
          We collect information submitted through comments and contact forms, basic security
          logs, and privacy-conscious product analytics. Comment email addresses are never shown
          publicly. Contact and removal emails are used only to respond to your request and keep
          an audit trail for moderation, support, legal, and security needs.
        </p>
        <p>
          We do not sell personal data. Data is retained only as long as needed for those purposes
          or as required by law.
        </p>

        <h2>Community rules</h2>
        <ul>
          <li>Be constructive and discuss the song, translation, or credits.</li>
          <li>Do not post personal data, spam, harassment, or unauthorized lyrics.</li>
          <li>Moderators may reject content that creates legal, safety, or quality risks.</li>
          <li>For copyright removal or privacy concerns, use Contact rather than public comments.</li>
        </ul>
      </article>
    </div>
  );
}
