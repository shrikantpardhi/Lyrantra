import type { Metadata } from "next";
import { Filter, Search } from "lucide-react";
import { Pagination, SongGrid } from "@/components/site";
import { getFacets, listSongs } from "@/lib/repository";

export const metadata: Metadata = {
  title: "Search and browse lyrics",
  description: "Search LyricsPro by song, artist, movie, lyric text, language, category, genre, or year.",
  robots: { index: false, follow: true },
};

type Query = {
  q?: string;
  category?: string;
  genre?: string;
  language?: string;
  year?: string;
  page?: string;
};

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const page = Math.max(1, Number(query.page) || 1);
  const [results, facets] = await Promise.all([
    listSongs({
      query: query.q,
      category: query.category,
      genre: query.genre,
      language: query.language,
      year: query.year,
      page,
      limit: 12,
    }),
    getFacets(),
  ]);

  function pageHref(nextPage: number) {
    const values = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value && key !== "page") values.set(key, value);
    });
    values.set("page", String(nextPage));
    return `/${locale}/search?${values}`;
  }

  return (
    <div className="page">
      <div className="shell">
        <div className="eyebrow">Global catalog search</div>
        <h1 className="search-title">{query.q ? `Results for “${query.q}”` : "Find your next lyric"}</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          {results.total} result{results.total === 1 ? "" : "s"} across songs, artists, movies, and lyric text.
        </p>

        <form className="filter-bar">
          <label style={{ display: "contents" }}>
            <span className="honeypot">Search query</span>
            <input name="q" placeholder="Search everything…" defaultValue={query.q} />
          </label>
          <select name="category" defaultValue={query.category || ""} aria-label="Filter by category">
            <option value="">All categories</option>
            {facets.categories.map((value) => <option key={value}>{value}</option>)}
          </select>
          <select name="genre" defaultValue={query.genre || ""} aria-label="Filter by genre">
            <option value="">All genres</option>
            {facets.genres.map((value) => <option key={value}>{value}</option>)}
          </select>
          <select name="language" defaultValue={query.language || ""} aria-label="Filter by language">
            <option value="">All languages</option>
            {facets.languages.map((value) => <option key={value}>{value}</option>)}
          </select>
          <select name="year" defaultValue={query.year || ""} aria-label="Filter by release year">
            <option value="">Any year</option>
            {facets.years.map((value) => <option key={value}>{value}</option>)}
          </select>
          <button className="button compact" type="submit"><Filter size={16} /> Apply</button>
        </form>

        {query.q && results.total === 0 && (
          <div className="notice">
            Try fewer words, an alternate spelling, or search by the artist or movie name.
          </div>
        )}
        <SongGrid songs={results.items} locale={locale} />
        <Pagination pagination={results} href={pageHref} />
        {results.total === 0 && !query.q && (
          <div style={{ textAlign: "center", marginTop: 25 }}>
            <Search size={18} /> Start with a song, artist, or memorable line.
          </div>
        )}
      </div>
    </div>
  );
}
