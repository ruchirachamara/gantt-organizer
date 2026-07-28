import type { TimelineData } from "../types";

export const compactTimeline = (data: TimelineData): TimelineData => {
  return {
    projects: data.projects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      deadline: p.deadline,
      tasks: p.tasks.map((t) => ({
        id: t.id,
        name: t.name,
        start: t.start,
        end: t.end,
      })),
    })),
  };
}

export const buildSystemPrompt = (): string => {
  return `You are a scheduling assistant for a Gantt timeline app.
Return ONLY valid JSON (no markdown):

{"summary":"what changed","projects":[{"id":"…","name":"…","color":"#RRGGBB","deadline":"YYYY-MM-DD","tasks":[{"id":"…","name":"…","start":"YYYY-MM-DD","end":"YYYY-MM-DD"}]}]}

Rules:
- Keep existing project/task "id" values unless the user asks to delete them.
- Dates: YYYY-MM-DD, start <= end.
- Keep colors unless asked to change.
- Shift deadlines with their tasks unless told otherwise.
- Return the COMPLETE "projects" array, not a diff.
- "summary": one short sentence.`;
}

export const buildUserMessage = (
  prompt: string,
  data: TimelineData,
  today: string
): string => {
  return `Today: ${today}
Timeline: ${JSON.stringify(compactTimeline(data))}
Instruction: ${prompt.trim()}`;
}
