import { z } from "zod";

const productionSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required in production"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD: z.string().min(12, "ADMIN_PASSWORD must be at least 12 characters"),
  NEXT_PUBLIC_SITE_URL: z.string().url("NEXT_PUBLIC_SITE_URL must be a valid URL"),
});

let validated = false;

/** Fail closed in production when required secrets or database config are missing. */
export function assertProductionEnv() {
  if (process.env.NODE_ENV !== "production" || validated) return;

  const result = productionSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!result.success) {
    const details = result.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Production environment is incomplete: ${details}`);
  }

  const siteUrl = new URL(result.data.NEXT_PUBLIC_SITE_URL);
  if (siteUrl.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production.");
  }

  validated = true;
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}
