import type { PipeStatus, AppStatus, Role } from "./types";

export const PIPE_STATUS_LABEL: Record<PipeStatus, string> = {
  normal: "正常",
  abnormal: "簧片异常",
  waiting_parts: "待料",
  completed: "已完成",
};

export const APP_STATUS_LABEL: Record<AppStatus, string> = {
  pending_approval: "待审批",
  rejected: "已驳回",
  approved: "已批准待出库",
  queued: "排队等出库",
  reserved_local: "本地预留",
  outbound_failed: "出库失败",
  taken: "已领走",
  pending_confirmation: "待确认",
};

export const APP_STATUS_COLOR: Record<AppStatus, string> = {
  pending_approval: "#a16207",
  rejected: "#b91c1c",
  approved: "#0369a1",
  queued: "#9a3412",
  reserved_local: "#6d28d9",
  outbound_failed: "#b91c1c",
  taken: "#15803d",
  pending_confirmation: "#b45309",
};

export const PIPE_STATUS_COLOR: Record<PipeStatus, string> = {
  normal: "#15803d",
  abnormal: "#b91c1c",
  waiting_parts: "#9a3412",
  completed: "#15803d",
};

export function roleLabel(role: Role): string {
  return role === "supervisor" ? "琴房主管" : "技师";
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 音分偏差是否超限（±10 cent）
export function deviationOverLimit(cents: number): boolean {
  return Math.abs(cents) > 10;
}
