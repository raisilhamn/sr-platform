"use client";

import { useEffect, useState } from "react";

const SESSION_COOKIE = "cpns_sr_session";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

function readSessionCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function SessionControl() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSessionId(readSessionCookie());
  }, []);

  function copyToClipboard() {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function importSession(id: string) {
    document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${TEN_YEARS}; samesite=lax`;
    window.location.reload();
  }

  if (!sessionId) return null;

  const displayId = sessionId.slice(0, 8).toUpperCase();

  return (
    <div className="flex flex-col gap-2 text-xs w-full">
      <div className="flex items-center justify-between w-full">
        <span className="text-muted">ID:</span>
        <button
          onClick={copyToClipboard}
          title={`Click to copy: ${sessionId}`}
          className="font-mono text-foreground hover:underline transition-colors"
        >
          {copied ? "Copied!" : displayId}
        </button>
      </div>
      <div className="flex gap-2 w-full mt-1">
        <button
          onClick={copyToClipboard}
          className="flex-1 px-2.5 py-1.5 border border-border rounded text-muted hover:border-foreground hover:text-foreground transition-colors text-center"
        >
          Share
        </button>
        <button
          onClick={() => {
            const id = prompt("Enter session ID to import:");
            if (id) importSession(id);
          }}
          className="flex-1 px-2.5 py-1.5 border border-border rounded text-muted hover:border-foreground hover:text-foreground transition-colors text-center"
        >
          Import
        </button>
      </div>
    </div>
  );
}
