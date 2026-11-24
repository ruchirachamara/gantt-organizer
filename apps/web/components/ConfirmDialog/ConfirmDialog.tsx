"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-[#0c0f1655] p-0 sm:items-center sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-shell" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h3 id="confirm-title" className="modal-title">
          {title}
        </h3>
        <div className="modal-body">
          <p className="m-0 text-[13.5px] leading-relaxed text-[#3b424d]">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line bg-[#fafbfc] px-4 py-3.5 sm:px-[18px] pb-[max(14px,env(safe-area-inset-bottom))] sm:pb-3.5">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
