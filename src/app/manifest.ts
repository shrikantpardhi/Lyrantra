import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LyricsPro",
    short_name: "LyricsPro",
    description: "Multilingual lyrics, translations, credits, and song stories.",
    start_url: "/en",
    display: "standalone",
    background_color: "#fbfcf8",
    theme_color: "#174f3c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
