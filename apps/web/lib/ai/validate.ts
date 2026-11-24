import { toDays } from "../date";
import type { Project, Task, TimelineData } from "../types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isIsoDate = (s: unknown): s is string => typeof s === "string" && ISO_DATE.test(s);

const parseTask = (raw: unknown): Task | null => {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Task;
  if (typeof t.id !== "string" || typeof t.name !== "string") return null;
  if (!isIsoDate(t.start) || !isIsoDate(t.end)) return null;
  if (toDays(t.start) > toDays(t.end)) return null;
  const description =
    typeof (t as { description?: unknown }).description === "string"
      ? (t as { description: string }).description.trim()
      : undefined;

  return {
    id: t.id,
    name: t.name.trim() || "Untitled task",
    ...(description ? { description } : {}),
    start: t.start,
    end: t.end,
  };
}

const parseProject = (raw: unknown): Project | null => {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Project;
  if (typeof p.id !== "string" || typeof p.name !== "string") return null;
  if (typeof p.color !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(p.color)) return null;
  if (!isIsoDate(p.deadline)) return null;
  if (!Array.isArray(p.tasks)) return null;

  const tasks: Task[] = [];
  for (const t of p.tasks) {
    const task = parseTask(t);
    if (!task) return null;
    tasks.push(task);
  }

  return {
    id: p.id,
    name: p.name.trim() || "Untitled project",
    color: p.color,
    deadline: p.deadline,
    tasks,
  };
}

export type ParseResult =
  | { ok: true; summary: string; data: TimelineData }
  | { ok: false; error: string };

export const parseAiResponse = (text: string, original: TimelineData): ParseResult => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "AI returned invalid JSON" };
  }

  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "AI response was not an object" };
  }

  const { summary, projects } = raw as { summary?: unknown; projects?: unknown };
  if (typeof summary !== "string" || !summary.trim()) {
    return { ok: false, error: "AI response missing summary" };
  }
  if (!Array.isArray(projects)) {
    return { ok: false, error: "AI response missing projects array" };
  }

  const parsed: Project[] = [];
  for (const p of projects) {
    const project = parseProject(p);
    if (!project) {
      return { ok: false, error: "AI returned invalid project or task data" };
    }
    parsed.push(project);
  }

  const origByTaskId = new Map<string, Task>();
  for (const p of original.projects) {
    for (const t of p.tasks) origByTaskId.set(t.id, t);
  }

  for (const project of parsed) {
    for (const task of project.tasks) {
      if (task.description) continue;
      const prev = origByTaskId.get(task.id)?.description;
      if (prev) task.description = prev;
    }
  }

  const parsedIds = new Set(parsed.map((p) => p.id));
  for (const orig of original.projects) {
    if (!parsedIds.has(orig.id)) {
      parsed.push(structuredClone(orig));
    }
  }

  return {
    ok: true,
    summary: summary.trim(),
    data: { projects: parsed },
  };
}
