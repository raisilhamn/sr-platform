"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cpns_sr_zoom";
const MIN = 0.8;
const MAX = 1.6;
const STEP = 0.1;

function applyZoom(zoom: number) {
  document.documentElement.style.fontSize = `${zoom * 100}%`;
}

export default function ZoomControl() {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (stored && stored >= MIN && stored <= MAX) setZoom(stored);
  }, []);

  useEffect(() => {
    applyZoom(zoom);
    localStorage.setItem(STORAGE_KEY, String(zoom));
  }, [zoom]);

  function change(delta: number) {
    setZoom((z) => Math.min(MAX, Math.max(MIN, Math.round((z + delta) * 10) / 10)));
  }

  return (
    <div className="flex items-center justify-between w-full text-xs text-muted">
      <span className="text-muted">Scale</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => change(-STEP)}
          disabled={zoom <= MIN}
          className="w-7 h-7 flex items-center justify-center border border-border rounded hover:border-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={() => setZoom(1)}
          className="px-1.5 w-11 text-center tabular-nums hover:text-foreground"
          aria-label="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => change(STEP)}
          disabled={zoom >= MAX}
          className="w-7 h-7 flex items-center justify-center border border-border rounded hover:border-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
