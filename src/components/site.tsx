import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Disc3,
  ExternalLink,
  Headphones,
  Languages,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Mail,
  MessageSquare,
  Music2,
  Search,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import type { Artist, Paginated, Song } from "@/lib/types";
import { logoutAction } from "@/app/actions";
import { slugify } from "@/lib/repository";

export function Logo({ admin = false }: { admin?: boolean }) {
  return (
    <Link href={admin ? "/admin" : "/en"} className="logo" aria-label="Lyranta home">
      <span className="logo-mark">
        <Music2 size={20} />
      </span>
      <span>Lyra<span>nta</span></span>
      {admin && <small>Studio</small>}
    </Link>
  );
}

export function SiteHeader({ locale = "en" }: { locale?: string }) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href={`/${locale}`}>Discover</Link>
          <Link href={`/${locale}/search`}>Browse</Link>
          <Link href={`/${locale}/about`}>About</Link>
        </nav>
        <form className="header-search" action={`/${locale}/search`}>
          <Search size={17} aria-hidden="true" />
          <input name="q" aria-label="Search Lyranta" placeholder="Songs, artists, lyrics…" />
        </form>
        <Link href="/admin" className="button ghost compact">
          Studio
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter({ locale = "en" }: { locale?: string }) {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Logo />
          <p>Lyrics, translations, stories, and official listening links—carefully reviewed.</p>
        </div>
        <div>
          <strong>Explore</strong>
          <Link href={`/${locale}/search`}>Browse lyrics</Link>
          <Link href={`/${locale}/category/movie-songs`}>Movie songs</Link>
          <Link href={`/${locale}/category/new-releases`}>New releases</Link>
        </div>
        <div>
          <strong>Company</strong>
          <Link href={`/${locale}/about`}>About us</Link>
          <Link href={`/${locale}/contact`}>Contact</Link>
          <Link href={`/${locale}/legal`}>Privacy & copyright</Link>
        </div>
        <div>
          <strong>Lyric languages</strong>
          <Link href="/en/search?language=English">English</Link>
          <Link href="/en/search?language=Hindi">हिन्दी</Link>
          <Link href="/en/search?language=Spanish">Español</Link>
          <Link href="/en/search?language=Arabic">العربية</Link>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} Lyranta</span>
        <span>Built for listeners, translators, and artists.</span>
      </div>
    </footer>
  );
}

export function SongCard({ song, locale = "en" }: { song: Song; locale?: string }) {
  return (
    <article className="song-card">
      <Link
        href={`/${locale}/lyrics/${song.slug}`}
        className="artwork"
        aria-label={`${song.title} lyrics`}
        style={
          song.artwork
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.55)), url(${song.artwork})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <span className="artwork-glow" />
        {!song.artwork && <Music2 size={26} />}
        <small>{song.language}</small>
      </Link>
      <div className="song-card-body">
        <div className="eyebrow">
          <Link href={`/${locale}/category/${slugify(song.category)}`}>{song.category}</Link> ·{" "}
          <Link href={`/${locale}/year/${song.releaseYear}`}>{song.releaseYear}</Link>
        </div>
        <h3>
          <Link href={`/${locale}/lyrics/${song.slug}`}>{song.title}</Link>
        </h3>
        {song.alternateTitle && <p className="alternate-title">{song.alternateTitle}</p>}
        <p className="artist-links">
          {song.artists.map((artist, index) => (
            <span key={artist.id}>
              {index > 0 && ", "}
              <Link href={`/${locale}/artist/${artist.slug}`}>{artist.name}</Link>
            </span>
          ))}
        </p>
        <div className="card-meta">
          <Link href={`/${locale}/genre/${slugify(song.genre)}`}>{song.genre}</Link>
          <span>
            {Intl.NumberFormat("en", { notation: "compact" }).format(song.views)} reads
            {song.views7d > 0 ? ` · ${Intl.NumberFormat("en", { notation: "compact" }).format(song.views7d)} / 7d` : ""}
          </span>
        </div>
      </div>
    </article>
  );
}

export function SongGrid({
  songs,
  locale = "en",
  empty = "No songs match these filters yet.",
}: {
  songs: Song[];
  locale?: string;
  empty?: string;
}) {
  if (!songs.length) return <div className="empty-state"><Disc3 /><h3>No results</h3><p>{empty}</p></div>;
  return <div className="song-grid">{songs.map((song) => <SongCard song={song} locale={locale} key={song.id} />)}</div>;
}

export function ArtistCard({ artist, locale = "en" }: { artist: Artist; locale?: string }) {
  return (
    <Link className="artist-card" href={`/${locale}/artist/${artist.slug}`}>
      <span className="avatar">{artist.name.slice(0, 1)}</span>
      <span><strong>{artist.name}</strong><small>View all songs <ChevronRight size={14} /></small></span>
    </Link>
  );
}

export function Pagination({
  pagination,
  href,
}: {
  pagination: Paginated<unknown>;
  href: (page: number) => string;
}) {
  if (pagination.pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      {pagination.page > 1 ? (
        <Link href={href(pagination.page - 1)}><ArrowLeft size={16} /> Previous</Link>
      ) : <span />}
      <span>Page {pagination.page} of {pagination.pages}</span>
      {pagination.page < pagination.pages ? (
        <Link href={href(pagination.page + 1)}>Next <ArrowRight size={16} /></Link>
      ) : <span />}
    </nav>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 && <ChevronRight size={14} />}
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

const adminLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/songs", label: "Songs & lyrics", icon: LibraryBig },
  { href: "/admin/artists", label: "Artists", icon: Users },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
  { href: "/admin/inbox", label: "Contact inbox", icon: Mail },
  { href: "/admin/ai", label: "AI workspace", icon: Sparkles },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
];

export function AdminSidebar({ email }: { email: string }) {
  return (
    <aside className="admin-sidebar">
      <Logo admin />
      <nav>
        {adminLinks.map(({ href, label, icon: Icon }) => (
          <Link href={href} key={href}><Icon size={18} />{label}</Link>
        ))}
      </nav>
      <div className="admin-profile">
        <span className="avatar small">{email.slice(0, 1).toUpperCase()}</span>
        <span><strong>Administrator</strong><small>{email}</small></span>
      </div>
      <form action={logoutAction}>
        <button className="sidebar-logout" type="submit"><LogOut size={17} /> Sign out</button>
      </form>
    </aside>
  );
}

export function PlatformLinks({ song }: { song: Song }) {
  if (!song.platformLinks.length) return null;
  return (
    <div className="platform-links">
      {song.platformLinks.map((link) => (
        <a href={link.url} key={link.platform} target="_blank" rel="noopener noreferrer">
          <Headphones size={17} /> Listen on {link.platform} <ExternalLink size={14} />
        </a>
      ))}
    </div>
  );
}

export function LanguagePill({ language }: { language: string }) {
  return <span className="language-pill"><Languages size={14} />{language}</span>;
}
