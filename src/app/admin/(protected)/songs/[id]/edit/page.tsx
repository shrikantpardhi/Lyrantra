import { notFound } from "next/navigation";
import { SongEditor } from "@/components/song-editor";
import { getSongById, listArtists, listMovies } from "@/lib/repository";

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [song, artists, movies] = await Promise.all([getSongById(id), listArtists(), listMovies()]);
  if (!song) notFound();
  return (
    <>
      <header className="admin-heading">
        <div><div className="eyebrow">Editing catalog</div><h1>{song.title}</h1><p>Updated {new Date(song.updatedAt).toLocaleString()} · {song.lyrics.length} lyric versions.</p></div>
      </header>
      <SongEditor song={song} artists={artists} movies={movies} />
    </>
  );
}
