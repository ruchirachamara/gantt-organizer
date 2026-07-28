"use client";

import { useState, type RefObject } from "react";
import type { Project, ProjectValues } from "@/lib/types";
import { PALETTE } from "@/lib/defaultData";
import { ModalFooter } from "./ModalFooter";

interface ProjectFormProps {
  nameRef: RefObject<HTMLInputElement | null>;
  project?: Project;
  existingCount: number;
  isEdit: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onSave: (values: ProjectValues) => void;
}

export const ProjectForm = ({
  nameRef,
  project,
  existingCount,
  isEdit,
  onCancel,
  onDelete,
  onSave,
}: ProjectFormProps) => {
  const [name, setName] = useState(project?.name ?? "");
  const [deadline, setDeadline] = useState(project?.deadline ?? "");
  const [color, setColor] = useState(
    project?.color ?? PALETTE[existingCount % PALETTE.length]
  );

  return (
    <div className="modal-shell">
      <h3 className="modal-title">{isEdit ? "Edit project" : "New project"}</h3>
      <div className="modal-body">
        <div>
          <label className="modal-label">Project name</label>
          <input
            ref={nameRef}
            className="field-input"
            value={name}
            placeholder="e.g. New side project"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="modal-label">Deadline</label>
          <input
            title="Project deadline"
            type="date"
            className="field-input font-mono text-[12.5px]"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div>
          <label className="modal-label">Colour</label>
          <div className="flex flex-wrap gap-[7px]">
            {PALETTE.map((c) => (
              <div
                key={c}
                className={`h-6 w-6 cursor-pointer rounded-md border-2 ${
                  c === color
                    ? "border-ink shadow-[0_0_0_2px_#fff_inset]"
                    : "border-transparent"
                }`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
      </div>
      <ModalFooter
        showDelete={isEdit}
        onCancel={onCancel}
        onDelete={onDelete}
        onSave={() =>
          onSave({ name: name.trim() || "Untitled project", deadline, color })
        }
      />
    </div>
  );
};
