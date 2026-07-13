import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  const sql = postgres(process.env.DATABASE_URL, {
    ssl: process.env.DATABASE_SSL === "false" ? false : "require",
    max: 1,
  });
  const schema = await readFile(path.join(process.cwd(), "db/schema.sql"), "utf8");
  await sql.unsafe(schema);
  await sql.end();
  console.log("Lyranta database schema is up to date.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
