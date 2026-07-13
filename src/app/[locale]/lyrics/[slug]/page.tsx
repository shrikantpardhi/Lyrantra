import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Film, Flag, Music, Tag } from "lucide-react";
import { notFound } from "next/navigation";
import { submitCommentAction } from "@/app/actions";
import { LyricsViewer, ShareButton } from "@/components/interactive";
import {
  Breadcrumbs,
  PlatformLinks,
  SongGrid,
} from "@/components/site";
import { getComments, getSongBySlug, listSongs, slugify } from "@/lib/repository";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) return {};
  const artists = song.artists.map((artist) => artist.name).join(", ");
  return {
    title: `${song.title} lyrics${song.lyrics.length > 1 ? ", translation & transliteration" : ""}`,
    description: `${song.title} lyrics by ${artists}. ${song.description}`.slice(0, 158),
    alternates: {
      canonical: `/${locale}/lyrics/${song.slug}`,
    },
    openGraph: {
      type: "article",
      url: `/${locale}/lyrics/${song.slug}`,
      title: `${song.title} lyrics — ${artists}`,
      description: song.description,
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
  const song = await getSongBySlug(slug);
  if (!song) notFound();
  const [comments, related] = await Promise.all([
    getComments(song.id),
    listSongs({ genre: song.genre, limit: 4 }),
  ]);
  const relatedSongs = related.items.filter((item) => item.id !== song.id).slice(0, 3);
  const artistNames = song.artists.map((artist) => artist.name).join(", ");
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MusicRecording",
        name: song.title,
        url: `${siteUrl}/${locale}/lyrics/${song.slug}`,
        inLanguage: song.language,
        dateModified: song.updatedAt,
        byArtist: song.artists.map((artist) => ({
          "@type": artist.slug === "traditional" ? "MusicGroup" : "Person",
          name: artist.name,
          url: `${siteUrl}/${locale}/artist/${artist.slug}`,
        })),
        recordingOf: {
          "@type": "MusicComposition",
          name: song.title,
          lyrics: song.lyrics.map((lyric) => ({
            "@type": "CreativeWork",
            inLanguage: lyric.languageCode,
            text: lyric.text,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/${locale}` },
          { "@type": "ListItem", position: 2, name: "Lyrics", item: `${siteUrl}/${locale}/search` },
          {
            "@type": "ListItem",
            position: 3,
            name: song.title,
            item: `${siteUrl}/${locale}/lyrics/${song.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="page">
      <div className="shell">
        <Breadcrumbs items={[
          { label: "Home", href: `/${locale}` },
          { label: "Lyrics", href: `/${locale}/search` },
          { label: song.title },
        ]} />
        <div className="lyrics-layout">
          <article>
            <header className="song-title">
              <div className="song-title-row">
                <div>
                  <Link className="eyebrow" href={`/${locale}/category/${slugify(song.category)}`}>{song.category}</Link>
                  <h1>{song.title}</h1>
                  {song.alternateTitle && <p className="alternate-title">{song.alternateTitle}</p>}
                </div>
                <ShareButton title={song.title} />
              </div>
              <div className="song-byline">
                <span>by</span>
                {song.artists.map((artist, index) => (
                  <span key={artist.id}>
                    {index > 0 && " & "}
                    <Link href={`/${locale}/artist/${artist.slug}`}>{artist.name}</Link>
                  </span>
                ))}
              </div>
              <div className="meta-pills">
                <Link href={`/${locale}/genre/${slugify(song.genre)}`}><Music size={14} />{song.genre}</Link>
                <Link href={`/${locale}/year/${song.releaseYear}`}><Calendar size={14} />{song.releaseYear}</Link>
                <Link href={`/${locale}/language/${slugify(song.language)}`}><Tag size={14} />{song.language}</Link>
                {song.movie && <span><Film size={14} />{song.movie.title}</span>}
              </div>
            </header>

            <section className="lyrics-panel" aria-label={`${song.title} lyrics`}>
              <LyricsViewer versions={song.lyrics} />
            </section>

            <section className="song-description">
              <h2>About this song</h2>
              <p>{song.description}</p>
              <div className="tag-list">
                {song.tags.map((tag) => (
                  <Link href={`/${locale}/tag/${slugify(tag)}`} key={tag}>#{tag}</Link>
                ))}
              </div>
            </section>

            <section className="comments" id="comments">
              <h2>Listener comments</h2>
              <p className="muted">Join the conversation. Every comment is reviewed before publication.</p>
              {query.comment === "pending" && (
                <div className="notice" style={{ marginTop: 18 }}>Thanks—your comment is awaiting review.</div>
              )}
              <div className="comment-list">
                {comments.map((comment) => (
                  <article className="comment" key={comment.id}>
                    <header><strong>{comment.name}</strong><time>{new Date(comment.createdAt).toLocaleDateString()}</time></header>
                    <p>{comment.body}</p>
                  </article>
                ))}
                {!comments.length && <p className="muted">Be the first to leave a thoughtful comment.</p>}
              </div>
              <form className="form-card form-grid" action={submitCommentAction}>
                <input type="hidden" name="songId" value={song.id} />
                <input type="hidden" name="slug" value={song.slug} />
                <input type="hidden" name="locale" value={locale} />
                <label className="field"><span>Name</span><input name="name" required minLength={2} /></label>
                <label className="field"><span>Email (never published)</span><input name="email" type="email" required /></label>
                <label className="field full"><span>Comment</span><textarea name="body" required minLength={3} /></label>
                <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
                <div><button className="button" type="submit">Send for review</button></div>
              </form>
            </section>
          </article>

          <aside className="song-aside">
            <section className="aside-card">
              <h3>Song details</h3>
              <dl className="detail-list">
                <div><dt>Artists</dt><dd>{artistNames}</dd></div>
                <div><dt>Language</dt><dd>{song.language}</dd></div>
                <div><dt>Genre</dt><dd>{song.genre}</dd></div>
                <div><dt>Released</dt><dd>{song.releaseYear}</dd></div>
                {song.movie && <div><dt>Movie</dt><dd><Link href={`/${locale}/movie/${song.movie.slug}`}>{song.movie.title}</Link></dd></div>}
                <div><dt>Reads</dt><dd>{song.views.toLocaleString()}</dd></div>
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
              <Link className="text-link" href={`/${locale}/contact?subject=${encodeURIComponent(`Correction: ${song.title}`)}`}>
                <Flag size={15} /> Report a correction
              </Link>
            </section>
          </aside>
        </div>

        {relatedSongs.length > 0 && (
          <section className="page-section" style={{ paddingBottom: 0 }}>
            <div className="section-heading"><div><div className="eyebrow">Keep listening</div><h2>Related lyrics</h2></div></div>
            <SongGrid songs={relatedSongs} locale={locale} />
          </section>
        )}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
