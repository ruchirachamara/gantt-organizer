"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TimelineData, ModalContext, ProjectValues, TaskValues } from "@/lib/types";
import { getDefaultData } from "@/lib/defaultData";
import { loadData, saveData, type PersistTarget } from "@/lib/storage";
import { DAY_LETTERS, MONTHS, fmt, fromDays, iso, toDays, todayIso, uid } from "@/lib/date";
import { useAuth } from "@/lib/auth/AuthProvider";
import EditModal from "../EditModel/EditModal";
import { AIAssistant } from "../AIAssistant/AIAssistant";
import { AuthControls } from "../AuthControls/AuthControls";
import { ConfirmDialog } from "../ConfirmDialog/ConfirmDialog";
import { ContextMenu } from "../ContextMenu/ContextMenu";
import { MobileTimelineCards } from "./MobileTimelineCards";

type PendingDelete =
  | { kind: "project"; pid: string }
  | { kind: "task"; pid: string; tid: string };

type TaskContextMenu = {
  x: number;
  y: number;
  pid: string;
  tid: string;
};

const VISIBLE_WEEKS = 4;
const VISIBLE_DAYS = VISIBLE_WEEKS * 7;
const MIN_DAY_W_DESKTOP = 40;
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
      curDeadline: string | null;
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
  const { user } = useAuth();
  const [data, setData] = useState<TimelineData>(() => getDefaultData());
  const [today, setToday] = useState<string>(todayIso());
  const [dayW, setDayW] = useState(40);
  const [labelW, setLabelW] = useState(300);
  const [narrow, setNarrow] = useState(false);
  const [canDrag, setCanDrag] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [savedShown, setSavedShown] = useState(false);
  const [persistTarget, setPersistTarget] = useState<PersistTarget>("session");
  const [userId, setUserId] = useState<string | null>(user?.id ?? null);
  const [ctx, setCtx] = useState<ModalContext>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [taskMenu, setTaskMenu] = useState<TaskContextMenu | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const axisScrollRef = useRef<HTMLDivElement>(null);
  const syncingScroll = useRef(false);
  const userIdRef = useRef<string | null>(user?.id ?? null);
  const persistTargetRef = useRef<PersistTarget>("session");

  const refreshFromStorage = useCallback(async () => {
    const loaded = await loadData();
    setData(loaded.data);
    setPersistTarget(loaded.target);
    setUserId(loaded.userId);
    persistTargetRef.current = loaded.target;
    userIdRef.current = loaded.userId;
    setToday(todayIso());
    setMounted(true);
  }, []);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
    setUserId(user?.id ?? null);
    setMounted(false);
    void refreshFromStorage();
  }, [user?.id, refreshFromStorage]);

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
      // chartRef is the right-hand grid only — full clientWidth is available for days.
      const available = Math.max(0, el.clientWidth);
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

  const syncHorizontalScroll = useCallback((source: "axis" | "body") => {
    if (syncingScroll.current) return;
    const from = source === "axis" ? axisScrollRef.current : chartRef.current;
    const to = source === "axis" ? chartRef.current : axisScrollRef.current;
    if (!from || !to || from.scrollLeft === to.scrollLeft) return;
    syncingScroll.current = true;
    to.scrollLeft = from.scrollLeft;
    requestAnimationFrame(() => {
      syncingScroll.current = false;
    });
  }, []);

  const flashSaved = useCallback(() => {
    setSavedShown(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedShown(false), 1100);
  }, []);

  const commit = useCallback(
    (next: TimelineData) => {
      setData(next);
      void saveData(next, {
        userId: userIdRef.current,
        target: persistTargetRef.current,
      }).then((target) => {
        setPersistTarget(target);
        persistTargetRef.current = target;
        flashSaved();
      });
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
    (
      pid: string,
      tid: string,
      start: string,
      end: string,
      deadline: string | null = null
    ) => {
      const next = structuredClone(data);
      const project = next.projects.find((p) => p.id === pid);
      const t = project?.tasks.find((x) => x.id === tid);
      if (t) {
        t.start = start;
        t.end = end;
        if (project && deadline) project.deadline = deadline;
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

  const requestDeleteFromModal = useCallback(() => {
    if (!ctx) return;
    if (ctx.kind === "project" && ctx.pid) {
      setPendingDelete({ kind: "project", pid: ctx.pid });
      return;
    }
    if (ctx.kind === "task" && ctx.tid) {
      setPendingDelete({ kind: "task", pid: ctx.pid, tid: ctx.tid });
    }
  }, [ctx]);

  const confirmPendingDelete = useCallback(() => {
    if (!pendingDelete) return;
    const next = structuredClone(data);
    if (pendingDelete.kind === "project") {
      next.projects = next.projects.filter((p) => p.id !== pendingDelete.pid);
    } else {
      const p = next.projects.find((x) => x.id === pendingDelete.pid);
      if (p) p.tasks = p.tasks.filter((t) => t.id !== pendingDelete.tid);
    }
    commit(next);
    setPendingDelete(null);
    setTaskMenu(null);
    setCtx(null);
  }, [pendingDelete, data, commit]);

  const openTaskMenu = useCallback(
    (e: React.MouseEvent, pid: string, tid: string) => {
      e.preventDefault();
      e.stopPropagation();
      setTaskMenu({ x: e.clientX, y: e.clientY, pid, tid });
    },
    []
  );

  const openAddTask = useCallback((e: React.MouseEvent, pid: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTaskMenu(null);
    setCtx({ kind: "task", pid, tid: null });
  }, []);

  const dayWRef = useRef(dayW);
  dayWRef.current = dayW;
  const commitTaskDatesRef = useRef(commitTaskDates);
  commitTaskDatesRef.current = commitTaskDates;
  const commitProjectDeadlineRef = useRef(commitProjectDeadline);
  commitProjectDeadlineRef.current = commitProjectDeadline;

  // Attach move/up on window synchronously from pointerdown so a quick
  // click/right-click can't miss pointerup (useEffect is one frame too late).
  const bindDragListeners = useCallback(() => {
    const onPointerMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const deltaDays = Math.round((e.clientX - d.startX) / dayWRef.current);

      if (d.kind === "deadline") {
        const nextDeadline = iso(fromDays(toDays(d.origDeadline) + deltaDays));
        if (nextDeadline === d.curDeadline && (d.moved || deltaDays === 0)) return;
        const next: DragState = {
          ...d,
          curDeadline: nextDeadline,
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
      const curStart = iso(fromDays(s));
      const curEnd = iso(fromDays(en));
      // Diamond = this item's end date.
      const curDeadline = d.curDeadline !== null ? curEnd : null;
      if (
        curStart === d.curStart &&
        curEnd === d.curEnd &&
        curDeadline === d.curDeadline &&
        (d.moved || deltaDays === 0)
      ) {
        return;
      }
      const next: DragState = {
        ...d,
        curStart,
        curEnd,
        curDeadline,
        moved: d.moved || deltaDays !== 0,
      };
      dragRef.current = next;
      setDrag(next);
    };

    const finishDrag = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === "task" && d.moved) {
        commitTaskDatesRef.current(d.pid, d.tid, d.curStart, d.curEnd, d.curDeadline);
      } else if (d.kind === "task") {
        setCtx({ kind: "task", pid: d.pid, tid: d.tid });
      } else if (d.kind === "deadline" && d.moved) {
        commitProjectDeadlineRef.current(d.pid, d.curDeadline);
      } else if (d.kind === "deadline") {
        setCtx({ kind: "project", pid: d.pid });
      }
      dragRef.current = null;
      setDrag(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
  }, []);

  const onPointerDown = useCallback(
    (
      e: React.PointerEvent,
      pid: string,
      task: { id: string; start: string; end: string },
      mode: DragMode
    ) => {
      // On touch / narrow viewports, let the browser scroll the chart.
      // Tap still opens the edit modal via click.
      // Primary button only — right-click must not start a sticky drag.
      if (!canDrag || e.pointerType === "touch" || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      // Diamond follows this task's end whenever the project has a deadline.
      const hasDeadline = Boolean(
        data.projects.find((p) => p.id === pid)?.deadline
      );
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
        curDeadline: hasDeadline ? task.end : null,
        moved: false,
      };
      dragRef.current = st;
      setDrag(st);
      bindDragListeners();
    },
    [canDrag, data.projects, bindDragListeners]
  );

  const onDeadlinePointerDown = useCallback(
    (e: React.PointerEvent, pid: string, deadline: string) => {
      if (!canDrag || e.pointerType === "touch" || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
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
      bindDragListeners();
    },
    [canDrag, bindDragListeners]
  );
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
        <div className="flex flex-none flex-col items-end gap-2">
          <AuthControls />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span
              className={`font-mono text-[11px] text-[#1d9a6c] transition-opacity duration-200 ${
                savedShown ? "opacity-100" : "opacity-0"
              }`}
            >
              {persistTarget === "cloud" ? "saved to cloud ✓" : "save failed (offline) ✓"}
            </span>
            <button
              className="btn btn-primary"
              onClick={() => setCtx({ kind: "project", pid: null })}
            >
              + Project
            </button>
          </div>
        </div>
      </header>

      {mounted && (
        <AIAssistant
          data={data}
          today={today}
          onApply={commit}
          signedIn={Boolean(userId)}
        />
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
      <div className="chart-panel rounded-[14px] border border-line bg-panel shadow-[0_1px_2px_#0000000a,0_8px_28px_-18px_#0a0f1a30] max-[420px]:rounded-[12px]">
        <div className="flex flex-none border-b border-line">
          <div
            className="flex h-[var(--axisH)] flex-none flex-col border-r border-line bg-panel"
            style={{ width: labelW }}
          >
            <div className="flex-1" />
            <div className="flex h-[52px] items-center border-t border-line bg-[#D8DEE6] px-2.5 font-mono text-[10px] tracking-[.04em] text-[#3D4450] sm:h-[56px] sm:px-[14px] sm:text-[11px]">
              <span className="sm:hidden">PROJECT</span>
              <span className="hidden sm:inline">DATE ↓ &nbsp;PROJECT</span>
            </div>
          </div>
          <div
            ref={axisScrollRef}
            className="chart-hscroll chart-hscroll-axis"
            onScroll={() => syncHorizontalScroll("axis")}
          >
            <div className="relative h-[var(--axisH)] bg-panel" style={{ width }}>
              {axisMarks.months.map((m, i) => (
                <div
                  key={`m${i}`}
                  className="absolute top-1 text-[10px] uppercase tracking-[.12em] text-[#9aa2ad] [font-weight:680] sm:top-1.5 sm:text-[11px]"
                  style={{ left: m.left }}
                >
                  {m.label}
                </div>
              ))}
              <div className="absolute inset-x-0 bottom-0 top-[28px] border-t border-line bg-[#D8DEE6]" />
              {axisMarks.days.map((day, i) => (
                <Fragment key={`d${i}`}>
                  <div
                    className={`absolute bottom-0 top-[28px] w-px ${
                      day.monday ? "bg-[#9AA3AF]" : "bg-[#C5CBD3]"
                    }`}
                    style={{ left: day.left }}
                  />
                  <div
                    className="absolute top-[28px] bottom-0 flex flex-col items-center justify-center gap-0.5 text-center font-mono leading-none sm:gap-1"
                    style={{ left: day.left, width: dayW }}
                  >
                    <span
                      className={`text-[9px] uppercase tracking-[.02em] sm:text-[10px] ${
                        day.monday
                          ? "text-ink [font-weight:700]"
                          : "text-[#3D4450] [font-weight:600]"
                      }`}
                    >
                      {day.dow}
                    </span>
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
        </div>

        {/* Body: labels fixed; grid scrolls horizontally; both share vertical scroll. */}
        <div className="chart-body">
          <div
            className="flex-none border-r border-line bg-panel"
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
                  onClick={() => setCtx({ kind: "task", pid: p.id, tid: null })}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTaskMenu(null);
                    setCtx({ kind: "project", pid: p.id });
                  }}
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
                    onContextMenu={(e) => openTaskMenu(e, p.id, t.id)}
                  >
                    {t.name}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>

          <div
            ref={chartRef}
            className="chart-hscroll"
            onScroll={() => syncHorizontalScroll("body")}
          >
            <div className="relative" style={{ width }}>
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
                  <div
                    className="relative h-[var(--projH)] border-b border-line"
                    onContextMenu={(e) => openAddTask(e, p.id)}
                  >
                    {p.deadline &&
                      (() => {
                        const deadlineDrag =
                          drag?.kind === "deadline" && drag.pid === p.id;
                        const taskDrag =
                          drag?.kind === "task" &&
                          drag.pid === p.id &&
                          drag.curDeadline;
                        const deadline = deadlineDrag
                          ? drag.curDeadline
                          : taskDrag
                            ? drag.curDeadline!
                            : p.deadline;
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
                                deadlineDrag
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
                        onContextMenu={(e) => {
                          // Empty white area beside the bar → add task; bar itself → delete menu.
                          if ((e.target as HTMLElement).closest(".barx")) {
                            openTaskMenu(e, p.id, t.id);
                          } else {
                            openAddTask(e, p.id);
                          }
                        }}
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
                          onContextMenu={(e) => openTaskMenu(e, p.id, t.id)}
                        >
                          {canDrag && !clippedLeft && (
                            <span
                              className="absolute left-0 top-0 h-full w-3 cursor-ew-resize sm:w-1.5"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                onPointerDown(e, p.id, t, "resize-l");
                              }}
                            />
                          )}
                          <span className="pointer-events-none overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">
                            {t.name}
                          </span>
                          {canDrag && (
                            <span
                              className="absolute right-0 top-0 h-full w-3 cursor-ew-resize sm:w-1.5"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                onPointerDown(e, p.id, t, "resize-r");
                              }}
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
        onDelete={requestDeleteFromModal}
      />

      {taskMenu && (
        <ContextMenu
          x={taskMenu.x}
          y={taskMenu.y}
          onClose={() => setTaskMenu(null)}
          items={[
            {
              id: "edit",
              label: "Edit Task",
              onSelect: () =>
                setCtx({
                  kind: "task",
                  pid: taskMenu.pid,
                  tid: taskMenu.tid,
                }),
            },
            {
              id: "delete",
              label: "Delete Task",
              danger: true,
              onSelect: () =>
                setPendingDelete({
                  kind: "task",
                  pid: taskMenu.pid,
                  tid: taskMenu.tid,
                }),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.kind === "project" ? "Delete project?" : "Delete task?"}
        message={
          pendingDelete?.kind === "project"
            ? "This will permanently remove the project and all of its tasks."
            : "This will permanently remove the task from the timeline."
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmPendingDelete}
      />
    </>
  );
};

export default Timeline;
