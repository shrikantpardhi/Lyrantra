import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, Pagination, SongGrid } from "@/components/site";
import { getArtistBySlug, listArtistSongs } from "@/lib/repository";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const [{ locale, slug }, query] = await Promise.all([params, searchParams]);
  const artist = await getArtistBySlug(slug);
  if (!artist) return {};
  const page = Math.max(1, Number(query.page) || 1);
  const suffix = page > 1 ? ` — Page ${page}` : "";
  const url = `/${locale}/artist/${artist.slug}${page > 1 ? `?page=${page}` : ""}`;
  return {
    title: `${artist.name} songs and lyrics${suffix}`,
    description: `Browse ${artist.name} songs, lyrics, translations, credits, and official listening links. ${artist.bio}`,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      url,
      title: `${artist.name} songs and lyrics${suffix}`,
      description: artist.bio,
      images: ["/opengraph-image"],
    },
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
  if (page > songs.pages && songs.total > 0) notFound();
  const siteUrl = getSiteUrl();

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
          <p>Collaborations and featured appearances are included through Lyrantra’s multi-artist credits.</p>
        </div>
        <SongGrid songs={songs.items} locale={locale} />
        <Pagination pagination={songs} href={(next) => `/${locale}/artist/${slug}?page=${next}`} />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": artist.slug === "traditional" ? "MusicGroup" : "Person",
                name: artist.name,
                description: artist.bio,
                url: `${siteUrl}/${locale}/artist/${artist.slug}`,
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/${locale}` },
                  { "@type": "ListItem", position: 2, name: "Artists" },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: artist.name,
                    item: `${siteUrl}/${locale}/artist/${artist.slug}`,
                  },
                ],
              },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
