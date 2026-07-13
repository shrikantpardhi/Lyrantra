import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, Pagination, SongGrid } from "@/components/site";
import { getFacets, listSongs, slugify } from "@/lib/repository";
import { getSiteUrl } from "@/lib/site-url";

const facetLabels = {
  category: "Category",
  genre: "Genre",
  language: "Language",
  tag: "Tag",
  year: "Release year",
} as const;

type Facet = keyof typeof facetLabels;

async function resolveFacet(facet: string, slug: string) {
  if (!(facet in facetLabels)) return undefined;
  const values = await getFacets();
  const source =
    facet === "category"
      ? values.categories
      : facet === "genre"
        ? values.genres
        : facet === "language"
          ? values.languages
          : facet === "tag"
            ? values.tags
            : values.years;
  const counts =
    facet === "category"
      ? values.counts.categories
      : facet === "genre"
        ? values.counts.genres
        : facet === "language"
          ? values.counts.languages
          : facet === "tag"
            ? values.counts.tags
            : values.counts.years;
  const value = source.find((item) => slugify(item) === slug);
  return value ? { value, count: counts[value] ?? 0 } : undefined;
}

function description(facet: Facet, value: string) {
  const descriptions = {
    category: `Explore reviewed ${value} song lyrics with translations, artist credits, release information, and official listening links.`,
    genre: `Discover ${value} lyrics across artists, languages, movies, and release years on LyricsPro.`,
    language: `Browse ${value} song lyrics, available translations, transliterations, credits, and song stories.`,
    tag: `Songs and lyrics connected with ${value}, selected from the reviewed LyricsPro catalog.`,
    year: `Browse songs released in ${value}, including lyrics, translations, credits, and official links.`,
  };
  return descriptions[facet];
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; facet: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const [{ locale, facet, slug }, query] = await Promise.all([params, searchParams]);
  const resolved = await resolveFacet(facet, slug);
  if (!resolved || !(facet in facetLabels)) return {};
  const { value } = resolved;
  const page = Math.max(1, Number(query.page) || 1);
  const suffix = page > 1 ? ` — Page ${page}` : "";
  return {
    title: `${value} song lyrics${suffix}`,
    description: description(facet as Facet, value),
    robots: resolved.count >= 2 ? { index: true, follow: true } : { index: false, follow: true },
    alternates: {
      canonical: `/${locale}/${facet}/${slug}${page > 1 ? `?page=${page}` : ""}`,
    },
    openGraph: {
      type: "website",
      url: `/${locale}/${facet}/${slug}${page > 1 ? `?page=${page}` : ""}`,
      title: `${value} song lyrics${suffix}`,
      description: description(facet as Facet, value),
      images: ["/opengraph-image"],
    },
  };
}

export default async function FacetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; facet: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ locale, facet, slug }, query] = await Promise.all([params, searchParams]);
  if (!(facet in facetLabels)) notFound();
  const resolved = await resolveFacet(facet, slug);
  if (!resolved) notFound();
  const { value } = resolved;
  const page = Math.max(1, Number(query.page) || 1);
  const filters = { page, limit: 12 } as {
    page: number;
    limit: number;
    category?: string;
    genre?: string;
    language?: string;
    tag?: string;
    year?: string;
  };
  if (facet === "category") filters.category = value;
  if (facet === "genre") filters.genre = value;
  if (facet === "language") filters.language = value;
  if (facet === "tag") filters.tag = value;
  if (facet === "year") filters.year = value;
  const songs = await listSongs(filters);
  if (page > songs.pages && songs.total > 0) notFound();

  const canonicalPath = `/${locale}/${facet}/${slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${value} song lyrics`,
    description: description(facet as Facet, value),
    url: `${getSiteUrl()}${canonicalPath}${page > 1 ? `?page=${page}` : ""}`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${getSiteUrl()}/${locale}` },
        { "@type": "ListItem", position: 2, name: facetLabels[facet as Facet] },
        {
          "@type": "ListItem",
          position: 3,
          name: value,
          item: `${getSiteUrl()}${canonicalPath}`,
        },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: songs.items.map((song, index) => ({
        "@type": "ListItem",
        position: (page - 1) * 12 + index + 1,
        url: `${getSiteUrl()}/${locale}/lyrics/${song.slug}`,
        name: song.title,
      })),
    },
  };

  return (
    <div className="page">
      <div className="shell">
        <Breadcrumbs
          items={[
            { label: "Home", href: `/${locale}` },
            { label: facetLabels[facet as Facet] },
            { label: value },
          ]}
        />
        <div className="eyebrow">{facetLabels[facet as Facet]}</div>
        <h1 className="search-title">{value} song lyrics</h1>
        <p className="muted" style={{ margin: "12px 0 32px", maxWidth: 720, lineHeight: 1.7 }}>
          {description(facet as Facet, value)}
        </p>
        <SongGrid songs={songs.items} locale={locale} />
        <Pagination
          pagination={songs}
          href={(nextPage) => `${canonicalPath}${nextPage > 1 ? `?page=${nextPage}` : ""}`}
        />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
