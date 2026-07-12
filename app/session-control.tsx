"use client";

import { useEffect, useState } from "react";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const SESSION_KEY = "cpns_sr_session";

export default function SessionControl() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    setSessionId(id);
  }, []);

  async function exportSession() {
    if (!sessionId) return;
    try {
      await fetch("/api/session/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      copyToClipboard();
    } catch (e) {
      console.error("Export failed:", e);
    }
  }

  function copyToClipboard() {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function importSession(id: string) {
    try {
      const res = await fetch("/api/session/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      const data = await res.json();
      if (data.cards) {
        await fetch("/api/session/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id, cards: data.cards }),
        });
        localStorage.setItem(SESSION_KEY, id);
        setSessionId(id);
        window.location.reload();
      }
    } catch (e) {
      console.error("Import failed:", e);
    }
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
          onClick={exportSession}
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
