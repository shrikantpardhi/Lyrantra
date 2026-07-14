import { describe, expect, it } from "vitest";
import {
  parseDiscovery,
  parseRunDetails,
  serializeRunDetails,
  toSongInterpretation,
  toSongLyricPlaceholders,
  toSongPlatformLinks,
} from "@/lib/ai-discovery";

describe("ai discovery parsing", () => {
  it("accepts complete catalog metadata including meaning and lyric edition shells", () => {
    const text = `Here you go:
\`\`\`json
[
  {
    "title": "Harbor Light",
    "alternateTitle": "Harbur Lait",
    "artists": [{ "name": "Asha", "bio": "Coastal folk songwriter." }, { "name": "Ben", "bio": "Guitarist and producer." }],
    "releaseYear": "2026",
    "language": "English",
    "languageCode": "en",
    "category": "Singles",
    "genre": "Folk",
    "tags": ["coastal", "acoustic"],
    "officialSourceUrl": "https://example.com/song",
    "description": "Official announcement from the label about the coastal folk single released this week.",
    "platformLinks": [
      { "platform": "Spotify", "url": "https://open.spotify.com/track/demo" }
    ],
    "lyricSourceNote": "Request lyrics from the publisher.",
    "lyricEditions": [
      { "language": "English", "languageCode": "en", "type": "original", "sourceNote": "Publisher sheet" },
      { "language": "Hindi", "languageCode": "hi", "type": "translation", "sourceNote": "Authorized translation" }
    ],
    "interpretation": {
      "summary": "A song about finding home after travel across the coast.",
      "themes": ["belonging", "travel", "memory"],
      "culturalContext": "Uses coastal imagery common in Atlantic folk.",
      "sections": [
        { "label": "Verse 1", "meaning": "Sets the journey away from home." },
        { "label": "Chorus", "meaning": "Returns to the idea of home as light." },
        { "label": "Bridge", "meaning": "Accepts change without losing belonging." }
      ]
    }
  }
]
\`\`\``;
    const candidates = parseDiscovery(text, 5);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      title: "Harbor Light",
      artists: ["Asha", "Ben"],
      reviewStatus: "pending",
    });
    expect(candidates[0].artistDetails[0]?.bio).toContain("Coastal");
    expect(candidates[0].lyricEditions).toHaveLength(2);
    expect(toSongLyricPlaceholders(candidates[0])).toHaveLength(2);
    expect(toSongPlatformLinks(candidates[0]).length).toBeGreaterThan(0);
    expect(toSongInterpretation(candidates[0])?.sections).toHaveLength(3);
  });

  it("round-trips review details and keeps legacy arrays readable", () => {
    const serialized = serializeRunDetails(
      [
        {
          title: "Harbor Light",
          artists: ["Asha"],
          artistDetails: [{ name: "Asha" }],
          releaseYear: 2026,
          language: "English",
          languageCode: "en",
          category: "Singles",
          genre: "Folk",
          tags: ["ai-discovery"],
          officialSourceUrl: "https://example.com/song",
          description: "Official announcement from the label.",
          platformLinks: [{ platform: "Official source", url: "https://example.com/song" }],
          lyricEditions: [
            {
              language: "English",
              languageCode: "en",
              type: "original",
              sourceNote: "Publisher",
            },
          ],
          reviewStatus: "pending",
        },
      ],
      { market: "Bollywood", yearFrom: 2024, yearTo: 2026, language: "Hindi" },
    );
    expect(parseRunDetails(serialized)).toHaveLength(1);
    expect(JSON.parse(serialized).criteria.market).toBe("Bollywood");
    expect(
      parseRunDetails(
        JSON.stringify([
          {
            title: "Legacy",
            artists: ["Asha"],
            releaseYear: 2026,
            language: "English",
            officialSourceUrl: "https://example.com/legacy",
            description: "Legacy bare array still works for review.",
          },
        ]),
      )[0],
    ).toMatchObject({
      reviewStatus: "pending",
      category: "Singles",
      languageCode: "en",
      lyricEditions: [{ type: "original" }],
    });
  });
});
