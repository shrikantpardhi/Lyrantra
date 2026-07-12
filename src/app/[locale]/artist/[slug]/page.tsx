import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, Pagination, SongGrid } from "@/components/site";
import { getArtistBySlug, listArtistSongs } from "@/lib/repository";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) return {};
  return {
    title: `${artist.name} songs and lyrics`,
    description: `Browse ${artist.name} songs, lyrics, translations, credits, and official listening links. ${artist.bio}`,
    alternates: { canonical: `/${locale}/artist/${artist.slug}` },
  };
}

export default async function ArtistPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ locale, slug }, query] = await Promise.all([params, searchParams]);
  const page = Math.max(1, Number(query.page) || 1);
  const result = await listArtistSongs(slug, page, 8);
  if (!result) notFound();
  const { artist, songs } = result;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <div className="page">
      <div className="shell">
        <Breadcrumbs items={[{ label: "Home", href: `/${locale}` }, { label: "Artists" }, { label: artist.name }]} />
        <header className="profile-hero">
          <span className="avatar">{artist.name.slice(0, 1)}</span>
          <div>
            <div className="eyebrow" style={{ color: "var(--lime)" }}>Artist profile</div>
            <h1>{artist.name}</h1>
            <p>{artist.bio}</p>
          </div>
        </header>
        <div className="section-heading">
          <div><div className="eyebrow">{songs.total} linked songs</div><h2>Lyrics by {artist.name}</h2></div>
          <p>Collaborations and featured appearances are included through LyricsPro’s multi-artist credits.</p>
        </div>
        <SongGrid songs={songs.items} locale={locale} />
        <Pagination pagination={songs} href={(next) => `/${locale}/artist/${slug}?page=${next}`} />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": artist.slug === "traditional" ? "MusicGroup" : "Person",
            name: artist.name,
            description: artist.bio,
            url: `${siteUrl}/${locale}/artist/${artist.slug}`,
          }).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
