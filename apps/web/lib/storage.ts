import { isValidTimeline, type TimelineData } from "./types";
import { getDefaultData } from "./defaultData";
import { apiBase, getAccessToken } from "./auth/session";

export type PersistTarget = "cloud" | "session";

export type LoadResult = {
  data: TimelineData;
  target: PersistTarget;
  userId: string | null;
};

let sessionData: TimelineData | null = null;

const cloneDefault = (): TimelineData => structuredClone(getDefaultData());

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
    const data = getSessionData();
    setSessionData(data);
    return { data, target: "session", userId: null };
  }

  try {
    const cloud = await loadCloudData(token);
    if (cloud) {
      setSessionData(cloud);
      return { data: cloud, target: "cloud", userId: "me" };
    }

    const seed = getSessionData();
    await saveCloudData(token, seed);
    setSessionData(seed);
    return { data: seed, target: "cloud", userId: "me" };
  } catch (err) {
    console.error("Cloud load failed; using session:", err);
    const data = getSessionData();
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
