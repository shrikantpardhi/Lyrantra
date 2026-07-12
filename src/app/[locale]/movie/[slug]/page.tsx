import type { Metadata } from "next";
import { Film } from "lucide-react";
import { notFound } from "next/navigation";
import { Breadcrumbs, SongGrid } from "@/components/site";
import { getMovieBySlug } from "@/lib/repository";

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
    </div>
  );
}
