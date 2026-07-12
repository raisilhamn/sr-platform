"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Spinner from "./spinner";

type Card = {
  id: string;
  topic: string;
  title: string;
  content: string;
  ef: number;
  interval: number;
  reps: number;
};

type Stats = { due: number; newC: number; reviewed: number; total: number };

const RATINGS = [
  { value: 1, label: "Again", sub: "1 hari" },
  { value: 2, label: "Hard", sub: "Reset" },
  { value: 3, label: "Good", sub: "Normal" },
  { value: 4, label: "Easy", sub: "Cepat" },
];

function StudyPageContent() {
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/study");
    const data = await res.json();
    setCards(data.cards);
    setStats(data.stats);
  }, []);

  useEffect(() => {
    const importId = searchParams.get("import");
    if (importId && !importing) {
      setImporting(true);
      (async () => {
        try {
          const res = await fetch("/api/session/export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: importId }),
          });
          const data = await res.json();
          if (data.cards) {
            await fetch("/api/session/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: importId, cards: data.cards }),
            });
            localStorage.setItem("cpns_sr_session", importId);
            window.history.replaceState({}, "", "/");
            await load();
          }
        } catch (e) {
          console.error("Import failed:", e);
        }
        setImporting(false);
      })();
    } else {
      load();
    }
  }, [load, searchParams, importing]);

  const [ratingId, setRatingId] = useState<string | null>(null);

  async function rate(id: string, rating: number) {
    setRatingId(id);
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, rating }),
    });
    setRatingId(null);
    load();
  }

  async function reset(id: string) {
    await fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function resetAll() {
    if (!window.confirm("Reset semua kartu? Semua progres akan hilang.")) return;
    await fetch("/api/reset-all", { method: "POST" });
    load();
  }

  if (!cards || !stats) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-6 h-6 text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-4 text-xs text-muted mb-6 flex-wrap">
        <div>
          Due: <span className="font-semibold text-foreground">{stats.due}</span>
        </div>
        <div>
          New: <span className="font-semibold text-foreground">{stats.newC}</span>
        </div>
        <div>
          Reviewed: <span className="font-semibold text-foreground">{stats.reviewed}</span>
        </div>
        <div>
          Total: <span className="font-semibold text-foreground">{stats.total}</span>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Semua selesai untuk hari ini!
          </h2>
          <p className="mb-6">
            Tidak ada kartu yang perlu direview. Kembali besok atau reset kartu untuk mengulang.
          </p>
          <button
            onClick={resetAll}
            className="px-3 py-1.5 text-xs border border-border rounded text-muted hover:border-foreground hover:text-foreground"
          >
            Reset Semua
          </button>
        </div>
      ) : (
        cards.map((c) => (
          <div key={c.id} className="border border-border rounded-lg p-6 mb-5 bg-surface">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted font-semibold">
                  {c.topic}
                </div>
                <div className="text-lg font-bold">{c.title}</div>
                <div className="text-xs text-muted mt-1">
                  EF: {c.ef.toFixed(1)} | Interval: {c.interval}d | Rep: {c.reps}
                </div>
              </div>
              <button
                onClick={() => reset(c.id)}
                className="px-2.5 py-1 text-xs border border-border rounded text-muted hover:border-foreground hover:text-foreground shrink-0"
              >
                Reset
              </button>
            </div>
            <div className="prose-card border-t border-border pt-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.content}</ReactMarkdown>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => rate(c.id, r.value)}
                  disabled={ratingId === c.id}
                  className="border border-border rounded py-3 px-2 text-center hover:border-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                >
                  <div className="text-sm font-bold">{r.label}</div>
                  <div className="text-xs text-muted">{r.sub}</div>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={<div className="text-muted text-sm"><Spinner /></div>}>
      <StudyPageContent />
    </Suspense>
  );
}
