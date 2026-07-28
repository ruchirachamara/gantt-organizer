"use client";

import { useState, type RefObject } from "react";
import type { Project, TaskValues } from "@/lib/types";
import { fromDays, iso, toDays } from "@/lib/date";
import { ModalFooter } from "./ModalFooter";

interface TaskFormProps {
  nameRef: RefObject<HTMLInputElement | null>;
  projects: Project[];
  defaultProjectId: string;
  task?: { name: string; start: string; end: string };
  today: string;
  title: string;
  isEdit: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onSave: (values: TaskValues) => void;
}

export const TaskForm = ({
  nameRef,
  projects,
  defaultProjectId,
  task,
  today,
  title,
  isEdit,
  onCancel,
  onDelete,
  onSave,
}: TaskFormProps) => {
  const [name, setName] = useState(task?.name ?? "");
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [start, setStart] = useState(task?.start ?? today);
  const [end, setEnd] = useState(task?.end ?? iso(fromDays(toDays(today) + 6)));

  return (
    <div className="modal-shell">
      <h3 className="modal-title">{title}</h3>
      <div className="modal-body">
        <div>
          <label className="modal-label">Task name</label>
          <input
            ref={nameRef}
            className="field-input"
            value={name}
            placeholder="e.g. Write migration scripts"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="modal-label">Project</label>
          <select
            className="field-input"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-[11px]">
          <div className="flex-1">
            <label className="modal-label">Start</label>
            <input
              type="date"
              className="field-input font-mono text-[12.5px]"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="modal-label">End</label>
            <input
              type="date"
              className="field-input font-mono text-[12.5px]"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
      </div>
      <ModalFooter
        showDelete={isEdit}
        onCancel={onCancel}
        onDelete={onDelete}
        onSave={() => {
          const safeEnd = toDays(end) < toDays(start) ? start : end;
          onSave({
            name: name.trim() || "Untitled task",
            start,
            end: safeEnd,
            projectId,
          });
        }}
      />
    </div>
  );
};
