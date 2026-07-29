"use client";

interface ModalFooterProps {
  showDelete: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onSave: () => void;
}

export const ModalFooter = ({
  showDelete,
  onCancel,
  onDelete,
  onSave,
}: ModalFooterProps) => {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-line bg-[#fafbfc] px-4 py-3.5 sm:px-[18px] pb-[max(14px,env(safe-area-inset-bottom))] sm:pb-3.5">
      <button
        className="btn btn-danger"
        onClick={onDelete}
        style={{ visibility: showDelete ? "visible" : "hidden" }}
      >
        Delete
      </button>
      <div className="flex gap-2">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={onSave}>
          Save
        </button>
      </div>
    </div>
  );
};
