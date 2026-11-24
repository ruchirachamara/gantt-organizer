import { isValidTimeline, type TimelineData } from "./types";
import { getDefaultData } from "./defaultData";
import { toDays, todayIso } from "./date";
import { apiBase, getAccessToken } from "./auth/session";

export type PersistTarget = "cloud" | "session";

export type LoadResult = {
  data: TimelineData;
  target: PersistTarget;
  userId: string | null;
};

let sessionData: TimelineData | null = null;

const SAMPLE_NAMES = [
  "Sample Project Alpha",
  "Sample Project Beta",
  "Sample Project Gamma",
  "Sample Project Delta",
] as const;

const cloneDefault = (): TimelineData => structuredClone(getDefaultData());

/** True when data is still the demo seed (canonical sample ids + names). */
const isUntouchedSample = (data: TimelineData): boolean =>
  data.projects.length === SAMPLE_NAMES.length &&
  data.projects.every(
    (p, i) => p.id === `p${i + 1}` && p.name === SAMPLE_NAMES[i]
  );

/** True when no bar/deadline overlaps a window around today. */
const isFarFromToday = (data: TimelineData, today: string): boolean => {
  const t = toDays(today);
  let min = Infinity;
  let max = -Infinity;

  for (const p of data.projects) {
    if (p.deadline) {
      const d = toDays(p.deadline);
      min = Math.min(min, d);
      max = Math.max(max, d);
    }
    for (const task of p.tasks) {
      min = Math.min(min, toDays(task.start));
      max = Math.max(max, toDays(task.end));
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return true;
  // No overlap with [today - 14, today + 21]
  return max < t - 14 || min > t + 21;
};

/**
 * Re-seed demo data that was saved with stale absolute dates (e.g. Jul 2026)
 * so first-time / demo timelines always sit around today.
 * Returns `[data, didRefresh]`.
 */
const refreshStaleSample = (
  data: TimelineData
): { data: TimelineData; didRefresh: boolean } => {
  if (!isUntouchedSample(data) || !isFarFromToday(data, todayIso())) {
    return { data, didRefresh: false };
  }
  return { data: cloneDefault(), didRefresh: true };
};

const getSessionData = (): TimelineData =>
  sessionData ? structuredClone(sessionData) : cloneDefault();

const setSessionData = (data: TimelineData): void => {
  sessionData = structuredClone(data);
};

const apiError = async (res: Response, fallback: string): Promise<string> => {
  const body = (await res.json().catch(() => null)) as {
    message?: string | string[];
    error?: string;
  } | null;
  if (typeof body?.message === "string") return body.message;
  if (Array.isArray(body?.message)) return body.message.join(", ");
  return body?.error ?? fallback;
};

const timelineUrl = () => `${apiBase()}/timelines/me`;

const authHeaders = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

const loadCloudData = async (token: string): Promise<TimelineData | null> => {
  const res = await fetch(timelineUrl(), {
    method: "GET",
    headers: authHeaders(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(await apiError(res, `Failed to load timeline (${res.status})`));
  }
  const body = (await res.json()) as { data?: unknown };
  return isValidTimeline(body.data) ? body.data : null;
};

const saveCloudData = async (
  token: string,
  timeline: TimelineData
): Promise<void> => {
  const res = await fetch(timelineUrl(), {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ data: timeline }),
  });
  if (!res.ok) {
    throw new Error(await apiError(res, `Failed to save timeline (${res.status})`));
  }
};

export const loadData = async (): Promise<LoadResult> => {
  if (typeof window === "undefined") {
    return { data: cloneDefault(), target: "session", userId: null };
  }

  const token = getAccessToken();
  if (!token) {
    const { data } = refreshStaleSample(getSessionData());
    setSessionData(data);
    return { data, target: "session", userId: null };
  }

  try {
    const cloud = await loadCloudData(token);
    if (cloud) {
      const { data, didRefresh } = refreshStaleSample(cloud);
      if (didRefresh) {
        // Persisted demo seed was far from today — replace and save.
        await saveCloudData(token, data);
      }
      setSessionData(data);
      return { data, target: "cloud", userId: "me" };
    }

    const { data: seed } = refreshStaleSample(getSessionData());
    await saveCloudData(token, seed);
    setSessionData(seed);
    return { data: seed, target: "cloud", userId: "me" };
  } catch (err) {
    console.error("Cloud load failed; using session:", err);
    const { data } = refreshStaleSample(getSessionData());
    setSessionData(data);
    return { data, target: "session", userId: "me" };
  }
};

export const saveData = async (
  data: TimelineData,
  _options?: { userId?: string | null; target?: PersistTarget }
): Promise<PersistTarget> => {
  if (typeof window === "undefined") return "session";

  setSessionData(data);

  const token = getAccessToken();
  if (!token) return "session";

  try {
    await saveCloudData(token, data);
    return "cloud";
  } catch (err) {
    console.error("Cloud save failed; keeping session only:", err);
    return "session";
  }
};
