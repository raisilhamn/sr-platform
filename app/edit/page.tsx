"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import Spinner from "../spinner";

const TOPICS = ["1945", "belanegara", "pancasila", "ringkasan", "sejarah", "tokoh"];

function label(topic: string) {
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}

export default function EditPage() {
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [content, setContent] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setContent(null);
    setError(null);
    fetch(`/api/content?topic=${selectedTopic}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setContent(data.content);
      })
      .catch(() => setError("Failed to load content"));
  }, [selectedTopic]);

  function startEdit() {
    setDraft(content ?? "");
    setMode("edit");
  }

  function cancelEdit() {
    setMode("view");
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: selectedTopic, content: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setContent(draft);
      setMode("view");
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {TOPICS.map((t) => (
          <button
            key={t}
            disabled={mode === "edit"}
            onClick={() => setSelectedTopic(t)}
            className={`px-3 py-1.5 rounded border text-sm whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
              selectedTopic === t
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted"
            }`}
          >
            {label(t)}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 rounded border border-destructive/40 text-destructive text-sm">
          {error}
        </div>
      )}

      {content === null && !error ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-6 h-6 text-muted" />
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">{label(selectedTopic)}.md</h2>
            <div className="flex items-center gap-2">
              {savedFlash && <span className="text-xs text-muted">Saved</span>}
              {mode === "view" ? (
                <Button size="sm" variant="outline" onClick={startEdit}>
                  Edit
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={save} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {mode === "view" ? (
            <div className="prose-card px-5 py-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full min-h-[60vh] px-5 py-4 bg-transparent font-mono text-sm outline-none resize-y"
              spellCheck={false}
            />
          )}
        </div>
      )}
    </div>
  );
}
