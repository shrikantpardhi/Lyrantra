import { describe, expect, it } from "vitest";
import {
  duplicateKeyForCandidate,
  findCatalogDuplicate,
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
      { "language": "English", "languageCode": "en", "type": "original", "sourceNote": "Publisher sheet", "text": "Verse one line\\nChorus line here" },
      { "language": "Hindi", "languageCode": "hi", "type": "translation", "sourceNote": "Authorized translation", "text": "Pehla shabd\\nRefren yahan" }
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
    expect(candidates[0].lyricEditions[0]?.text).toContain("Verse one");
    expect(toSongLyricPlaceholders(candidates[0])[0]?.text).toContain("Verse one");
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
              text: "Sample lyric line",
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

  it("dedupes repeated candidates within one discovery response", () => {
    const interpretation = {
      summary: "A coastal homecoming song.",
      themes: ["belonging", "travel", "memory"],
      culturalContext: "Atlantic folk imagery.",
      sections: [
        { label: "Verse 1", meaning: "Leaving home." },
        { label: "Chorus", meaning: "Finding light." },
        { label: "Bridge", meaning: "Accepting change." },
      ],
    };
    const text = `[
      {
        "title": "Harbor Light",
        "artists": ["Asha"],
        "releaseYear": 2026,
        "language": "English",
        "officialSourceUrl": "https://example.com/song",
        "description": "Official announcement from the label.",
        "lyricEditions": [{ "language": "English", "languageCode": "en", "type": "original", "text": "Line one" }],
        "interpretation": ${JSON.stringify(interpretation)}
      },
      {
        "title": "Harbor Light",
        "artists": ["Asha"],
        "releaseYear": 2026,
        "language": "English",
        "officialSourceUrl": "https://example.com/song-2",
        "description": "Duplicate entry in the same response.",
        "lyricEditions": [{ "language": "English", "languageCode": "en", "type": "original", "text": "Line one" }],
        "interpretation": ${JSON.stringify(interpretation)}
      }
    ]`;
    expect(parseDiscovery(text, 5)).toHaveLength(1);
  });

  it("drops incomplete candidates missing lyrics or meaning", () => {
    const text = `[
      {
        "title": "Thin Draft",
        "artists": ["Asha"],
        "releaseYear": 2026,
        "language": "English",
        "officialSourceUrl": "https://example.com/thin",
        "description": "Missing lyrics and interpretation on purpose."
      }
    ]`;
    expect(parseDiscovery(text, 5)).toHaveLength(0);
  });

  it("detects catalog duplicates by title, artists, and year", () => {
    const candidate = {
      title: "City Lights",
      artists: ["The Nova Collective"],
      releaseYear: 2026,
    } as Parameters<typeof duplicateKeyForCandidate>[0];
    const catalog = [
      {
        id: "song-1",
        slug: "city-lights",
        title: "City Lights",
        releaseYear: 2026,
        artists: [{ id: "a1", slug: "nova", name: "The Nova Collective", bio: "" }],
      },
    ];
    expect(findCatalogDuplicate(
      {
        ...candidate,
        artistDetails: [],
        language: "English",
        languageCode: "en",
        category: "Singles",
        genre: "Pop",
        tags: [],
        officialSourceUrl: "https://example.com",
        description: "Test",
        platformLinks: [],
        lyricEditions: [],
        reviewStatus: "pending",
      },
      catalog,
    )?.id).toBe("song-1");
  });
});
