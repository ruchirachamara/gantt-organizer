"use client";

import { useEffect, useRef } from "react";
import type { Project } from "@/lib/types";
import { ProjectForm } from "../components/ProjectForm";
import { TaskForm } from "../components/TaskForm";
import type { ModalContext, ProjectValues, TaskValues } from "@/lib/types";

interface ModalFormProps {
  ctx: NonNullable<ModalContext>;
  projects: Project[];
  today: string;
  onCancel: () => void;
  onSaveProject: (pid: string | null, values: ProjectValues) => void;
  onSaveTask: (pid: string, tid: string | null, values: TaskValues) => void;
  onDelete: () => void;
}

export const ModalForm = ({
  ctx,
  projects,
  today,
  onCancel,
  onSaveProject,
  onSaveTask,
  onDelete,
}: ModalFormProps) => {
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  if (ctx.kind === "project") {
    return (
      <ProjectForm
        nameRef={nameRef}
        project={ctx.pid ? projects.find((p) => p.id === ctx.pid) : undefined}
        existingCount={projects.length}
        isEdit={ctx.pid !== null}
        onCancel={onCancel}
        onDelete={onDelete}
        onSave={(values) => onSaveProject(ctx.pid, values)}
      />
    );
  }

  const project = projects.find((p) => p.id === ctx.pid)!;
  const task = ctx.tid ? project.tasks.find((t) => t.id === ctx.tid) : undefined;
  return (
    <TaskForm
      nameRef={nameRef}
      projects={projects}
      defaultProjectId={ctx.pid}
      task={task}
      today={today}
      title={ctx.tid ? "Edit task" : `New task · ${project.name}`}
      isEdit={ctx.tid !== null}
      onCancel={onCancel}
      onDelete={onDelete}
      onSave={(values) => onSaveTask(ctx.pid, ctx.tid, values)}
    />
  );
};
