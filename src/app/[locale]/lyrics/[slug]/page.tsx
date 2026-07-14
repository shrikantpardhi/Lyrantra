import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, ExternalLink, Film, Flag, Music, Tag } from "lucide-react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { submitCommentAction } from "@/app/actions";
import { LyricsViewer, ShareButton } from "@/components/interactive";
import {
  Breadcrumbs,
  PlatformLinks,
  SongGrid,
} from "@/components/site";
import { getPublishedInterpretation } from "@/lib/interpretation";
import { getComments, getSongBySlug, incrementSongViews, listSongs, slugify } from "@/lib/repository";
import { getSiteUrl } from "@/lib/site-url";

const VIEW_COOKIE_PREFIX = "lyranta_view_";
const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) return {};
  const artists = song.artists.map((artist) => artist.name).join(", ");
  const interpretation = getPublishedInterpretation(song.interpretation);
  const titleDetails = [
    song.lyrics.length > 1 ? "translation & transliteration" : "",
    interpretation ? "meaning & interpretation" : "",
  ].filter(Boolean).join(", ");
  return {
    title: `${song.title} lyrics${titleDetails ? `, ${titleDetails}` : ""}`,
    description: `${song.title} lyrics by ${artists}. ${
      interpretation?.summary ?? song.description
    }`.slice(0, 158),
    alternates: {
      canonical: `/${locale}/lyrics/${song.slug}`,
    },
    openGraph: {
      type: "article",
      url: `/${locale}/lyrics/${song.slug}`,
      title: `${song.title} lyrics${interpretation ? " and meaning" : ""} — ${artists}`,
      description: interpretation?.summary ?? song.description,
      images: song.artwork ? [song.artwork] : ["/opengraph-image"],
    },
  };
}

export default async function LyricsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ comment?: string }>;
}) {
  const [{ locale, slug }, query] = await Promise.all([params, searchParams]);
  await connection();
  const song = await getSongBySlug(slug);
  if (!song) notFound();

  const cookieStore = await cookies();
  const viewCookie = `${VIEW_COOKIE_PREFIX}${song.id}`;
  const alreadyViewed = Boolean(cookieStore.get(viewCookie)?.value);
  let viewCount = song.views;
  if (!alreadyViewed) {
    const counted = await incrementSongViews(song.id);
    if (counted) viewCount = counted.views;
    try {
      cookieStore.set(viewCookie, "1", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: VIEW_COOKIE_MAX_AGE,
      });
    } catch {
      // Cookie writes can fail in some static/edge contexts; views still persist when incremented.
    }
  }

  const [comments, related] = await Promise.all([
    getComments(song.id),
    listSongs({ genre: song.genre, limit: 4, sort: "trending" }),
  ]);
  const relatedSongs = related.items.filter((item) => item.id !== song.id).slice(0, 3);
  const artistNames = song.artists.map((artist) => artist.name).join(", ");
  const interpretation = getPublishedInterpretation(song.interpretation);
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/${locale}/lyrics/${song.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MusicRecording",
        "@id": `${canonicalUrl}#recording`,
        name: song.title,
        url: canonicalUrl,
        inLanguage: song.language,
        dateModified: song.updatedAt,
        byArtist: song.artists.map((artist) => ({
          "@type": artist.slug === "traditional" ? "MusicGroup" : "Person",
          name: artist.name,
          url: `${siteUrl}/${locale}/artist/${artist.slug}`,
        })),
        ...(song.artwork ? { image: song.artwork } : {}),
      },
    ],
  };

  return (
    <div className="page">
      <div className="shell">
        <Breadcrumbs
          items={[
            { label: "Home", href: `/${locale}` },
            { label: "Lyrics", href: `/${locale}/search` },
            { label: song.title },
          ]}
        />
        <div className="lyrics-layout">
          <article>
            <header className="song-hero">
              <Link className="eyebrow" href={`/${locale}/category/${slugify(song.category)}`}>
                {song.category}
              </Link>
              <h1>{song.title}</h1>
              {song.alternateTitle && <p className="alternate-title">{song.alternateTitle}</p>}
              <p className="artist-links">
                {song.artists.map((artist, index) => (
                  <span key={artist.id}>
                    {index > 0 && ", "}
                    <Link href={`/${locale}/artist/${artist.slug}`}>{artist.name}</Link>
                  </span>
                ))}
              </p>
              <div className="song-meta-row">
                <Link href={`/${locale}/genre/${slugify(song.genre)}`}>
                  <Music size={14} />
                  {song.genre}
                </Link>
                <Link href={`/${locale}/year/${song.releaseYear}`}>
                  <Calendar size={14} />
                  {song.releaseYear}
                </Link>
                <Link href={`/${locale}/language/${slugify(song.language)}`}>
                  <Tag size={14} />
                  {song.language}
                </Link>
                {song.movie && (
                  <Link href={`/${locale}/movie/${song.movie.slug}`}>
                    <Film size={14} />
                    {song.movie.title}
                  </Link>
                )}
                <ShareButton title={song.title} />
              </div>
            </header>

            <section className="lyrics-panel" aria-label={`${song.title} lyrics`}>
              <LyricsViewer versions={song.lyrics} />
            </section>

            {interpretation && (
              <section className="interpretation-panel">
                <div className="eyebrow">Meaning</div>
                <h2>Song interpretation</h2>
                <p className="interpretation-summary">{interpretation.summary}</p>
                {interpretation.themes.length > 0 && (
                  <p className="muted">Themes: {interpretation.themes.join(", ")}</p>
                )}
                {interpretation.culturalContext && (
                  <div className="interpretation-context">
                    <h3>Cultural and language context</h3>
                    <p>{interpretation.culturalContext}</p>
                  </div>
                )}
                {interpretation.sections.length > 0 && (
                  <div className="interpretation-sections">
                    {interpretation.sections.map((section) => (
                      <article key={section.id}>
                        <h3>{section.label}</h3>
                        <p>{section.meaning}</p>
                      </article>
                    ))}
                  </div>
                )}
                <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
                  {interpretation.disclaimer}
                  {interpretation.sourceUrl && (
                    <>
                      {" "}
                      <a className="text-link" href={interpretation.sourceUrl} target="_blank" rel="noreferrer">
                        Source <ExternalLink size={12} />
                      </a>
                    </>
                  )}
                </p>
              </section>
            )}

            {song.tags.length > 0 && (
              <div className="tag-row">
                {song.tags.map((tag) => (
                  <Link href={`/${locale}/tag/${slugify(tag)}`} key={tag}>
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            <section id="comments" className="comments-panel">
              <h2>Comments</h2>
              {query.comment === "pending" && (
                <div className="notice">Thanks — your comment is waiting for moderation.</div>
              )}
              <form className="form-grid" action={submitCommentAction}>
                <input type="hidden" name="songId" value={song.id} />
                <input type="hidden" name="slug" value={song.slug} />
                <input type="hidden" name="locale" value={locale} />
                <input type="text" name="website" className="honeypot" tabIndex={-1} autoComplete="off" />
                <label className="field">
                  <span>Name</span>
                  <input name="name" required />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input name="email" type="email" required />
                </label>
                <label className="field full">
                  <span>Comment</span>
                  <textarea name="body" required minLength={8} />
                </label>
                <button className="button compact" type="submit">
                  Submit for review
                </button>
              </form>
              <div className="comment-list">
                {comments.map((comment) => (
                  <article key={comment.id}>
                    <strong>{comment.name}</strong>
                    <small>{new Date(comment.createdAt).toLocaleString()}</small>
                    <p>{comment.body}</p>
                  </article>
                ))}
                {!comments.length && <p className="muted">No approved comments yet.</p>}
              </div>
            </section>
          </article>

          <aside className="song-aside">
            <section className="aside-card">
              <h3>Song details</h3>
              <dl className="detail-list">
                <div>
                  <dt>Artists</dt>
                  <dd>{artistNames}</dd>
                </div>
                <div>
                  <dt>Language</dt>
                  <dd>{song.language}</dd>
                </div>
                <div>
                  <dt>Genre</dt>
                  <dd>{song.genre}</dd>
                </div>
                <div>
                  <dt>Released</dt>
                  <dd>{song.releaseYear}</dd>
                </div>
                {song.movie && (
                  <div>
                    <dt>Movie</dt>
                    <dd>
                      <Link href={`/${locale}/movie/${song.movie.slug}`}>{song.movie.title}</Link>
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Reads</dt>
                  <dd>{viewCount.toLocaleString()}</dd>
                </div>
              </dl>
            </section>
            <section className="aside-card">
              <h3>Listen officially</h3>
              <PlatformLinks song={song} />
              {!song.platformLinks.length && <p className="muted">Official links are being verified.</p>}
            </section>
            <section className="aside-card">
              <h3>Found an issue?</h3>
              <p className="muted" style={{ lineHeight: 1.6, fontSize: 12, marginBottom: 14 }}>
                Help our editors keep credits and words accurate.
              </p>
              <Link
                className="text-link"
                href={`/${locale}/contact?subject=${encodeURIComponent(`Correction: ${song.title}`)}`}
              >
                <Flag size={15} /> Report a correction
              </Link>
            </section>
          </aside>
        </div>

        {relatedSongs.length > 0 && (
          <section className="page-section" style={{ paddingInline: 0 }}>
            <div className="section-heading">
              <div>
                <div className="eyebrow">Keep listening</div>
                <h2>Related lyrics</h2>
              </div>
            </div>
            <SongGrid songs={relatedSongs} locale={locale} />
          </section>
        )}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
