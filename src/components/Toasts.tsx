import { useStore } from "../store";
import type { Toast as ToastType } from "../types";

const KIND_STYLE: Record<ToastType["kind"], { bg: string; border: string; icon: string }> = {
  info: { bg: "#eff6ff", border: "#3b82f6", icon: "ℹ" },
  success: { bg: "#f0fdf4", border: "#22c55e", icon: "✓" },
  error: { bg: "#fef2f2", border: "#ef4444", icon: "✕" },
  warning: { bg: "#fffbeb", border: "#f59e0b", icon: "⚠" },
};

export default function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="toast-wrap">
      {toasts.map((t) => {
        const s = KIND_STYLE[t.kind];
        return (
          <div
            key={t.id}
            className="toast"
            style={{ background: s.bg, borderColor: s.border }}
          >
            <span className="toast-icon" style={{ color: s.border }}>
              {s.icon}
            </span>
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={() => dismissToast(t.id)}>
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
