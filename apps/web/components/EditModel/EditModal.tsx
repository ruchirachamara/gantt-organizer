"use client";

import { useCallback, useRef } from "react";
import type {
  ModalContext,
  Project,
  ProjectValues,
  TaskValues,
} from "@/lib/types";
import { ModalForm } from "./components/ModalForm";

interface EditModalProps {
  ctx: ModalContext;
  projects: Project[];
  today: string;
  onCancel: () => void;
  onSaveProject: (pid: string | null, values: ProjectValues) => void;
  onSaveTask: (pid: string, tid: string | null, values: TaskValues) => void;
  onDelete: () => void;
}

export const EditModal = ({
  ctx,
  projects,
  today,
  onCancel,
  onSaveProject,
  onSaveTask,
  onDelete,
}: EditModalProps) => {
  const requestCloseRef = useRef(onCancel);

  const registerRequestClose = useCallback((requestClose: () => void) => {
    requestCloseRef.current = requestClose;
  }, []);

  if (!ctx) return null;

  const isTask = ctx.kind === "task";

  return (
    <div
      className={
        isTask
          ? "fixed inset-0 z-[100] flex justify-end bg-[#0c0f1655]"
          : "fixed inset-0 z-[100] flex items-end justify-center bg-[#0c0f1655] p-0 sm:items-center sm:p-5"
      }
      onClick={(e) => {
        if (e.target === e.currentTarget) requestCloseRef.current();
      }}
    >
      <ModalForm
        key={`${ctx.kind}:${"pid" in ctx ? ctx.pid : ""}:${ctx.kind === "task" ? ctx.tid : ""}`}
        ctx={ctx}
        projects={projects}
        today={today}
        onCancel={onCancel}
        onSaveProject={onSaveProject}
        onSaveTask={onSaveTask}
        onDelete={onDelete}
        onRegisterRequestClose={isTask ? registerRequestClose : undefined}
      />
    </div>
  );
};

export default EditModal;
