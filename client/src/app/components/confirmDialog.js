"use client";

import { useEffect, useId, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = "primary",
  busy = false,
  onCancel,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="ui-dialog m-auto w-[calc(100%-2rem)] text-left backdrop:bg-black/75"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
          <h2 id={titleId} className="text-xl font-semibold text-foreground">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-panel-strong hover:text-white"
          aria-label="Close confirmation"
          title="Close"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <p id={descriptionId} className="mt-4 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={busy} className="ui-button-secondary">
          Keep editing
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={tone === "danger" ? "ui-button-danger" : "ui-button-primary"}
          autoFocus
        >
          {busy ? "Working..." : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}