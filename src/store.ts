import type {
  EnvRecord,
  LogEntry,
  LogKind,
  PartRequest,
  Pipe,
  RequestStatus,
  Role,
} from "./types";
import { REPORT_NO, seedCapacity, seedEnv, seedPipes, seedStock, venues } from "./seed";

export interface State {
  role: Role;
  online: boolean; // 现场是否联网
  warehouseOk: boolean; // 库房系统是否正常（出库失败模拟）
  venueId: string;
  pipes: Pipe[];
  stock: Record<string, Record<string, number>>;
  capacity: Record<string, Record<string, number>>;
  requests: PartRequest[];
  env: Record<string, EnvRecord>;
  seq: number;
  logSeq: number;
  log: LogEntry[];
  reportNo: string;
}

export const ROLE_LABEL: Record<Role, string> = {
  technician: "技师",
  supervisor: "琴房主管",
};

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "待确认",
  reserved: "本地预留",
  queued: "排队等出库",
  issued: "已出库",
};

export function venueName(id: string): string {
  return venues.find((v) => v.id === id)?.name ?? id;
}

function timeStr(): string {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

export const initialState: State = {
  role: "technician",
  online: true,
  warehouseOk: true,
  venueId: venues[0].id,
  pipes: seedPipes,
  stock: seedStock,
  capacity: seedCapacity,
  requests: [],
  env: seedEnv,
  seq: 0,
  logSeq: 1,
  log: [
    {
      id: 1,
      time: timeStr(),
      text: "音管台账、簧片备件库与单次维护报告已关联；库房归琴房主管保管，各场馆分开记账。",
      kind: "info",
    },
  ],
  reportNo: REPORT_NO,
};

export type Action =
  | { type: "SET_ROLE"; role: Role }
  | { type: "SET_VENUE"; venueId: string }
  | { type: "TOGGLE_ONLINE" }
  | { type: "TOGGLE_WAREHOUSE" }
  | { type: "APPLY"; pipeId: string }
  | { type: "ISSUE"; requestId: string }
  | { type: "RESTOCK"; venueId: string; spec: string }
  | { type: "TUNE"; pipeId: string }
  | { type: "TOGGLE_REED"; pipeId: string }
  | { type: "SET_ENV"; venueId: string; temp: number; humidity: number };

function addLog(state: State, text: string, kind: LogKind = "info"): State {
  const entry: LogEntry = { id: state.logSeq + 1, time: timeStr(), text, kind };
  return { ...state, logSeq: entry.id, log: [entry, ...state.log].slice(0, 40) };
}

function cloneStock(stock: State["stock"]): State["stock"] {
  return Object.fromEntries(Object.entries(stock).map(([v, s]) => [v, { ...s }]));
}

/** 容量不够 / 出库失败恢复后：按申请先后（seq 升序）接着办，已领走的记录照旧 */
function processQueue(state: State): State {
  if (!state.online || !state.warehouseOk) return state;
  const stock = cloneStock(state.stock);
  const done: PartRequest[] = [];
  const requests = state.requests.map((r) => {
    if (r.status !== "queued") return r;
    const avail = stock[r.venueId]?.[r.spec] ?? 0;
    if (avail <= 0) return r;
    stock[r.venueId][r.spec] = avail - 1;
    const next = { ...r, status: "issued" as const, note: "排队轮到，出库成功" };
    done.push(next);
    return next;
  });
  if (done.length === 0) return state;
  let s: State = { ...state, stock, requests };
  for (const r of done.sort((a, b) => a.seq - b.seq)) {
    s = addLog(s, `申请 #${r.seq}（${venueName(r.venueId)} · ${r.spec}）排队出库成功`, "ok");
  }
  return s;
}

/** 回网对账：本地预留逐条与库房账面核对，对不上的退回待确认 */
function reconcile(state: State): State {
  if (!state.warehouseOk) {
    return addLog(state, "已回网，但库房系统故障，本地预留暂缓对账", "warn");
  }
  const reserved = state.requests
    .filter((r) => r.status === "reserved")
    .sort((a, b) => a.seq - b.seq);
  if (reserved.length === 0) return addLog(state, "已回网，无本地预留需要对账", "info");
  const stock = cloneStock(state.stock);
  const byId = new Map<string, PartRequest>();
  const logs: Array<[string, LogKind]> = [];
  for (const r of reserved) {
    const avail = stock[r.venueId]?.[r.spec] ?? 0;
    if (avail > 0) {
      stock[r.venueId][r.spec] = avail - 1;
      byId.set(r.id, { ...r, status: "issued", note: "回网对账通过，转正式领用" });
      logs.push([`申请 #${r.seq}（${r.spec}）对账通过，转正式领用`, "ok"]);
    } else {
      byId.set(r.id, { ...r, status: "pending", note: "对账不符：库房账面不足，退回待确认" });
      logs.push([`申请 #${r.seq}（${r.spec}）与库房对不上账，退回待确认`, "err"]);
    }
  }
  let s: State = { ...state, stock, requests: state.requests.map((r) => byId.get(r.id) ?? r) };
  for (const [text, kind] of logs) s = addLog(s, text, kind);
  return s;
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ROLE":
      return addLog(
        { ...state, role: action.role },
        `当前身份切换为「${ROLE_LABEL[action.role]}」`,
        "info"
      );

    case "SET_VENUE":
      return { ...state, venueId: action.venueId };

    case "TOGGLE_ONLINE": {
      if (state.online) {
        return addLog(
          { ...state, online: false },
          "已切换为现场离线模式：申请按本地预留先占住备件",
          "warn"
        );
      }
      let s: State = addLog({ ...state, online: true }, "网络恢复，开始与库房对账", "info");
      s = reconcile(s);
      return processQueue(s);
    }

    case "TOGGLE_WAREHOUSE": {
      if (state.warehouseOk) {
        return addLog(
          { ...state, warehouseOk: false },
          "库房系统故障：出库暂停，新申请将排队等待",
          "err"
        );
      }
      const s = addLog(
        { ...state, warehouseOk: true },
        "库房系统恢复：按申请先后接着办，已领走的记录照旧",
        "ok"
      );
      return processQueue(s);
    }

    case "APPLY": {
      const pipe = state.pipes.find((p) => p.id === action.pipeId);
      if (!pipe) return state;
      if (pipe.reedStatus !== "abnormal") {
        return addLog(state, `${pipe.pipeNo} 簧片正常，无需申请备用簧片`, "warn");
      }
      const open = state.requests.find((r) => r.pipeId === pipe.id && r.status !== "issued");
      if (open) {
        return addLog(
          state,
          `${pipe.pipeNo} 已有在途申请 #${open.seq}（${STATUS_LABEL[open.status]}），请勿重复提交`,
          "warn"
        );
      }
      const seq = state.seq + 1;
      const req: PartRequest = {
        id: `req-${seq}`,
        seq,
        venueId: pipe.venueId,
        pipeId: pipe.id,
        spec: pipe.reedSpec,
        applicant: state.role,
        status: state.online ? "pending" : "reserved",
        note: state.online ? "已提交，待主管审核出库" : "离线本地预留，回网后与库房对账",
        createdAt: timeStr(),
      };
      const s: State = { ...state, seq, requests: [...state.requests, req] };
      return addLog(
        s,
        state.online
          ? `申请 #${seq} 已提交：${pipe.pipeNo} 需同规格「${pipe.reedSpec}」（记入${venueName(pipe.venueId)}账面）`
          : `申请 #${seq} 本地预留：${pipe.pipeNo} 先占住「${pipe.reedSpec}」，回网后对账`,
        state.online ? "info" : "warn"
      );
    }

    case "ISSUE": {
      const req = state.requests.find((r) => r.id === action.requestId);
      if (!req) return state;
      if (req.status === "issued") {
        return addLog(state, `申请 #${req.seq} 已领用，记录照旧`, "info");
      }
      // 库房归琴房主管保管：技师越权领用会被拦下
      if (state.role !== "supervisor") {
        return addLog(
          state,
          `越权拦截：技师无权从库房领用（申请 #${req.seq}），库房归琴房主管保管`,
          "err"
        );
      }
      if (!state.online) {
        return addLog(state, "离线状态无法办理出库，请先回网对账", "warn");
      }
      if (!state.warehouseOk) {
        const requests = state.requests.map((r) =>
          r.id === req.id ? { ...r, status: "queued" as const, note: "出库失败，排队等待库房恢复" } : r
        );
        return addLog(
          { ...state, requests },
          `出库失败：申请 #${req.seq} 转入排队，恢复后按申请先后接着办`,
          "err"
        );
      }
      const avail = state.stock[req.venueId]?.[req.spec] ?? 0;
      if (avail <= 0) {
        const requests = state.requests.map((r) =>
          r.id === req.id ? { ...r, status: "queued" as const, note: "容量不够，排队等出库" } : r
        );
        return addLog(
          { ...state, requests },
          `容量不够：${venueName(req.venueId)}「${req.spec}」在库 0，申请 #${req.seq} 排队等出库`,
          "warn"
        );
      }
      const stock = cloneStock(state.stock);
      stock[req.venueId][req.spec] = avail - 1;
      const requests = state.requests.map((r) =>
        r.id === req.id ? { ...r, status: "issued" as const, note: "已出库领用" } : r
      );
      return addLog(
        { ...state, stock, requests },
        `申请 #${req.seq} 出库成功：${venueName(req.venueId)}「${req.spec}」剩余 ${avail - 1}`,
        "ok"
      );
    }

    case "RESTOCK": {
      if (state.role !== "supervisor") {
        return addLog(state, "越权拦截：仅琴房主管可办理备件入库", "err");
      }
      if (!state.online) {
        return addLog(state, "离线状态无法登记入库，请回网后操作", "warn");
      }
      const cap = state.capacity[action.venueId]?.[action.spec] ?? 0;
      const cur = state.stock[action.venueId]?.[action.spec] ?? 0;
      if (cur >= cap) {
        return addLog(
          state,
          `${venueName(action.venueId)}「${action.spec}」已达容量上限 ${cap}，无法入库`,
          "warn"
        );
      }
      const stock = cloneStock(state.stock);
      stock[action.venueId][action.spec] = cur + 1;
      let s = addLog(
        { ...state, stock },
        `入库 +1：${venueName(action.venueId)}「${action.spec}」在库 ${cur + 1}/${cap}`,
        "ok"
      );
      return processQueue(s);
    }

    case "TUNE": {
      const pipe = state.pipes.find((p) => p.id === action.pipeId);
      if (!pipe) return state;
      if (pipe.reedStatus === "abnormal") {
        const issuedReq = state.requests.find(
          (r) => r.pipeId === pipe.id && r.status === "issued"
        );
        if (!issuedReq) {
          const open = state.requests.find((r) => r.pipeId === pipe.id && r.status !== "issued");
          const hint = open
            ? `申请 #${open.seq} 仍「${STATUS_LABEL[open.status]}」`
            : "尚未申请备用簧片";
          return addLog(
            state,
            `定音被拦下：${pipe.pipeNo} 簧片异常（${hint}），须先申请同规格备用簧片并出库`,
            "err"
          );
        }
        const pipes = state.pipes.map((p) =>
          p.id === pipe.id
            ? {
                ...p,
                reedStatus: "normal" as const,
                tuned: true,
                cents: Math.sign(p.cents),
                note: `已更换备用簧片（申请 #${issuedReq.seq}）并完成定音`,
              }
            : p
        );
        return addLog(
          { ...state, pipes },
          `${pipe.pipeNo} 已更换同规格「${pipe.reedSpec}」备用簧片，定音完成`,
          "ok"
        );
      }
      const fixed = Math.abs(pipe.cents) <= 1 ? pipe.cents : Math.sign(pipe.cents);
      const pipes = state.pipes.map((p) =>
        p.id === pipe.id ? { ...p, tuned: true, cents: fixed } : p
      );
      return addLog(
        { ...state, pipes },
        `${pipe.pipeNo} 定音完成：偏差 ${pipe.cents > 0 ? "+" : ""}${pipe.cents} → ${fixed > 0 ? "+" : ""}${fixed} 音分`,
        "ok"
      );
    }

    case "TOGGLE_REED": {
      const pipe = state.pipes.find((p) => p.id === action.pipeId);
      if (!pipe) return state;
      const toAbnormal = pipe.reedStatus === "normal";
      const pipes = state.pipes.map((p) =>
        p.id === pipe.id
          ? {
              ...p,
              reedStatus: toAbnormal ? ("abnormal" as const) : ("normal" as const),
              tuned: toAbnormal ? false : p.tuned,
              note: toAbnormal ? "标记簧片异常，待申请备片" : "复检通过，簧片恢复正常",
            }
          : p
      );
      return addLog(
        { ...state, pipes },
        toAbnormal
          ? `异常标记：${pipe.pipeNo} 簧片异常，定音资格已冻结`
          : `${pipe.pipeNo} 复检通过，簧片恢复正常`,
        toAbnormal ? "warn" : "info"
      );
    }

    case "SET_ENV": {
      const env = {
        ...state.env,
        [action.venueId]: { temp: action.temp, humidity: action.humidity, at: timeStr() },
      };
      return addLog(
        { ...state, env },
        `${venueName(action.venueId)} 温湿度已记录：${action.temp.toFixed(1)}℃ / ${action.humidity}%`,
        "info"
      );
    }

    default:
      return state;
  }
}

/** 该音管是否在等料（簧片异常且备用簧片未出库）——待料管子不算完成 */
export function isWaitingForPart(pipe: Pipe, requests: PartRequest[]): boolean {
  if (pipe.reedStatus !== "abnormal") return false;
  return !requests.some((r) => r.pipeId === pipe.id && r.status === "issued");
}

export function requestForPipe(
  pipeId: string,
  requests: PartRequest[]
): PartRequest | undefined {
  const list = requests.filter((r) => r.pipeId === pipeId);
  return list.find((r) => r.status !== "issued") ?? list[list.length - 1];
}
