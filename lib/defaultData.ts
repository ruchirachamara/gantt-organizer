import type { TimelineData } from "./types";

export const PALETTE = [
  "#4F46E5", "#0F9E99", "#D98324", "#8B5CF6", "#E0457B",
  "#2563EB", "#059669", "#DC2626", "#0891B2", "#CA8A04",
];

export const DEFAULT_DATA: TimelineData = {
  projects: [
    {
      id: "p1",
      name: "Sample Project Alpha",
      color: "#4F46E5",
      deadline: "2026-07-20",
      tasks: [
        { id: "t1", name: "Discovery & planning", start: "2026-07-06", end: "2026-07-10" },
        { id: "t2", name: "Initial build", start: "2026-07-11", end: "2026-07-20" },
      ],
    },
    {
      id: "p2",
      name: "Sample Project Beta",
      color: "#0F9E99",
      deadline: "2026-07-31",
      tasks: [
        { id: "t3", name: "Wireframes", start: "2026-07-06", end: "2026-07-12" },
        { id: "t4", name: "API scaffolding", start: "2026-07-13", end: "2026-07-22" },
        { id: "t5", name: "Integration testing", start: "2026-07-23", end: "2026-07-31" },
      ],
    },
    {
      id: "p3",
      name: "Sample Project Gamma",
      color: "#D98324",
      deadline: "2026-07-25",
      tasks: [
        { id: "t6", name: "Content draft", start: "2026-07-08", end: "2026-07-16" },
        { id: "t7", name: "Review & polish", start: "2026-07-17", end: "2026-07-25" },
      ],
    },
    {
      id: "p4",
      name: "Sample Project Delta",
      color: "#8B5CF6",
      deadline: "2026-08-07",
      tasks: [
        { id: "t8", name: "Prototype", start: "2026-07-14", end: "2026-07-28" },
        { id: "t9", name: "QA pass", start: "2026-07-29", end: "2026-08-07" },
      ],
    },
  ],
};
