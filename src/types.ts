export type Role = "technician" | "supervisor";

export type ReedStatus = "normal" | "abnormal";

/** pending=待确认 reserved=本地预留(离线) queued=排队等出库 issued=已出库领用 */
export type RequestStatus = "pending" | "reserved" | "queued" | "issued";

export interface Venue {
  id: string;
  name: string;
  kind: string;
}

export interface Pipe {
  id: string;
  venueId: string;
  stop: string; // 音栓
  pipeNo: string; // 音管编号
  pitch: string; // 音高
  cents: number; // 音分偏差
  reedSpec: string; // 簧片规格
  reedStatus: ReedStatus;
  tuned: boolean; // 是否已定音
  note: string; // 维修备注
}

export interface PartRequest {
  id: string;
  seq: number; // 申请先后
  venueId: string;
  pipeId: string;
  spec: string;
  applicant: Role;
  status: RequestStatus;
  note: string;
  createdAt: string;
}

export interface EnvRecord {
  temp: number;
  humidity: number;
  at: string;
}

export type LogKind = "info" | "ok" | "warn" | "err";

export interface LogEntry {
  id: number;
  time: string;
  text: string;
  kind: LogKind;
}
