import { SongEditor } from "@/components/song-editor";
import { listArtists, listMovies } from "@/lib/repository";

export default async function NewSongPage() {
  const [artists, movies] = await Promise.all([listArtists(), listMovies()]);
  return (
    <>
      <header className="admin-heading">
        <div><div className="eyebrow">New catalog entry</div><h1>Add song lyrics</h1><p>Create a draft, attach every artist, and add language-specific editions.</p></div>
      </header>
      <SongEditor artists={artists} movies={movies} />
    </>
  );
}
