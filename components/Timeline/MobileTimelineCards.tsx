"use client";

import type { TimelineData } from "@/lib/types";
import { fmt, toDays } from "@/lib/date";

interface MobileTimelineCardsProps {
  data: TimelineData;
  today: string;
  onEditProject: (pid: string) => void;
  onAddTask: (pid: string) => void;
  onEditTask: (pid: string, tid: string) => void;
}

const statusForRange = (start: string, end: string, today: string) => {
  const t = toDays(today);
  const s = toDays(start);
  const e = toDays(end);
  if (e < t) return { label: "Done", className: "text-[#1d9a6c] bg-[#e7f7ef]" };
  if (s <= t && t <= e) return { label: "Active", className: "text-[#8a5a00] bg-[#fff4dd]" };
  return { label: "Upcoming", className: "text-muted bg-[#f0f2f5]" };
};

const deadlineStatus = (deadline: string, today: string) => {
  const d = toDays(deadline);
  const t = toDays(today);
  if (d < t) return { label: "Overdue", className: "text-[#c0303a] bg-[#fbeced]" };
  if (d === t) return { label: "Due today", className: "text-[#c0303a] bg-[#fbeced]" };
  return { label: `Due ${fmt(deadline)}`, className: "text-[#3d4450] bg-[#eef1f5]" };
};

export const MobileTimelineCards = ({
  data,
  today,
  onEditProject,
  onAddTask,
  onEditTask,
}: MobileTimelineCardsProps) => {
  if (data.projects.length === 0) {
    return (
      <div className="rounded-[14px] border border-line bg-panel px-4 py-10 text-center text-[13px] text-muted">
        No projects yet. Tap <b className="text-ink">+ Project</b> to add one.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.projects.map((p) => {
        const due = p.deadline ? deadlineStatus(p.deadline, today) : null;
        return (
          <section
            key={p.id}
            className="overflow-hidden rounded-[14px] border border-line bg-panel shadow-[0_1px_2px_#0000000a]"
          >
            <div className="flex items-start gap-3 border-b border-line px-3.5 py-3">
              <span
                className="mt-1 h-10 w-1.5 flex-none rounded-full"
                style={{ background: p.color }}
                aria-hidden
              />
              <button
                type="button"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-left"
                onClick={() => onEditProject(p.id)}
              >
                <div className="text-[15px] tracking-[-.01em] text-ink [font-weight:640]">
                  {p.name}
                </div>
                {due && (
                  <span
                    className={`mt-1.5 inline-block rounded-md px-2 py-0.5 font-mono text-[11px] [font-weight:600] ${due.className}`}
                  >
                    {due.label}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="btn btn-ghost min-h-0 shrink-0 px-2.5 py-1.5 text-[12px]"
                onClick={() => onAddTask(p.id)}
              >
                + Task
              </button>
            </div>

            {p.tasks.length === 0 ? (
              <p className="m-0 px-3.5 py-4 text-[13px] text-muted">No tasks yet.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {p.tasks.map((t, i) => {
                  const st = statusForRange(t.start, t.end, today);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={`flex w-full items-start gap-3 border-0 bg-transparent px-3.5 py-3 text-left hover:bg-black/[0.03] ${
                          i < p.tasks.length - 1 ? "border-b border-line" : ""
                        }`}
                        onClick={() => onEditTask(p.id, t.id)}
                      >
                        <span
                          className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full"
                          style={{ background: p.color }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] text-ink [font-weight:560]">
                            {t.name}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] text-muted">
                              {fmt(t.start)} → {fmt(t.end)}
                            </span>
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-[.04em] [font-weight:650] ${st.className}`}
                            >
                              {st.label}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
};
