"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { Artist } from "@/lib/types";

export function ArtistMultiSelect({
  artists,
  initialSelectedIds = [],
}: {
  artists: Artist[];
  initialSelectedIds?: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => artists.find((artist) => artist.id === id))
        .filter((artist): artist is Artist => Boolean(artist)),
    [artists, selectedIds],
  );

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return artists.filter((artist) => !needle || artist.name.toLowerCase().includes(needle));
  }, [artists, query]);

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function remove(id: string) {
    setSelectedIds((current) => current.filter((item) => item !== id));
  }

  return (
    <div className="field full multi-select" ref={rootRef}>
      <span>Artists and collaborators</span>
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="artistIds" value={id} />
      ))}
      <button
        type="button"
        className="multi-select-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="multi-select-chips">
          {selected.length ? (
            selected.map((artist) => (
              <span className="multi-select-chip" key={artist.id}>
                {artist.name}
                <button
                  type="button"
                  className="multi-select-chip-remove"
                  aria-label={`Remove ${artist.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    remove(artist.id);
                  }}
                >
                  <X size={12} />
                </button>
              </span>
            ))
          ) : (
            <span className="muted">Select artists…</span>
          )}
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="multi-select-panel" role="listbox" aria-multiselectable="true">
          <label className="multi-select-search">
            <Search size={14} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search artists"
              autoFocus
            />
          </label>
          <div className="multi-select-options">
            {options.map((artist) => {
              const active = selectedIds.includes(artist.id);
              return (
                <button
                  type="button"
                  key={artist.id}
                  className={`multi-select-option${active ? " active" : ""}`}
                  role="option"
                  aria-selected={active}
                  onClick={() => toggle(artist.id)}
                >
                  <span>{artist.name}</span>
                  {active && <Check size={14} />}
                </button>
              );
            })}
            {!options.length && <p className="muted" style={{ padding: "10px 12px" }}>No artists match.</p>}
          </div>
        </div>
      )}
      <small>Compact multi-select. Order follows the selection sequence.</small>
    </div>
  );
}
