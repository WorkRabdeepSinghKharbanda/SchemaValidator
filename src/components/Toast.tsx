import { useEffect, useRef } from "react";

export interface ToastMessage {
  id: number;
  text: string;
  tone: "success" | "info" | "error";
  action?: { label: string; onClick: () => void };
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    // Actionable toasts (e.g. "Undo") stay up longer — 2.6s isn't enough time to read, decide,
    // and click before it's gone.
    const timer = setTimeout(() => onDismissRef.current(toast.id), toast.action ? 6000 : 2600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  return (
    <div className={`toast toast-${toast.tone}`}>
      <span>{toast.text}</span>
      {toast.action && (
        <button
          className="toast-action"
          onClick={() => {
            toast.action?.onClick();
            onDismissRef.current(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
