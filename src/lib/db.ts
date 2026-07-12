import postgres from "postgres";

const globalForDatabase = globalThis as unknown as {
  lyricsproSql?: ReturnType<typeof postgres>;
};

export const databaseEnabled = Boolean(process.env.DATABASE_URL);

export function db() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!globalForDatabase.lyricsproSql) {
    globalForDatabase.lyricsproSql = postgres(process.env.DATABASE_URL, {
      max: process.env.NODE_ENV === "production" ? 10 : 3,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: process.env.DATABASE_SSL === "false" ? false : "require",
    });
  }

  return globalForDatabase.lyricsproSql;
}
