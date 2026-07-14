import { describe, expect, it } from "vitest";
import {
  DEFAULT_INTERPRETATION_DISCLAIMER,
  getPublishedInterpretation,
} from "@/lib/interpretation";
import type { SongInterpretation } from "@/lib/types";

const interpretation: SongInterpretation = {
  status: "published",
  summary: "The song finds belonging through a shared journey across an unfamiliar city.",
  themes: ["belonging", "hope"],
  sections: [
    {
      id: "section-1",
      label: "Chorus",
      meaning: "The chorus turns uncertainty into a reason for two people to move forward together.",
    },
  ],
  culturalContext: "",
  disclaimer: DEFAULT_INTERPRETATION_DISCLAIMER,
};

describe("published song interpretations", () => {
  it("exposes only complete, editorially published analysis", () => {
    expect(getPublishedInterpretation(interpretation)).toBe(interpretation);
    expect(getPublishedInterpretation({ ...interpretation, status: "review" })).toBeUndefined();
    expect(getPublishedInterpretation({ ...interpretation, summary: "" })).toBeUndefined();
    expect(getPublishedInterpretation({ ...interpretation, disclaimer: "" })).toBeUndefined();
  });

  it("uses a disclaimer that distinguishes analysis from artist intent", () => {
    expect(DEFAULT_INTERPRETATION_DISCLAIMER).toContain("editorial analysis");
    expect(DEFAULT_INTERPRETATION_DISCLAIMER).toContain("not an official artist statement");
  });
});
