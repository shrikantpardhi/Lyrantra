import type { Metadata } from "next";
import { Film } from "lucide-react";
import { notFound } from "next/navigation";
import { Breadcrumbs, SongGrid } from "@/components/site";
import { getMovieBySlug } from "@/lib/repository";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = await getMovieBySlug(slug);
  if (!result) return {};
  return {
    title: `${result.movie.title} songs and lyrics`,
    description: `All songs, lyrics, translations, and credits from ${result.movie.title} (${result.movie.year}).`,
    alternates: { canonical: `/${locale}/movie/${slug}` },
    openGraph: {
      type: "website",
      url: `/${locale}/movie/${slug}`,
      title: `${result.movie.title} songs and lyrics`,
      description: result.movie.description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function MoviePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const result = await getMovieBySlug(slug);
  if (!result) notFound();
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Movie",
        name: result.movie.title,
        description: result.movie.description,
        url: `${siteUrl}/${locale}/movie/${result.movie.slug}`,
        hasPart: result.songs.map((song) => ({
          "@type": "MusicRecording",
          name: song.title,
          url: `${siteUrl}/${locale}/lyrics/${song.slug}`,
          byArtist: song.artists.map((artist) => ({
            "@type": artist.slug === "traditional" ? "MusicGroup" : "Person",
            name: artist.name,
          })),
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/${locale}` },
          { "@type": "ListItem", position: 2, name: "Movies" },
          {
            "@type": "ListItem",
            position: 3,
            name: result.movie.title,
            item: `${siteUrl}/${locale}/movie/${result.movie.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="page">
      <div className="shell">
        <Breadcrumbs items={[{ label: "Home", href: `/${locale}` }, { label: "Movies" }, { label: result.movie.title }]} />
        <header className="profile-hero">
          <span className="avatar"><Film /></span>
          <div>
            <div className="eyebrow" style={{ color: "var(--lime)" }}>{result.movie.year} soundtrack</div>
            <h1>{result.movie.title}</h1>
            <p>{result.movie.description}</p>
          </div>
        </header>
        <div className="section-heading">
          <div><div className="eyebrow">{result.songs.length} songs</div><h2>Soundtrack lyrics</h2></div>
        </div>
        <SongGrid songs={result.songs} locale={locale} />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
