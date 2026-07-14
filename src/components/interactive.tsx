"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import type { LyricVersion } from "@/lib/types";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const data = { title: `${title} lyrics | Lyranta`, url: window.location.href };
    if (navigator.share) {
      await navigator.share(data);
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="button secondary compact" type="button" onClick={share}>
      {copied ? <Check size={17} /> : <Share2 size={17} />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}

export function LyricsViewer({ versions }: { versions: LyricVersion[] }) {
  const [activeId, setActiveId] = useState(versions[0]?.id);
  const [copied, setCopied] = useState(false);
  const active = versions.find((version) => version.id === activeId) || versions[0];
  if (!active) return <p>Lyrics are being prepared.</p>;

  async function copyLyrics() {
    await navigator.clipboard.writeText(active.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div>
      <div className="lyrics-toolbar">
        <div className="tab-list" role="tablist" aria-label="Lyric versions">
          {versions.map((version) => (
            <button
              className={version.id === active.id ? "tab active" : "tab"}
              key={version.id}
              onClick={() => setActiveId(version.id)}
              role="tab"
              aria-selected={version.id === active.id}
              aria-controls={`lyrics-${version.id}`}
              type="button"
            >
              {version.language}
              <span>{version.type}</span>
            </button>
          ))}
        </div>
        <button className="icon-button" type="button" onClick={copyLyrics} aria-label="Copy lyrics">
          {copied ? <Check size={17} /> : <Copy size={17} />}
        </button>
      </div>
      {versions.map((version) => (
        <section
          id={`lyrics-${version.id}`}
          role="tabpanel"
          aria-label={`${version.language} ${version.type} lyrics`}
          hidden={version.id !== active.id}
          key={version.id}
        >
          <div className="lyrics-text" lang={version.languageCode}>
            {version.text}
          </div>
          {version.source && <p className="source-note">Source: {version.source}</p>}
        </section>
      ))}
    </div>
  );
}
