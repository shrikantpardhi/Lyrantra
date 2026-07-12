import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/ai-agent";
import { getFacets, listArtistSongs, listSongs, slugify } from "@/lib/repository";

describe("catalog discovery", () => {
  it("normalizes SEO-safe Unicode slugs", () => {
    expect(slugify("Cerca del Mar!")).toBe("cerca-del-mar");
    expect(slugify("बारिश के ख़त")).toBe("बरश-क-खत");
  });

  it("searches titles, lyrics, metadata, and artists", async () => {
    const byTitle = await listSongs({ query: "twinkle" });
    const byLyric = await listSongs({ query: "constellation" });
    const byArtist = await listSongs({ query: "ada rivers" });
    expect(byTitle.items[0]?.slug).toBe("twinkle-twinkle-little-star");
    expect(byLyric.items[0]?.slug).toBe("city-lights");
    expect(byArtist.total).toBeGreaterThanOrEqual(2);
  });

  it("exposes stable filters and paginated multi-artist catalogs", async () => {
    const facets = await getFacets();
    const artist = await listArtistSongs("ada-rivers", 1, 1);
    expect(facets.languages).toContain("Hindi");
    expect(artist?.songs.total).toBeGreaterThan(1);
    expect(artist?.songs.items).toHaveLength(1);
  });
});

describe("provider secret encryption", () => {
  it("round-trips API keys without storing plaintext", () => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-with-sufficient-entropy";
    const encrypted = encryptSecret("provider-secret-value");
    expect(encrypted).not.toContain("provider-secret-value");
    expect(decryptSecret(encrypted)).toBe("provider-secret-value");
  });
});
