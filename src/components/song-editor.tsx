"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { saveSongAction } from "@/app/actions";
import type { Artist, LyricVersion, Movie, PlatformLink, Song } from "@/lib/types";

const emptyLyric = (id = "lyric-new"): LyricVersion => ({
  id,
  language: "English",
  languageCode: "en",
  type: "original",
  text: "",
  source: "Editorial submission",
});

export function SongEditor({
  song,
  artists,
  movies,
}: {
  song?: Song;
  artists: Artist[];
  movies: Movie[];
}) {
  const [lyrics, setLyrics] = useState<LyricVersion[]>(song?.lyrics.length ? song.lyrics : [emptyLyric()]);
  const [links, setLinks] = useState<PlatformLink[]>(song?.platformLinks ?? []);

  function updateLyric(index: number, patch: Partial<LyricVersion>) {
    setLyrics((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function updateLink(index: number, patch: Partial<PlatformLink>) {
    setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  return (
    <form className="form-card form-grid" action={saveSongAction}>
      {song && <input type="hidden" name="id" value={song.id} />}
      <input type="hidden" name="lyricsJson" value={JSON.stringify(lyrics)} />
      <input type="hidden" name="platformLinksJson" value={JSON.stringify(links)} />

      <label className="field"><span>Song title</span><input name="title" required defaultValue={song?.title} /></label>
      <label className="field"><span>URL slug</span><input name="slug" defaultValue={song?.slug} placeholder="generated-from-title" /></label>
      <label className="field"><span>Alternate / romanized title</span><input name="alternateTitle" defaultValue={song?.alternateTitle} /></label>
      <label className="field"><span>Release year</span><input name="releaseYear" type="number" min="1000" required defaultValue={song?.releaseYear ?? new Date().getFullYear()} /></label>
      <label className="field full"><span>Editorial description</span><textarea name="description" required minLength={20} defaultValue={song?.description} /></label>
      <label className="field"><span>Primary language</span><input name="language" required defaultValue={song?.language ?? "English"} /></label>
      <label className="field"><span>Category</span><input name="category" required defaultValue={song?.category ?? "New releases"} /></label>
      <label className="field"><span>Genre</span><input name="genre" required defaultValue={song?.genre ?? "Pop"} /></label>
      <label className="field"><span>Tags, comma separated</span><input name="tags" defaultValue={song?.tags.join(", ")} /></label>
      <label className="field"><span>Movie / collection</span>
        <select name="movieId" defaultValue={song?.movieId ?? ""}>
          <option value="">No movie</option>
          {movies.map((movie) => <option value={movie.id} key={movie.id}>{movie.title} ({movie.year})</option>)}
        </select>
      </label>
      <label className="field"><span>Publication status</span>
        <select name="status" defaultValue={song?.status ?? "draft"}>
          <option value="draft">Draft</option>
          <option value="review">Needs review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <fieldset className="field full" style={{ border: 0 }}>
        <span>Artists and collaborators</span>
        <div className="checkboxes">
          {artists.map((artist) => (
            <label className="checkbox" key={artist.id}>
              <input
                type="checkbox"
                name="artistIds"
                value={artist.id}
                defaultChecked={song?.artistIds.includes(artist.id)}
              />
              {artist.name}
            </label>
          ))}
        </div>
        <small>A song can link to any number of artists. Display order follows this list.</small>
      </fieldset>
      <label className="checkbox field full" style={{ display: "flex" }}>
        <input name="featured" type="checkbox" defaultChecked={song?.featured} /> Feature on the home page
      </label>

      <div className="field full" style={{ borderTop: "1px solid var(--line)", paddingTop: 24 }}>
        <div className="admin-heading" style={{ marginBottom: 4 }}>
          <span>Lyric versions</span>
          <button className="button secondary compact" type="button" onClick={() => setLyrics((current) => [...current, emptyLyric(crypto.randomUUID())])}>
            <Plus size={14} /> Add language
          </button>
        </div>
        <small>Use separate records for original lyrics, translations, and transliterations. HTML is not accepted.</small>
      </div>
      {lyrics.map((lyric, index) => (
        <section className="panel field full" key={lyric.id}>
          <div className="form-grid">
            <label className="field"><span>Language</span><input value={lyric.language} onChange={(event) => updateLyric(index, { language: event.target.value })} /></label>
            <label className="field"><span>BCP-47 code</span><input value={lyric.languageCode} onChange={(event) => updateLyric(index, { languageCode: event.target.value })} /></label>
            <label className="field"><span>Version type</span>
              <select value={lyric.type} onChange={(event) => updateLyric(index, { type: event.target.value as LyricVersion["type"] })}>
                <option value="original">Original</option>
                <option value="translation">Translation</option>
                <option value="transliteration">Transliteration</option>
              </select>
            </label>
            <label className="field"><span>Source / rights basis</span><input value={lyric.source ?? ""} onChange={(event) => updateLyric(index, { source: event.target.value })} /></label>
            <label className="field full"><span>Lyrics</span><textarea style={{ minHeight: 260 }} value={lyric.text} onChange={(event) => updateLyric(index, { text: event.target.value })} /></label>
          </div>
          {lyrics.length > 1 && (
            <button className="button danger compact" type="button" onClick={() => setLyrics((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
              <Trash2 size={14} /> Remove version
            </button>
          )}
        </section>
      ))}

      <div className="field full" style={{ borderTop: "1px solid var(--line)", paddingTop: 24 }}>
        <div className="admin-heading" style={{ marginBottom: 4 }}>
          <span>Official platform links</span>
          <button className="button secondary compact" type="button" onClick={() => setLinks((current) => [...current, { platform: "", url: "" }])}>
            <Plus size={14} /> Add platform
          </button>
        </div>
      </div>
      {links.map((link, index) => (
        <div className="field full" key={`${index}-${link.platform}`} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", alignItems: "end", gap: 10 }}>
          <label className="field"><span>Platform</span><input value={link.platform} onChange={(event) => updateLink(index, { platform: event.target.value })} placeholder="Spotify" /></label>
          <label className="field"><span>HTTPS URL</span><input type="url" value={link.url} onChange={(event) => updateLink(index, { url: event.target.value })} placeholder="https://…" /></label>
          <button className="icon-button" type="button" onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>
        </div>
      ))}
      <div className="field full" style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", marginTop: 15 }}>
        <button className="button" type="submit"><Save size={17} /> Save song</button>
      </div>
    </form>
  );
}
