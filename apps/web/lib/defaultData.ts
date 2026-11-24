import { fromDays, iso, toDays, todayIso } from "./date";
import type { TimelineData } from "./types";

export const PALETTE = [
  "#4F46E5", "#0F9E99", "#D98324", "#8B5CF6", "#E0457B",
  "#2563EB", "#059669", "#DC2626", "#0891B2", "#CA8A04",
];

/** Offset an ISO date by `days` (negative = past). */
const offsetIso = (baseIso: string, days: number): string =>
  iso(fromDays(toDays(baseIso) + days));

/**
 * Sample timeline anchored to `today` so first-time users always see bars
 * around the TODAY marker. Offsets mirror the original Jul 2026 schedule
 * relative to ~Jul 20.
 */
export const getDefaultData = (today: string = todayIso()): TimelineData => {
  const d = (days: number) => offsetIso(today, days);

  return {
    projects: [
      {
        id: "p1",
        name: "Sample Project Alpha",
        color: "#4F46E5",
        deadline: d(0),
        tasks: [
          { id: "t1", name: "Discovery & planning", start: d(-14), end: d(-10) },
          { id: "t2", name: "Initial build", start: d(-9), end: d(0) },
        ],
      },
      {
        id: "p2",
        name: "Sample Project Beta",
        color: "#0F9E99",
        deadline: d(11),
        tasks: [
          { id: "t3", name: "Wireframes", start: d(-14), end: d(-8) },
          { id: "t4", name: "API scaffolding", start: d(-7), end: d(2) },
          { id: "t5", name: "Integration testing", start: d(3), end: d(11) },
        ],
      },
      {
        id: "p3",
        name: "Sample Project Gamma",
        color: "#D98324",
        deadline: d(5),
        tasks: [
          { id: "t6", name: "Content draft", start: d(-12), end: d(-4) },
          { id: "t7", name: "Review & polish", start: d(-3), end: d(5) },
        ],
      },
      {
        id: "p4",
        name: "Sample Project Delta",
        color: "#8B5CF6",
        deadline: d(18),
        tasks: [
          { id: "t8", name: "Prototype", start: d(-6), end: d(8) },
          { id: "t9", name: "QA pass", start: d(9), end: d(18) },
        ],
      },
    ],
  };
};

/** Snapshot for SSR / initial React state; prefer `getDefaultData()` when seeding. */
export const DEFAULT_DATA: TimelineData = getDefaultData();
