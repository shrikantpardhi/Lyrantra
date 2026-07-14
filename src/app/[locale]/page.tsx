import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenText, Globe2, Headphones, Search, Sparkles, Tags } from "lucide-react";
import { ArtistCard, SongGrid } from "@/components/site";
import { getFacets, listArtists, listSongs, slugify } from "@/lib/repository";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Lyrics, translations and the stories behind songs",
  description:
    "Search reviewed multilingual lyrics, translations, transliterations, artist credits, movie songs, and official listening links.",
  alternates: { canonical: "/en" },
};

export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [{ items: songs }, artists, facets] = await Promise.all([
    listSongs({ limit: 6 }),
    listArtists(),
    getFacets(),
  ]);
  const featuredArtists = artists.slice(0, 8);
  const siteUrl = getSiteUrl();

  return (
    <>
      <section className="hero">
        <div className="shell hero-inner">
          <div className="hero-copy">
            <div className="eyebrow" style={{ color: "var(--lime)", marginBottom: 16 }}>
              Every language. Every feeling.
            </div>
            <h1>Find the words behind <em>every song.</em></h1>
            <p>
              Accurate lyrics, thoughtful translations, artist credits, and the stories that make
              music matter—all in one beautifully simple place.
            </p>
            <form className="hero-search" action={`/${locale}/search`}>
              <input name="q" placeholder="Search a song, artist, movie, or lyric…" aria-label="Search lyrics" />
              <button className="button" type="submit"><Search size={18} /> Search</button>
            </form>
            <div className="quick-filters">
              <span>Popular:</span>
              {facets.categories.slice(0, 4).map((category) => (
                <Link key={category} href={`/${locale}/category/${slugify(category)}`}>
                  {category}
                </Link>
              ))}
            </div>
          </div>
          <div className="hero-stats" aria-label="Lyranta catalog highlights">
            <div><BookOpenText /><span><strong>{songs.length}+</strong>published songs</span></div>
            <div><Globe2 /><span><strong>{facets.languages.length}</strong>languages</span></div>
            <div><Sparkles /><span><strong>Human</strong>reviewed</span></div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="shell">
          <div className="section-heading">
            <div><div className="eyebrow">Listeners love</div><h2>Trending lyrics</h2></div>
            <Link className="text-link" href={`/${locale}/search`}>Browse everything <ArrowRight size={16} /></Link>
          </div>
          <SongGrid songs={songs} locale={locale} />
        </div>
      </section>

      <section className="page-section soft">
        <div className="shell">
          <div className="section-heading">
            <div><div className="eyebrow">Find your sound</div><h2>Browse by mood and moment</h2></div>
            <p>Curated categories make discovery useful without creating thin, duplicate filter pages.</p>
          </div>
          <div className="category-grid">
            {facets.categories.map((category, index) => {
              const icons = [Headphones, Sparkles, Tags, BookOpenText];
              const Icon = icons[index % icons.length];
              return (
                <Link className="category-card" key={category} href={`/${locale}/category/${slugify(category)}`}>
                  <Icon />
                  <span><strong>{category}</strong><span>Explore the collection →</span></span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="shell">
          <div className="section-heading">
            <div><div className="eyebrow">Voices worth following</div><h2>Featured artists</h2></div>
          </div>
          <div className="artist-grid">
            {featuredArtists.map((artist) => <ArtistCard artist={artist} locale={locale} key={artist.id} />)}
          </div>
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Lyranta",
            url: `${siteUrl}/${locale}`,
            description: "Reviewed multilingual lyrics, translations, credits, and song stories.",
            publisher: {
              "@type": "Organization",
              name: "Lyranta",
              url: siteUrl,
            },
          }).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
