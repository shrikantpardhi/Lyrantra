import postgres from "postgres";
import { assertProductionEnv, isProduction } from "@/lib/env";

const globalForDatabase = globalThis as unknown as {
  lyrantraSql?: ReturnType<typeof postgres>;
};

export const databaseEnabled = Boolean(process.env.DATABASE_URL);

export function db() {
  assertProductionEnv();

  if (!process.env.DATABASE_URL) {
    if (isProduction()) {
      throw new Error("DATABASE_URL is required in production");
    }
    throw new Error("DATABASE_URL is not configured");
  }

  if (!globalForDatabase.lyrantraSql) {
    // Neon serverless + Vercel: keep the pool tiny and disable prepared statements
    // so the connection works through PgBouncer (use the *-pooler host in DATABASE_URL).
    globalForDatabase.lyrantraSql = postgres(process.env.DATABASE_URL, {
      max: isProduction() ? 1 : 3,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      ssl: process.env.DATABASE_SSL === "false" ? false : "require",
    });
  }

  return globalForDatabase.lyrantraSql;
}
