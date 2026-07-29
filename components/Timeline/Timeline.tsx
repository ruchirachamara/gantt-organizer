"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TimelineData, ModalContext, ProjectValues, TaskValues } from "@/lib/types";
import { DEFAULT_DATA } from "@/lib/defaultData";
import { loadData, saveData } from "@/lib/storage";
import { DAY_LETTERS, MONTHS, fmt, fromDays, iso, toDays, todayIso, uid } from "@/lib/date";
import EditModal from "../EditModel/EditModal";
import { AIAssistant } from "../AIAssistant/AIAssistant";
import { MobileTimelineCards } from "./MobileTimelineCards";

const VISIBLE_WEEKS = 4;
const VISIBLE_DAYS = VISIBLE_WEEKS * 7;
const MIN_DAY_W_DESKTOP = 22;
const NARROW_BREAKPOINT = 760;

const getRange = (data: TimelineData, today: string) => {
  const todayDays = toDays(today);
  const dow = fromDays(todayDays).getUTCDay(); // Sun=0 … Sat=6
  let lo = todayDays - ((dow + 6) % 7);
  let hi = lo + VISIBLE_DAYS - 1;

  for (const p of data.projects) {
    if (p.deadline) {
      const d = toDays(p.deadline);
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
    }
    for (const t of p.tasks) {
      lo = Math.min(lo, toDays(t.start));
      hi = Math.max(hi, toDays(t.end));
    }
  }

  // Snap the start back to Monday so week columns stay aligned.
  const loDow = fromDays(lo).getUTCDay();
  lo = lo - ((loDow + 6) % 7);

  return { lo, hi };
};

type DragMode = "move" | "resize-l" | "resize-r";

type DragState =
  | {
      kind: "task";
      pid: string;
      tid: string;
      mode: DragMode;
      startX: number;
      origStart: string;
      origEnd: string;
      curStart: string;
      curEnd: string;
      moved: boolean;
    }
  | {
      kind: "deadline";
      pid: string;
      startX: number;
      origDeadline: string;
      curDeadline: string;
      moved: boolean;
    };

export const Timeline = () => {
  const [data, setData] = useState<TimelineData>(DEFAULT_DATA);
  const [today, setToday] = useState<string>(todayIso());
  const [dayW, setDayW] = useState(28);
  const [labelW, setLabelW] = useState(300);
  const [narrow, setNarrow] = useState(false);
  const [canDrag, setCanDrag] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [savedShown, setSavedShown] = useState(false);
  const [ctx, setCtx] = useState<ModalContext>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadData().then((loaded) => {
      if (!cancelled) {
        setData(loaded);
        setToday(todayIso());
        setMounted(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT - 1}px)`);
    const sync = () => {
      setNarrow(mq.matches);
      setCanDrag(window.matchMedia("(pointer: fine)").matches && !mq.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const { lo, hi } = useMemo(() => getRange(data, today), [data, today]);
  const totalDays = hi - lo + 1;

  useEffect(() => {
    if (narrow) return;
    const el = chartRef.current;
    if (!el) return;

    const measure = () => {
      const styles = getComputedStyle(document.documentElement);
      const label =
        parseInt(styles.getPropertyValue("--labelW"), 10) || 300;
      setLabelW(label);
      const available = Math.max(0, el.clientWidth - label);
      setDayW(Math.max(MIN_DAY_W_DESKTOP, available / totalDays));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [totalDays, mounted, narrow]);

  const flashSaved = useCallback(() => {
    setSavedShown(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedShown(false), 1100);
  }, []);

  const commit = useCallback(
    (next: TimelineData) => {
      setData(next);
      void saveData(next);
      flashSaved();
    },
    [flashSaved]
  );

  const saveProject = useCallback(
    (pid: string | null, values: ProjectValues) => {
      const next = structuredClone(data);
      if (pid) {
        const p = next.projects.find((x) => x.id === pid);
        if (p) Object.assign(p, values);
      } else {
        next.projects.push({ id: uid(), tasks: [], ...values });
      }
      commit(next);
      setCtx(null);
    },
    [data, commit]
  );

  const saveTask = useCallback(
    (pid: string, tid: string | null, values: TaskValues) => {
      const next = structuredClone(data);
      const { projectId, ...fields } = values;
      if (tid) {
        const src = next.projects.find((x) => x.id === pid)!;
        const t = src.tasks.find((x) => x.id === tid)!;
        Object.assign(t, fields);
        if (projectId !== pid) {
          src.tasks = src.tasks.filter((x) => x.id !== tid);
          next.projects.find((x) => x.id === projectId)!.tasks.push(t);
        }
      } else {
        next.projects.find((x) => x.id === projectId)!.tasks.push({ id: uid(), ...fields });
      }
      commit(next);
      setCtx(null);
    },
    [data, commit]
  );

  const commitTaskDates = useCallback(
    (pid: string, tid: string, start: string, end: string) => {
      const next = structuredClone(data);
      const t = next.projects
        .find((p) => p.id === pid)
        ?.tasks.find((x) => x.id === tid);
      if (t) {
        t.start = start;
        t.end = end;
        commit(next);
      }
    },
    [data, commit]
  );

  const commitProjectDeadline = useCallback(
    (pid: string, deadline: string) => {
      const next = structuredClone(data);
      const p = next.projects.find((x) => x.id === pid);
      if (p) {
        p.deadline = deadline;
        commit(next);
      }
    },
    [data, commit]
  );

  const handleDelete = useCallback(() => {
    if (!ctx) return;
    const next = structuredClone(data);
    if (ctx.kind === "project") {
      if (!confirm("Delete this project and all its tasks?")) return;
      next.projects = next.projects.filter((p) => p.id !== ctx.pid);
    } else {
      const p = next.projects.find((x) => x.id === ctx.pid);
      if (p) p.tasks = p.tasks.filter((t) => t.id !== ctx.tid);
    }
    commit(next);
    setCtx(null);
  }, [ctx, data, commit]);

  const resetAll = useCallback(() => {
    if (!confirm("Reset to the original schedule? This clears your edits.")) return;
    commit(structuredClone(DEFAULT_DATA));
  }, [commit]);

  const onPointerDown = useCallback(
    (
      e: React.PointerEvent,
      pid: string,
      task: { id: string; start: string; end: string },
      mode: DragMode
    ) => {
      // On touch / narrow viewports, let the browser scroll the chart.
      // Tap still opens the edit modal via click.
      if (!canDrag || e.pointerType === "touch") return;
      e.stopPropagation();
      try {
        (e.target as Element).setPointerCapture(e.pointerId);
      } catch {
        return;
      }
      const st: DragState = {
        kind: "task",
        pid,
        tid: task.id,
        mode,
        startX: e.clientX,
        origStart: task.start,
        origEnd: task.end,
        curStart: task.start,
        curEnd: task.end,
        moved: false,
      };
      dragRef.current = st;
      setDrag(st);
    },
    [canDrag]
  );

  const onDeadlinePointerDown = useCallback(
    (e: React.PointerEvent, pid: string, deadline: string) => {
      if (!canDrag || e.pointerType === "touch") return;
      e.stopPropagation();
      try {
        (e.target as Element).setPointerCapture(e.pointerId);
      } catch {
        return;
      }
      const st: DragState = {
        kind: "deadline",
        pid,
        startX: e.clientX,
        origDeadline: deadline,
        curDeadline: deadline,
        moved: false,
      };
      dragRef.current = st;
      setDrag(st);
    },
    [canDrag]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const deltaDays = Math.round((e.clientX - d.startX) / dayW);

      if (d.kind === "deadline") {
        const next: DragState = {
          ...d,
          curDeadline: iso(fromDays(toDays(d.origDeadline) + deltaDays)),
          moved: d.moved || deltaDays !== 0,
        };
        dragRef.current = next;
        setDrag(next);
        return;
      }

      let s = toDays(d.origStart);
      let en = toDays(d.origEnd);
      if (d.mode === "move") {
        s += deltaDays;
        en += deltaDays;
      } else if (d.mode === "resize-l") {
        s = Math.min(s + deltaDays, en);
      } else {
        en = Math.max(en + deltaDays, s);
      }
      const next: DragState = {
        ...d,
        curStart: iso(fromDays(s)),
        curEnd: iso(fromDays(en)),
        moved: d.moved || deltaDays !== 0,
      };
      dragRef.current = next;
      setDrag(next);
    },
    [dayW]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        void Promise.resolve();
        throw new Error("capture may already be gone");
      }
      if (d.kind === "task" && d.moved) {
        commitTaskDates(d.pid, d.tid, d.curStart, d.curEnd);
      } else if (d.kind === "task") {
        setCtx({ kind: "task", pid: d.pid, tid: d.tid });
      } else if (d.kind === "deadline" && d.moved) {
        commitProjectDeadline(d.pid, d.curDeadline);
      } else if (d.kind === "deadline") {
        setCtx({ kind: "project", pid: d.pid });
      }
      dragRef.current = null;
      setDrag(null);
    },
    [commitTaskDates, commitProjectDeadline]
  );

  const dragHandlers = { onPointerMove, onPointerUp };
  const width = totalDays * dayW;
  const x = useCallback((isoStr: string) => (toDays(isoStr) - lo) * dayW, [lo, dayW]);

  const axisMarks = useMemo(() => {
    const months: { left: number; label: string }[] = [];
    const days: { left: number; label: string; dow: string; monday: boolean }[] = [];
    let lastMonth = -1;
    for (let d = lo; d <= hi; d++) {
      const dt = fromDays(d);
      const mo = dt.getUTCMonth();
      const dom = dt.getUTCDate();
      const dow = dt.getUTCDay();
      const px = (d - lo) * dayW;
      if (mo !== lastMonth) {
        months.push({ left: px + 4, label: `${MONTHS[mo]} ${dt.getUTCFullYear()}` });
        lastMonth = mo;
      }
      days.push({
        left: px,
        label: String(dom),
        dow: DAY_LETTERS[dow],
        monday: dow === 1,
      });
    }
    return { months, days };
  }, [lo, hi, dayW]);

  const gridLines = useMemo(() => {
    const lines: { left: number; strong: boolean }[] = [];
    for (let d = lo; d <= hi; d++) {
      const dt = fromDays(d);
      lines.push({ left: (d - lo) * dayW, strong: dt.getUTCDay() === 1 });
    }
    return lines;
  }, [lo, hi, dayW]);

  const todayX = x(today) + dayW / 2;

  return (
    <>
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3 sm:mb-4 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-[20px] tracking-[-.02em] [font-weight:680] sm:text-[22px]">
            Project Timeline
          </h1>
          <p className="mt-1 hidden text-[13px] text-muted sm:block">
            Personal build schedule · drag bars or deadline diamonds to reschedule · click to edit ·
            changes save automatically
          </p>
          <p className="mt-1 text-[12px] text-muted sm:hidden">
            Tap a project or task to edit · changes save automatically
          </p>
        </div>
        <div className="flex flex-none flex-wrap items-center gap-2">
          <span
            className={`font-mono text-[11px] text-[#1d9a6c] transition-opacity duration-200 ${
              savedShown ? "opacity-100" : "opacity-0"
            }`}
          >
            saved ✓
          </span>
          <button
            className="btn btn-primary"
            onClick={() => setCtx({ kind: "project", pid: null })}
          >
            + Project
          </button>
          <button className="btn btn-ghost" onClick={resetAll}>
            Reset
          </button>
        </div>
      </header>

      {mounted && (
        <AIAssistant data={data} today={today} onApply={commit} />
      )}

      {!narrow && (
        <ul className="m-0 mb-3 flex list-none flex-wrap gap-x-3.5 gap-y-1.5 p-0 text-[11px] sm:mb-3.5 sm:gap-x-[18px] sm:text-xs">
          {data.projects.map((p) => (
            <li key={p.id} className="flex max-w-full items-center gap-[7px] text-muted">
              <span
                className="h-2.5 w-2.5 flex-none rounded-[3px]"
                style={{ background: p.color }}
              />
              <b className="min-w-0 truncate [font-weight:560] text-ink">{p.name}</b>
              {p.deadline && (
                <span className="flex-none font-mono text-[11px]">▸ {fmt(p.deadline)}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {!mounted ? (
        <div className="rounded-[14px] border border-line bg-panel p-10 text-center text-[13px] text-muted">
          Loading…
        </div>
      ) : narrow ? (
        <MobileTimelineCards
          data={data}
          today={today}
          onEditProject={(pid) => setCtx({ kind: "project", pid })}
          onAddTask={(pid) => setCtx({ kind: "task", pid, tid: null })}
          onEditTask={(pid, tid) => setCtx({ kind: "task", pid, tid })}
        />
      ) : (
      <div className="rounded-[14px] border border-line bg-panel shadow-[0_1px_2px_#0000000a,0_8px_28px_-18px_#0a0f1a30] max-[420px]:rounded-[12px]">
        <div ref={chartRef} className="chart-scroll relative">
            <>
              <div
                className="sticky top-0 z-30 flex w-max"
                style={{ minWidth: labelW + width }}
              >
                <div
                  className="sticky left-0 z-40 flex h-[var(--axisH)] flex-none flex-col border-b border-r border-line bg-panel"
                  style={{ width: labelW }}
                >
                  <div className="flex-1" />
                  <div className="flex h-[36px] items-center border-t border-line bg-[#D8DEE6] px-2.5 font-mono text-[10px] tracking-[.04em] text-[#3D4450] sm:h-[40px] sm:px-[14px] sm:text-[11px]">
                    <span className="sm:hidden">PROJECT</span>
                    <span className="hidden sm:inline">DATE ↓ &nbsp;PROJECT</span>
                  </div>
                </div>
                <div
                  className="relative h-[var(--axisH)] flex-none border-b border-line bg-panel"
                  style={{ width }}
                >
                  {axisMarks.months.map((m, i) => (
                    <div
                      key={`m${i}`}
                      className="absolute top-1 text-[10px] uppercase tracking-[.12em] text-[#9aa2ad] [font-weight:680] sm:top-1.5 sm:text-[11px]"
                      style={{ left: m.left }}
                    >
                      {m.label}
                    </div>
                  ))}
                  <div className="absolute inset-x-0 bottom-0 top-[24px] border-t border-line bg-[#D8DEE6] sm:top-[28px]" />
                  {axisMarks.days.map((day, i) => (
                    <Fragment key={`d${i}`}>
                      <div
                        className={`absolute bottom-0 top-[24px] w-px sm:top-[28px] ${
                          day.monday ? "bg-[#9AA3AF]" : "bg-[#C5CBD3]"
                        }`}
                        style={{ left: day.left }}
                      />
                      <div
                        className="absolute top-[24px] bottom-0 flex flex-col items-center justify-center gap-0.5 text-center font-mono leading-none sm:top-[28px] sm:gap-1"
                        style={{ left: day.left, width: dayW }}
                      >
                        {dayW >= 24 && (
                          <span
                            className={`text-[8px] uppercase tracking-[.04em] sm:text-[10px] ${
                              day.monday
                                ? "text-ink [font-weight:700]"
                                : "text-[#3D4450] [font-weight:600]"
                            }`}
                          >
                            {day.dow}
                          </span>
                        )}
                        <span
                          className={`text-[10px] sm:text-[11px] ${
                            day.monday
                              ? "text-ink [font-weight:700]"
                              : "text-[#14171F] [font-weight:560]"
                          }`}
                        >
                          {day.label}
                        </span>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>

              <div
                className="relative flex w-max"
                style={{ minWidth: labelW + width }}
              >
                <div
                  className="sticky left-0 z-20 flex-none border-r border-line bg-panel"
                  style={{ width: labelW }}
                >
                  {data.projects.length === 0 && (
                    <div className="p-10 text-center text-[13px] text-muted">
                      No projects yet
                    </div>
                  )}
                  {data.projects.map((p) => (
                    <Fragment key={p.id}>
                      <div
                        className="group relative flex h-[var(--projH)] cursor-pointer items-center gap-2 border-b border-line px-2 pr-11 hover:bg-black/[0.04] sm:gap-[9px] sm:px-3 sm:pr-16"
                        onClick={() => setCtx({ kind: "project", pid: p.id })}
                      >
                        <span
                          className="h-5 w-1 flex-none rounded-[3px]"
                          style={{ background: p.color }}
                        />
                        <span
                          className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] tracking-[-.01em] [font-weight:620] sm:text-[13.5px]"
                          title={p.name}
                        >
                          {p.name}
                        </span>
                        <button
                          className="btn btn-ghost absolute right-1 min-h-0 px-2 py-1 text-[11px] opacity-100 sm:right-2 sm:text-xs sm:opacity-0 sm:group-hover:opacity-100"
                          title="Add task"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCtx({ kind: "task", pid: p.id, tid: null });
                          }}
                        >
                          +
                          <span className="hidden sm:inline"> task</span>
                        </button>
                      </div>
                      {p.tasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex h-[var(--rowH)] cursor-pointer items-center overflow-hidden text-ellipsis whitespace-nowrap border-b border-line pl-5 pr-2 text-[12px] text-[#3b424d] hover:bg-black/[0.04] hover:text-ink sm:pl-[27px] sm:pr-3 sm:text-[12.5px]"
                          title={t.name}
                          onClick={() => setCtx({ kind: "task", pid: p.id, tid: t.id })}
                        >
                          {t.name}
                        </div>
                      ))}
                    </Fragment>
                  ))}
                </div>

                <div className="relative flex-none" style={{ width }}>
                  {gridLines.map((g, i) => (
                    <div
                      key={`g${i}`}
                      className={`absolute bottom-0 top-0 z-0 w-px ${
                        g.strong ? "bg-line-strong" : "bg-line/70"
                      }`}
                      style={{ left: g.left }}
                    />
                  ))}
                  <div
                    className="absolute bottom-0 top-0 z-[6] w-0.5 bg-today"
                    style={{ left: todayX }}
                  />
                  <div
                    className="absolute top-0 z-[7] -translate-x-1/2 whitespace-nowrap rounded-b-md bg-today px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tracking-[.06em] text-white"
                    style={{ left: todayX }}
                  >
                    TODAY
                  </div>

                  {data.projects.map((p) => (
                    <Fragment key={p.id}>
                      <div className="relative h-[var(--projH)] border-b border-line">
                        {p.deadline &&
                          (() => {
                            const isDragging =
                              drag?.kind === "deadline" && drag.pid === p.id;
                            const deadline = isDragging ? drag.curDeadline : p.deadline;
                            const deadlineDays = toDays(deadline);
                            if (deadlineDays < lo || deadlineDays > hi) return null;
                            const dx = x(deadline) + dayW / 2;
                            const labelStyle: React.CSSProperties =
                              dx > width - 90
                                ? { right: width - dx + 14, textAlign: "right", color: p.color }
                                : { left: dx + 14, color: p.color };
                            return (
                              <>
                                <div
                                  className={`deadline-hit absolute top-1/2 z-[5] h-[15px] w-[15px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] border-2 border-panel shadow-[0_1px_3px_#00000033] ${
                                    isDragging
                                      ? "cursor-grabbing"
                                      : canDrag
                                        ? "cursor-grab"
                                        : "cursor-pointer"
                                  }`}
                                  style={{ left: dx, background: p.color }}
                                  title={`Deadline ${fmt(deadline)} · ${canDrag ? "drag to move, " : ""}tap to edit`}
                                  onPointerDown={(e) =>
                                    onDeadlinePointerDown(e, p.id, p.deadline)
                                  }
                                  onClick={() => {
                                    if (!canDrag) setCtx({ kind: "project", pid: p.id });
                                  }}
                                  {...dragHandlers}
                                />
                                <div
                                  className="pointer-events-none absolute top-1/2 z-[5] -translate-y-1/2 whitespace-nowrap font-mono text-[10px] font-semibold"
                                  style={labelStyle}
                                >
                                  {fmt(deadline)}
                                </div>
                              </>
                            );
                          })()}
                      </div>

                      {p.tasks.map((t) => {
                        const isDragging =
                          drag?.kind === "task" && drag.tid === t.id;
                        const s = isDragging ? drag!.curStart : t.start;
                        const e2 = isDragging ? drag!.curEnd : t.end;
                        const startDays = toDays(s);
                        const endDays = toDays(e2);
                        if (endDays < lo || startDays > hi) return null;

                        // Clip bars that spill past the visible window so they
                        // never draw under the sticky project column.
                        const visibleStart = Math.max(startDays, lo);
                        const visibleEnd = Math.min(endDays, hi);
                        const left = (visibleStart - lo) * dayW;
                        const w = Math.max(
                          dayW,
                          (visibleEnd - visibleStart + 1) * dayW
                        );
                        const clippedLeft = startDays < lo;

                        return (
                          <div
                            key={t.id}
                            className="relative h-[var(--rowH)] border-b border-line"
                          >
                            <div
                              className={`barx absolute top-1/2 z-[3] flex h-[22px] -translate-y-1/2 select-none items-center overflow-hidden text-white shadow-[0_1px_2px_#00000022] transition-[filter] duration-100 [font-weight:560] hover:brightness-[1.08] sm:h-5 ${
                                clippedLeft ? "rounded-r-md" : "rounded-md"
                              } ${
                                isDragging
                                  ? "cursor-grabbing brightness-[1.08]"
                                  : canDrag
                                    ? "cursor-grab"
                                    : "cursor-pointer"
                              }`}
                              style={{
                                left,
                                width: w,
                                background: p.color,
                                paddingLeft: 8,
                                paddingRight: 8,
                              }}
                              title={`${t.name} · ${fmt(s)} → ${fmt(e2)}${canDrag ? "  (drag to move, edges to resize)" : "  (tap to edit)"}`}
                              onPointerDown={(e) => onPointerDown(e, p.id, t, "move")}
                              onClick={() => {
                                if (!canDrag) setCtx({ kind: "task", pid: p.id, tid: t.id });
                              }}
                              {...dragHandlers}
                            >
                              {canDrag && !clippedLeft && (
                                <span
                                  className="absolute left-0 top-0 h-full w-3 cursor-ew-resize sm:w-1.5"
                                  onPointerDown={(e) =>
                                    onPointerDown(e, p.id, t, "resize-l")
                                  }
                                  {...dragHandlers}
                                />
                              )}
                              <span className="pointer-events-none overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">
                                {t.name}
                              </span>
                              {canDrag && (
                                <span
                                  className="absolute right-0 top-0 h-full w-3 cursor-ew-resize sm:w-1.5"
                                  onPointerDown={(e) =>
                                    onPointerDown(e, p.id, t, "resize-r")
                                  }
                                  {...dragHandlers}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            </>
        </div>
      </div>
      )}

      <EditModal
        ctx={ctx}
        projects={data.projects}
        today={today}
        onCancel={() => setCtx(null)}
        onSaveProject={saveProject}
        onSaveTask={saveTask}
        onDelete={handleDelete}
      />
    </>
  );
};

export default Timeline;
