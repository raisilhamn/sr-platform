"use client";

import { useEffect, useState, useCallback } from "react";
import StreakGraph from "@/app/streak-graph";
import Spinner from "@/app/spinner";
import { CardDetailDialog } from "@/components/card-detail-dialog";

type MatureCard = {
  id: string;
  topic: string;
  title: string;
  content: string;
  ef: number;
  interval: number;
  reps: number;
  reviewCount: number;
};

const PAGE_SIZE = 10;

export default function ProgressPage() {
  const [cards, setCards] = useState<MatureCard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MatureCard | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const load = useCallback(async (p: number) => {
    const res = await fetch(`/api/mature?page=${p}&limit=${PAGE_SIZE}`);
    const data = await res.json();
    setCards(data.cards);
    setTotal(data.total);
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  return (
    <div>
      <h2 className="text-lg font-bold mb-6">Progress</h2>
      <StreakGraph />

      <div className="mt-10">
        <h3 className="text-sm font-semibold text-muted mb-4">Mature Cards</h3>

        {!cards ? (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Spinner />
            <span>Loading...</span>
          </div>
        ) : cards.length === 0 ? (
          <p className="text-xs text-muted">No mature cards yet. Keep reviewing!</p>
        ) : (
          <>
            <div className="space-y-2">
              {cards.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelected(c);
                    setDialogOpen(true);
                  }}
                  className="w-full text-left border border-border rounded-lg p-4 bg-surface hover:border-foreground/30 transition-colors"
                >
                  <div className="text-xs uppercase tracking-wide text-muted font-semibold">
                    {c.topic}
                  </div>
                  <div className="font-semibold">{c.title}</div>
                  <div className="text-xs text-muted mt-1">
                    EF: {c.ef.toFixed(1)} | Interval: {c.interval}d | Rep: {c.reps} | Reviews: {c.reviewCount}
                  </div>
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs border border-border rounded hover:border-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="text-xs text-muted">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-xs border border-border rounded hover:border-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <CardDetailDialog
        card={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
