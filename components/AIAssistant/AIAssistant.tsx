"use client";

import {
  useCallback,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import type { TimelineData } from "@/lib/types";

interface AIAssistantProps {
  data: TimelineData;
  today: string;
  onApply: (next: TimelineData) => void;
}

interface Preview {
  summary: string;
  data: TimelineData;
}

export function AIAssistant({ data, today, onApply }: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  const submit = useCallback(async () => {
    const text = prompt.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, data, today }),
      });
      const json = (await res.json()) as {
        summary?: string;
        data?: TimelineData;
        error?: string;
      };

      if (!res.ok) {
        setError(json.error ?? "Request failed");
        return;
      }

      if (!json.summary || !json.data) {
        setError("Unexpected response from AI");
        return;
      }

      setPreview({ summary: json.summary, data: json.data });
    } catch {
      setError("Could not reach the AI service");
    } finally {
      setLoading(false);
    }
  }, [prompt, loading, data, today]);

  const apply = useCallback(() => {
    if (!preview) return;
    onApply(preview.data);
    setPreview(null);
    setPrompt("");
    setError(null);
  }, [preview, onApply]);

  const discard = useCallback(() => {
    setPreview(null);
  }, []);

  const onPromptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const onPromptKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <section className="mb-3.5 rounded-[12px] border border-line bg-panel shadow-[0_1px_2px_#00000008]">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-black/3"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="w-3 flex-none text-center font-mono text-[10px] text-muted"
          aria-hidden
        >
          {open ? "▾" : "▸"}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-muted">
          AI assistant
        </span>
        <span className="text-[11px] text-muted">· powered by Gemini</span>
      </button>

      {open && (
        <div className="border-t border-line px-3 pb-3 pt-2">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
            <textarea
              className="field-input min-h-[42px] w-full min-w-0 flex-1 resize-y py-2"
              rows={2}
              placeholder='e.g. "Move Sample Project Alpha one week later"'
              value={prompt}
              disabled={loading}
              onChange={onPromptChange}
              onKeyDown={onPromptKeyDown}
            />
            <button
              type="button"
              className="btn btn-primary w-full shrink-0 sm:w-auto"
              disabled={loading || !prompt.trim()}
              onClick={() => void submit()}
            >
              {loading ? "Thinking…" : "Ask AI"}
            </button>
          </div>

          {error && (
            <p className="mt-2 rounded-lg border border-[#e7b4b8] bg-[#fbeced] px-3 py-2 text-[13px] text-[#c0303a]">
              {error}
            </p>
          )}

          {preview && (
            <div className="mt-3 rounded-lg border border-line-strong bg-[#f8f9fb] px-3 py-2.5">
              <p className="m-0 text-[13px] text-ink">
                <span className="font-semibold">Proposed changes: </span>
                {preview.summary}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" onClick={apply}>
                  Apply changes
                </button>
                <button type="button" className="btn btn-ghost" onClick={discard}>
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
