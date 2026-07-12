"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Section = { title: string; content: string };
type Topic = { topic: string; label: string; sections: Section[] };

export default function BrowsePage() {
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/browse")
      .then((res) => res.json())
      .then((data) => {
        setTopics(data.topics);
        if (data.topics[0]) setOpenTopic(data.topics[0].topic);
      });
  }, []);

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (!topics) {
    return <div className="text-muted text-sm">Loading...</div>;
  }

  return (
    <div>
      {topics.map((t) => (
        <div key={t.topic} className="border border-border rounded-lg mb-4 overflow-hidden bg-surface">
          <div
            className="px-5 py-4 cursor-pointer flex justify-between items-center select-none hover:bg-white/[0.02]"
            onClick={() => setOpenTopic(openTopic === t.topic ? null : t.topic)}
          >
            <h2 className="font-semibold">{t.label}</h2>
            <span
              className={`transition-transform ${openTopic === t.topic ? "rotate-180" : ""}`}
            >
              ▼
            </span>
          </div>
          {openTopic === t.topic && (
            <div className="px-5 pb-5">
              {t.sections.map((s, i) => {
                const key = `${t.topic}-${i}`;
                const isOpen = openSections.has(key);
                return (
                  <div key={key} className="mb-4">
                    <h3
                      className="cursor-pointer py-3 font-bold text-base hover:text-muted transition-colors"
                      onClick={() => toggleSection(key)}
                    >
                      {s.title}
                    </h3>
                    {isOpen && (
                      <div className="prose-card border-t border-border pt-4">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
