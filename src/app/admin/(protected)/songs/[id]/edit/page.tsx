import { notFound } from "next/navigation";
import { SongEditor } from "@/components/song-editor";
import { getSongById, listArtists, listMovies } from "@/lib/repository";

export default async function EditSongPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [song, artists, movies] = await Promise.all([getSongById(id), listArtists(), listMovies()]);
  if (!song) notFound();
  return (
    <>
      <header className="admin-heading">
        <div>
          <div className="eyebrow">Editing catalog</div>
          <h1>{song.title}</h1>
          <p>
            Updated {new Date(song.updatedAt).toLocaleString()} · {song.lyrics.length} lyric versions · Meaning{" "}
            {song.interpretation?.status ?? "not added"}.
          </p>
        </div>
      </header>
      {query.notice && <div className="notice">{query.notice}</div>}
      <SongEditor song={song} artists={artists} movies={movies} />
    </>
  );
}
