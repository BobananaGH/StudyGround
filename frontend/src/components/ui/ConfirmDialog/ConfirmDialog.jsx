// frontend/src/components/ui/ConfirmDialog/ConfirmDialog.jsx

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Button from "../Button/Button.jsx";
import styles from "./ConfirmDialog.module.css";

export function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  icon = "fa-trash",
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && !loading) {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, loading, onCancel]);

  if (!open) {
    return null;
  }

  function handleBackdropMouseDown(event) {
    if (event.target === event.currentTarget && !loading) {
      onCancel();
    }
  }

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={
          description ? "confirm-dialog-description" : undefined
        }
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* =========================
            CLOSE BUTTON
            ========================= */}

        <button
          type="button"
          className={styles.closeButton}
          onClick={onCancel}
          disabled={loading}
          aria-label="Close dialog"
          title="Close"
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>

        {/* =========================
            ICON
            ========================= */}

        <div className={styles.icon} aria-hidden="true">
          <i className={`fa-solid ${icon}`} />
        </div>

        {/* =========================
            CONTENT
            ========================= */}

        <div className={styles.content}>
          <h2 id="confirm-dialog-title">{title}</h2>

          {description && <p id="confirm-dialog-description">{description}</p>}
        </div>

        {/* =========================
            ACTIONS
            ========================= */}

        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant="danger"
            size="md"
            fullWidth
            onClick={onConfirm}
            loading={loading}
            disabled={loading}
          >
            {!loading && (
              <i className={`fa-solid ${icon}`} aria-hidden="true" />
            )}

            <span>{confirmLabel}</span>
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmDialog;
