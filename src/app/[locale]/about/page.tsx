import type { Metadata } from "next";
import { CheckCircle2, Globe2, HeartHandshake, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "About us",
  description: "Learn why Lyranta is building a trusted, multilingual home for song lyrics and music context.",
  alternates: { canonical: "/en/about" },
};

export default function AboutPage() {
  return (
    <div className="page">
      <article className="narrow prose">
        <div className="eyebrow">About Lyranta</div>
        <h1>Music deserves more than a wall of words.</h1>
        <p>
          Lyranta is building a trustworthy place to understand songs across languages. We pair
          carefully sourced lyrics with translations, transliterations, credits, human-reviewed
          interpretations, and links to the platforms that support artists.
        </p>
        <h2>What we believe</h2>
        <div className="category-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginTop: 18 }}>
          <div className="category-card"><Globe2 /><strong>Language opens music</strong><span>Translations should preserve meaning and cultural context.</span></div>
          <div className="category-card"><ShieldCheck /><strong>Accuracy earns trust</strong><span>Sources, corrections, and editorial review are visible.</span></div>
          <div className="category-card"><HeartHandshake /><strong>Artists come first</strong><span>We prioritize licensing, attribution, and official listening links.</span></div>
          <div className="category-card"><CheckCircle2 /><strong>AI needs editors</strong><span>Automation assists research; people decide what gets published.</span></div>
        </div>
        <h2>Our editorial promise</h2>
        <p>
          We do not treat scraped or generated lyrics as verified content. Every publication must
          have an authorized source, a clear rights basis, and accountable editorial ownership.
          Interpretations are separately reviewed, clearly labeled as editorial analysis, and may
          differ from an artist’s intended meaning. Corrections are reviewed by our editors.
        </p>
      </article>
    </div>
  );
}
