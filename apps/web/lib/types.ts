export interface Task {
  id: string;
  name: string;
  description?: string;
  start: string;
  end: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  deadline: string;
  tasks: Task[];
}

export interface TimelineData {
  projects: Project[];
}

export const isValidTimeline = (data: unknown): data is TimelineData => {
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as TimelineData).projects)
  );
};

export type ModalContext =
  | { kind: "project"; pid: string | null }
  | { kind: "task"; pid: string; tid: string | null }
  | null;

export interface ProjectValues {
  name: string;
  deadline: string;
  color: string;
}

export interface TaskValues {
  name: string;
  description: string;
  start: string;
  end: string;
  projectId: string;
}
