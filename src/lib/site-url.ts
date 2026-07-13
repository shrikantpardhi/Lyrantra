const LOCAL_URL = "http://localhost:3000";

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is required for production builds so canonical URLs never point to localhost.",
    );
  }

  const url = new URL(configured || LOCAL_URL);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production.");
  }

  return url.origin;
}
