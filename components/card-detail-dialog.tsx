"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

export function CardDetailDialog({
  card,
  open,
  onOpenChange,
}: {
  card: MatureCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-xs uppercase tracking-wide text-muted font-semibold">
            {card.topic}
          </div>
          <DialogTitle className="text-lg font-bold">{card.title}</DialogTitle>
          <DialogDescription className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mt-1">
            <span>EF: {card.ef.toFixed(1)}</span>
            <span>Interval: {card.interval}d</span>
            <span>Rep: {card.reps}</span>
            <span>Reviews: {card.reviewCount}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="prose-card border-t border-border pt-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{card.content}</ReactMarkdown>
        </div>
      </DialogContent>
    </Dialog>
  );
}
