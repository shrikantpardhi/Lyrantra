import type { SongInterpretation } from "@/lib/types";

export const DEFAULT_INTERPRETATION_DISCLAIMER =
  "This interpretation reflects Lyrantra’s editorial analysis and may differ from the artist’s intent. It is not an official artist statement.";

export function getPublishedInterpretation(
  interpretation: SongInterpretation | undefined,
): SongInterpretation | undefined {
  if (
    interpretation?.status !== "published" ||
    !interpretation.summary?.trim() ||
    !interpretation.disclaimer?.trim()
  ) {
    return undefined;
  }
  return interpretation;
}
