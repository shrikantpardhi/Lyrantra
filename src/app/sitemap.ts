import type { MetadataRoute } from "next";
import {
  getFacets,
  listArtists,
  listMovies,
  listPublishedSongs,
  slugify,
} from "@/lib/repository";
import { getSiteUrl } from "@/lib/site-url";
import { locales } from "@/lib/types";

export const revalidate = 3600;
const MIN_INDEXABLE_COLLECTION_SIZE = 2;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [songs, artists, movies, facets] = await Promise.all([
    listPublishedSongs(),
    listArtists(),
    listMovies(),
    getFacets(),
  ]);
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    entries.push(
      { url: `${base}/${locale}`, changeFrequency: "daily", priority: 1 },
      { url: `${base}/${locale}/about`, changeFrequency: "monthly", priority: 0.5 },
      { url: `${base}/${locale}/contact`, changeFrequency: "yearly", priority: 0.3 },
      { url: `${base}/${locale}/legal`, changeFrequency: "yearly", priority: 0.3 },
      ...songs.map((song) => ({
        url: `${base}/${locale}/lyrics/${song.slug}`,
        lastModified: new Date(song.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...artists.map((artist) => ({
        url: `${base}/${locale}/artist/${artist.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.65,
      })),
      ...movies.map((movie) => ({
        url: `${base}/${locale}/movie/${movie.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...facets.categories.filter((value) => facets.counts.categories[value] >= MIN_INDEXABLE_COLLECTION_SIZE).map((value) => ({
        url: `${base}/${locale}/category/${slugify(value)}`,
        changeFrequency: "weekly" as const,
        priority: 0.65,
      })),
      ...facets.genres.filter((value) => facets.counts.genres[value] >= MIN_INDEXABLE_COLLECTION_SIZE).map((value) => ({
        url: `${base}/${locale}/genre/${slugify(value)}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...facets.languages.filter((value) => facets.counts.languages[value] >= MIN_INDEXABLE_COLLECTION_SIZE).map((value) => ({
        url: `${base}/${locale}/language/${slugify(value)}`,
        changeFrequency: "weekly" as const,
        priority: 0.65,
      })),
      ...facets.tags.filter((value) => facets.counts.tags[value] >= MIN_INDEXABLE_COLLECTION_SIZE).map((value) => ({
        url: `${base}/${locale}/tag/${slugify(value)}`,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
      ...facets.years.filter((value) => facets.counts.years[value] >= MIN_INDEXABLE_COLLECTION_SIZE).map((value) => ({
        url: `${base}/${locale}/year/${value}`,
        changeFrequency: "monthly" as const,
        priority: 0.45,
      })),
    );
  }
  return entries;
}
