// 管风琴音管调音记录 + 簧片备件台账 领域模型

export type Role = "supervisor" | "technician";

export type ReedStatus = "normal" | "abnormal";

// 音管状态：正常 / 簧片异常 / 待料 / 已完成
export type PipeStatus = "normal" | "abnormal" | "waiting_parts" | "completed";

// 备件申请单状态
export type AppStatus =
  | "pending_approval" // 待审批
  | "rejected" // 已驳回（含越权领用被拦下）
  | "approved" // 已批准，待出库
  | "queued" // 排队等出库（容量不够）
  | "reserved_local" // 现场本地预留（离线先占住）
  | "outbound_failed" // 出库失败
  | "taken" // 已领走
  | "pending_confirmation"; // 待确认（回网对账不符退回）

export interface Pipe {
  id: string;
  venue: string; // 场馆名称
  stop: string; // 音栓
  pipeNo: string; // 音管编号
  pitch: string; // 音高
  centDeviation: number; // 音分偏差
  temperature: number; // 温度
  humidity: number; // 湿度
  reedStatus: ReedStatus; // 簧片状态
  notes: string; // 维修备注
  status: PipeStatus;
}

export interface SpareReed {
  id: string;
  venue: string; // 各场馆备件分开记账
  spec: string; // 规格（音栓 + 音高）
  quantity: number; // 当前库存
  capacity: number; // 容量
}

export interface SpareApplication {
  id: string;
  pipeId: string;
  venue: string;
  spec: string; // 同规格备用簧片
  applicant: string; // 申请人
  applicantRole: Role;
  status: AppStatus;
  queueOrder: number; // 申请先后（F）
  reason?: string; // 驳回 / 待确认原因
  createdAt: number;
}

export interface MaintenanceReport {
  id: string;
  venue: string;
  date: string;
  technician: string;
  pipeIds: string[];
  partsUsed: string[]; // 已领走的申请单 id
  summary: string;
  completed: boolean;
  createdAt: number;
}

export interface Toast {
  id: number;
  kind: "info" | "success" | "error" | "warning";
  message: string;
}
