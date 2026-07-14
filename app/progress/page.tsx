"use client";

import { useEffect, useState, useCallback } from "react";
import StreakGraph from "@/app/streak-graph";
import Spinner from "@/app/spinner";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

function CardListSection({
  endpoint,
  onSelect,
  resettable,
}: {
  endpoint: string;
  onSelect: (card: MatureCard) => void;
  resettable?: boolean;
}) {
  const [cards, setCards] = useState<MatureCard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const load = useCallback(async (p: number) => {
    const res = await fetch(`${endpoint}?page=${p}&limit=${PAGE_SIZE}`);
    const data = await res.json();
    setCards(data.cards);
    setTotal(data.total);
  }, [endpoint]);

  useEffect(() => {
    load(page);
  }, [page, load]);

  async function handleReset(id: string) {
    setResettingId(id);
    await fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setResettingId(null);
    load(page);
  }

  return (
    <div className="mt-6">
      {!cards ? (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Spinner />
          <span>Loading...</span>
        </div>
      ) : cards.length === 0 ? (
        <p className="text-xs text-muted">No cards yet.</p>
      ) : (
        <>
          <div className="space-y-2">
            {cards.map((c) => (
              <div
                key={c.id}
                className="flex justify-between items-start gap-3 border border-border rounded-lg p-4 bg-surface hover:border-foreground/30 transition-colors"
              >
                <button onClick={() => onSelect(c)} className="flex-1 text-left">
                  <div className="text-xs uppercase tracking-wide text-muted font-semibold">
                    {c.topic}
                  </div>
                  <div className="font-semibold">{c.title}</div>
                  <div className="text-xs text-muted mt-1">
                    EF: {c.ef.toFixed(1)} | Interval: {c.interval}d | Rep: {c.reps} | Reviews: {c.reviewCount}
                  </div>
                </button>
                {resettable && (
                  <button
                    onClick={() => handleReset(c.id)}
                    disabled={resettingId === c.id}
                    className="px-2.5 py-1 text-xs border border-border rounded text-muted hover:border-foreground hover:text-foreground shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Reset
                  </button>
                )}
              </div>
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
  );
}

export default function ProgressPage() {
  const [selected, setSelected] = useState<MatureCard | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div>
      <h2 className="text-lg font-bold mb-6">Progress</h2>
      <StreakGraph />

      <Tabs defaultValue="mature" className="mt-10">
        <TabsList variant="line">
          <TabsTrigger value="mature">Mature Cards</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="mature">
          <CardListSection
            endpoint="/api/mature"
            onSelect={(c) => {
              setSelected(c);
              setDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="reviewed">
          <CardListSection
            endpoint="/api/reviewed"
            resettable
            onSelect={(c) => {
              setSelected(c);
              setDialogOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      <CardDetailDialog
        card={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
