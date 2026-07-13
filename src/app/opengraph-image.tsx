import { ImageResponse } from "next/og";

export const alt = "Lyranta — Lyrics, translations and song stories";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 82px",
          color: "white",
          background: "linear-gradient(135deg, #102e25 0%, #174f3c 60%, #2f7659 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 42, fontWeight: 800 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#174f3c",
              background: "#d9f99d",
              fontSize: 42,
            }}
          >
            ♪
          </div>
          Lyranta
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 76, lineHeight: 1.05 }}>
            Find the words behind every song.
          </div>
          <div style={{ color: "#d7e7df", fontSize: 29 }}>
            Reviewed lyrics · Translations · Credits · Official links
          </div>
        </div>
      </div>
    ),
    size,
  );
}
