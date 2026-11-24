"use client";

import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import type { Project, TaskValues } from "@/lib/types";
import { fromDays, iso, toDays } from "@/lib/date";
import { ConfirmDialog } from "../../ConfirmDialog/ConfirmDialog";
import { ModalFooter } from "./ModalFooter";

interface TaskFormProps {
  nameRef: RefObject<HTMLInputElement | null>;
  projects: Project[];
  defaultProjectId: string;
  task?: { name: string; description?: string; start: string; end: string };
  today: string;
  title: string;
  isEdit: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onSave: (values: TaskValues) => void;
  onRegisterRequestClose?: (requestClose: () => void) => void;
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
  onRegisterRequestClose,
}: TaskFormProps) => {
  const initial = useMemo(
    () => ({
      name: task?.name ?? "",
      description: task?.description ?? "",
      projectId: defaultProjectId,
      start: task?.start ?? today,
      end: task?.end ?? iso(fromDays(toDays(today) + 6)),
    }),
    [task, defaultProjectId, today]
  );

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [projectId, setProjectId] = useState(initial.projectId);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isDirty =
    name !== initial.name ||
    description !== initial.description ||
    projectId !== initial.projectId ||
    start !== initial.start ||
    end !== initial.end;

  const requestClose = useCallback(() => {
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onCancel();
  }, [isDirty, onCancel]);

  useEffect(() => {
    onRegisterRequestClose?.(requestClose);
    return () => onRegisterRequestClose?.(() => onCancel());
  }, [onRegisterRequestClose, requestClose, onCancel]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (confirmDiscard) {
        setConfirmDiscard(false);
        return;
      }
      requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmDiscard, requestClose]);

  return (
    <>
      <div className="drawer-shell" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-header">
          <h3 className="drawer-title">{title}</h3>
          <button
            type="button"
            className="btn btn-ghost drawer-close"
            onClick={requestClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="drawer-body">
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
          <div className="flex flex-1 flex-col min-h-0">
            <label className="modal-label">Description</label>
            <textarea
              className="field-input drawer-description"
              value={description}
              placeholder="Add notes, acceptance criteria, or context…"
              rows={8}
              onChange={(e) => setDescription(e.target.value)}
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
          onCancel={requestClose}
          onDelete={onDelete}
          onSave={() => {
            const safeEnd = toDays(end) < toDays(start) ? start : end;
            onSave({
              name: name.trim() || "Untitled task",
              description: description.trim(),
              start,
              end: safeEnd,
              projectId,
            });
          }}
        />
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard changes?"
        message="You have unsaved changes in this task. Close the drawer and lose them?"
        confirmLabel="Discard"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={onCancel}
      />
    </>
  );
};
