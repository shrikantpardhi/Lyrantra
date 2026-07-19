import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { loadEnvFiles } from "./load-env";

async function main() {
  loadEnvFiles();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  const sql = postgres(process.env.DATABASE_URL, {
    ssl: process.env.DATABASE_SSL === "false" ? false : "require",
    max: 1,
    prepare: false,
  });
  const schema = await readFile(path.join(process.cwd(), "db/schema.sql"), "utf8");
  await sql.unsafe(schema);
  await sql.end();
  console.log("Lyrantra database schema is up to date.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
