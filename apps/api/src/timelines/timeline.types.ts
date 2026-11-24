export type Task = {
  id: string;
  name: string;
  description?: string;
  start: string;
  end: string;
};

export type Project = {
  id: string;
  name: string;
  color: string;
  deadline: string;
  tasks: Task[];
};

export type TimelineData = {
  projects: Project[];
};

export type TimelineDocument = {
  id: string;
  userId: string;
  data: TimelineData;
  updatedAt: string;
};
