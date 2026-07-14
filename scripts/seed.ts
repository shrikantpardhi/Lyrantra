import postgres from "postgres";
import { seedArtists, seedMovies, seedSongs } from "../src/lib/seed-data";
import { loadEnvFiles } from "./load-env";

async function main() {
  loadEnvFiles();

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  if (process.env.ALLOW_SEED !== "true") {
    throw new Error(
      "Refusing to seed without ALLOW_SEED=true. Demo catalog must not be loaded into production accidentally.",
    );
  }

  const sql = postgres(process.env.DATABASE_URL, {
    ssl: process.env.DATABASE_SSL === "false" ? false : "require",
    max: 1,
    prepare: false,
  });

  await sql.begin(async (tx) => {
    for (const artist of seedArtists) {
      await tx`insert into artists (id, slug, name, bio, image, featured)
        values (${artist.id}, ${artist.slug}, ${artist.name}, ${artist.bio}, ${artist.image ?? null}, ${Boolean(artist.featured)})
        on conflict (id) do update set slug = excluded.slug, name = excluded.name,
          bio = excluded.bio, image = excluded.image, featured = excluded.featured`;
    }
    for (const movie of seedMovies) {
      await tx`insert into movies (id, slug, title, year, description)
        values (${movie.id}, ${movie.slug}, ${movie.title}, ${movie.year}, ${movie.description})
        on conflict (id) do update set slug = excluded.slug, title = excluded.title,
          year = excluded.year, description = excluded.description`;
    }
    for (const song of seedSongs) {
      await tx`insert into songs (
        id, slug, title, alternate_title, description, release_year, language,
        category, genre, tags, movie_id, artwork, lyrics, platform_links,
        interpretation, status, featured, views, views_7d, created_at, updated_at
      ) values (
        ${song.id}, ${song.slug}, ${song.title}, ${song.alternateTitle ?? null},
        ${song.description}, ${song.releaseYear}, ${song.language}, ${song.category},
        ${song.genre}, ${song.tags}, ${song.movieId ?? null}, ${song.artwork ?? null},
        ${tx.json(song.lyrics)}, ${tx.json(song.platformLinks)},
        ${song.interpretation ? tx.json(song.interpretation) : null}, ${song.status},
        ${Boolean(song.featured)}, ${song.views}, ${song.views7d}, ${song.createdAt}, ${song.updatedAt}
      ) on conflict (id) do update set
        slug = excluded.slug, title = excluded.title, alternate_title = excluded.alternate_title,
        description = excluded.description, release_year = excluded.release_year,
        language = excluded.language, category = excluded.category, genre = excluded.genre,
        tags = excluded.tags, movie_id = excluded.movie_id, artwork = excluded.artwork,
        lyrics = excluded.lyrics, platform_links = excluded.platform_links,
        interpretation = excluded.interpretation, status = excluded.status,
        featured = excluded.featured, views = excluded.views, views_7d = excluded.views_7d,
        updated_at = excluded.updated_at`;
      await tx`delete from song_artists where song_id = ${song.id}`;
      for (const [sortOrder, artistId] of song.artistIds.entries()) {
        await tx`insert into song_artists (song_id, artist_id, sort_order)
          values (${song.id}, ${artistId}, ${sortOrder})`;
      }
    }
  });
  await sql.end();
  console.log(`Seeded ${seedSongs.length} songs and ${seedArtists.length} artists.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
