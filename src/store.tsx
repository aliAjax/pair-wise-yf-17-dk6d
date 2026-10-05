import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Pipe,
  SpareReed,
  SpareApplication,
  MaintenanceReport,
  Role,
  Toast,
} from "./types";
import {
  seedPipes,
  seedSpares,
  seedApplications,
  seedReports,
  SUPERVISOR_NAME,
} from "./seed";

const STORAGE_KEY = "organ-maintenance-v1";

interface PersistShape {
  pipes: Pipe[];
  spares: SpareReed[];
  applications: SpareApplication[];
  reports: MaintenanceReport[];
}

function loadState(): PersistShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistShape;
      if (parsed.pipes && parsed.spares && parsed.applications && parsed.reports) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return {
    pipes: seedPipes,
    spares: seedSpares,
    applications: seedApplications,
    reports: seedReports,
  };
}

interface State extends PersistShape {
  role: Role;
  online: boolean;
  degraded: boolean; // 库房系统故障（出库失败场景）
}

type Action =
  | { type: "SET_ROLE"; role: Role }
  | { type: "SET_ONLINE"; online: boolean }
  | { type: "SET_DEGRADED"; degraded: boolean }
  | { type: "APPLY_SPARE"; pipeId: string; applicant: string }
  | { type: "DIRECT_TAKE"; pipeId: string; applicant: string }
  | { type: "APPROVE"; appId: string }
  | { type: "REJECT"; appId: string }
  | { type: "OUTBOUND"; appId: string }
  | { type: "RECONCILE"; appId: string }
  | { type: "RECONCILE_ALL" }
  | { type: "RETRY_PENDING"; appId: string }
  | { type: "PROCESS_QUEUE" }
  | { type: "RESTOCK"; venue: string; spec: string; qty: number }
  | { type: "TUNE_PIPE"; pipeId: string }
  | { type: "CREATE_REPORT"; venue: string; date: string; technician: string }
  | { type: "ADD_PIPE"; pipe: Omit<Pipe, "id" | "status"> }
  | { type: "RESET" };

let toastId = 0;

interface StoreContextValue extends State {
  dispatch: React.Dispatch<Action>;
  toasts: Toast[];
  pushToast: (kind: Toast["kind"], message: string) => void;
  dismissToast: (id: number) => void;
  setRole: (role: Role) => void;
  setOnline: (online: boolean) => void;
  setDegraded: (degraded: boolean) => void;
  addPipe: (pipe: Omit<Pipe, "id" | "status">) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function specOf(pipe: Pipe): string {
  return `${pipe.stop} ${pipe.pitch}`;
}

function findSpare(spares: SpareReed[], venue: string, spec: string) {
  return spares.find((s) => s.venue === venue && s.spec === spec);
}

function nextAppId(apps: SpareApplication[]) {
  return "a" + String(apps.length + 1).padStart(3, "0") + "-" + Date.now().toString(36);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ROLE":
      return { ...state, role: action.role };
    case "SET_ONLINE":
      return { ...state, online: action.online };
    case "SET_DEGRADED":
      return { ...state, degraded: action.degraded };

    case "APPLY_SPARE": {
      const pipe = state.pipes.find((p) => p.id === action.pipeId);
      if (!pipe) return state;
      if (pipe.reedStatus !== "abnormal") return state;
      // 同规格申请：已有进行中的申请则不重复
      const active = state.applications.find(
        (a) => a.pipeId === pipe.id && !["rejected", "taken"].includes(a.status)
      );
      if (active) return state;
      const order = state.applications.length
        ? Math.max(...state.applications.map((a) => a.queueOrder)) + 1
        : 1;
      const app: SpareApplication = {
        id: nextAppId(state.applications),
        pipeId: pipe.id,
        venue: pipe.venue,
        spec: specOf(pipe),
        applicant: action.applicant,
        applicantRole: state.role,
        status: "pending_approval",
        queueOrder: order,
        createdAt: Date.now(),
      };
      return {
        ...state,
        applications: [...state.applications, app],
        pipes: state.pipes.map((p) =>
          p.id === pipe.id ? { ...p, status: "waiting_parts" } : p
        ),
      };
    }

    case "DIRECT_TAKE": {
      // 越权领用：技师绕过审批直接领用，一律拦下并登记驳回
      const pipe = state.pipes.find((p) => p.id === action.pipeId);
      if (!pipe) return state;
      const app: SpareApplication = {
        id: nextAppId(state.applications),
        pipeId: pipe.id,
        venue: pipe.venue,
        spec: specOf(pipe),
        applicant: action.applicant,
        applicantRole: state.role,
        status: "rejected",
        reason:
          state.role === "technician"
            ? "越权领用被拦下：领用备用簧片须提交申请，由琴房主管审批后出库"
            : "违规领用被拦下：请走正规申请审批流程",
        queueOrder: state.applications.length + 1,
        createdAt: Date.now(),
      };
      return { ...state, applications: [...state.applications, app] };
    }

    case "APPROVE": {
      if (state.role !== "supervisor") return state;
      return {
        ...state,
        applications: state.applications.map((a) =>
          a.id === action.appId && a.status === "pending_approval"
            ? { ...a, status: "approved" }
            : a
        ),
      };
    }

    case "REJECT": {
      if (state.role !== "supervisor") return state;
      return {
        ...state,
        applications: state.applications.map((a) =>
          a.id === action.appId && a.status === "pending_approval"
            ? { ...a, status: "rejected", reason: "主管驳回" }
            : a
        ),
        // 驳回后音管回到簧片异常状态
        pipes: state.pipes.map((p) => {
          const app = state.applications.find((x) => x.id === action.appId);
          return app && p.id === app.pipeId ? { ...p, status: "abnormal" } : p;
        }),
      };
    }

    case "OUTBOUND": {
      if (state.role !== "supervisor") return state;
      const app = state.applications.find((a) => a.id === action.appId);
      if (!app || app.status !== "approved") return state;

      // 库房系统故障 → 出库失败
      if (state.degraded) {
        return {
          ...state,
          applications: state.applications.map((a) =>
            a.id === action.appId ? { ...a, status: "outbound_failed" } : a
          ),
        };
      }

      // 现场离线：本地预留先占住（不查库存），回网后再与库房对账
      if (!state.online) {
        return {
          ...state,
          applications: state.applications.map((a) =>
            a.id === action.appId ? { ...a, status: "reserved_local" } : a
          ),
        };
      }

      const spare = findSpare(state.spares, app.venue, app.spec);
      const hasStock = !!spare && spare.quantity > 0;

      if (!hasStock) {
        // 容量不够 → 排队等出库
        return {
          ...state,
          applications: state.applications.map((a) =>
            a.id === action.appId ? { ...a, status: "queued" } : a
          ),
        };
      }

      // 在线正常出库 → 领走
      return {
        ...state,
        spares: state.spares.map((s) =>
          s.id === spare.id ? { ...s, quantity: s.quantity - 1 } : s
        ),
        applications: state.applications.map((a) =>
          a.id === action.appId ? { ...a, status: "taken" } : a
        ),
      };
    }

    case "RECONCILE": {
      if (state.role !== "supervisor") return state;
      if (!state.online) return state; // 离线无法对账
      const app = state.applications.find((a) => a.id === action.appId);
      if (!app || app.status !== "reserved_local") return state;
      const spare = findSpare(state.spares, app.venue, app.spec);
      if (spare && spare.quantity > 0) {
        // 对账相符 → 确认领走，扣库房账
        return {
          ...state,
          spares: state.spares.map((s) =>
            s.id === spare.id ? { ...s, quantity: s.quantity - 1 } : s
          ),
          applications: state.applications.map((a) =>
            a.id === action.appId
              ? { ...a, status: "taken", reason: undefined }
              : a
          ),
        };
      }
      // 对不上 → 退回待确认
      return {
        ...state,
        applications: state.applications.map((a) =>
          a.id === action.appId
            ? {
                ...a,
                status: "pending_confirmation",
                reason: "回网对账不符：库房无对应规格备件（本地预留无法确认）",
              }
            : a
        ),
      };
    }

    case "RECONCILE_ALL": {
      if (state.role !== "supervisor" || !state.online) return state;
      let spares = [...state.spares];
      const apps = state.applications.map((a) => {
        if (a.status !== "reserved_local") return a;
        const spare = spares.find((s) => s.venue === a.venue && s.spec === a.spec);
        if (spare && spare.quantity > 0) {
          spares = spares.map((s) =>
            s.id === spare.id ? { ...s, quantity: s.quantity - 1 } : s
          );
          return { ...a, status: "taken" as const, reason: undefined };
        }
        return {
          ...a,
          status: "pending_confirmation" as const,
          reason: "回网对账不符：库房无对应规格备件（本地预留无法确认）",
        };
      });
      return { ...state, spares, applications: apps };
    }

    case "RETRY_PENDING": {
      if (state.role !== "supervisor") return state;
      const app = state.applications.find((a) => a.id === action.appId);
      if (!app || app.status !== "pending_confirmation") return state;
      if (state.degraded) return state;
      const spare = findSpare(state.spares, app.venue, app.spec);
      if (spare && spare.quantity > 0 && state.online) {
        return {
          ...state,
          spares: state.spares.map((s) =>
            s.id === spare.id ? { ...s, quantity: s.quantity - 1 } : s
          ),
          applications: state.applications.map((a) =>
            a.id === action.appId
              ? { ...a, status: "taken", reason: undefined }
              : a
          ),
        };
      }
      // 仍无货 → 回到排队
      return {
        ...state,
        applications: state.applications.map((a) =>
          a.id === action.appId
            ? { ...a, status: "queued", reason: undefined }
            : a
        ),
      };
    }

    case "PROCESS_QUEUE": {
      if (state.role !== "supervisor") return state;
      // 出库失败后恢复：按申请先后（queueOrder）接着办，已领走的记录照旧
      if (state.degraded) return state;
      let spares = [...state.spares];
      const apps = state.applications
        .filter((a) => a.status === "queued" || a.status === "outbound_failed")
        .sort((a, b) => a.queueOrder - b.queueOrder);
      const takenIds: string[] = [];
      for (const app of apps) {
        const spare = spares.find((s) => s.venue === app.venue && s.spec === app.spec);
        if (spare && spare.quantity > 0 && state.online) {
          spares = spares.map((s) =>
            s.id === spare.id ? { ...s, quantity: s.quantity - 1 } : s
          );
          takenIds.push(app.id);
        }
      }
      return {
        ...state,
        spares,
        applications: state.applications.map((a) =>
          takenIds.includes(a.id) ? { ...a, status: "taken" } : a
        ),
      };
    }

    case "RESTOCK": {
      if (state.role !== "supervisor") return state;
      return {
        ...state,
        spares: state.spares.map((s) => {
          if (s.venue === action.venue && s.spec === action.spec) {
            return {
              ...s,
              quantity: Math.min(s.capacity, s.quantity + action.qty),
            };
          }
          return s;
        }),
      };
    }

    case "TUNE_PIPE": {
      const pipe = state.pipes.find((p) => p.id === action.pipeId);
      if (!pipe) return state;
      if (pipe.reedStatus === "normal") {
        // 簧片正常：可直接定音完成
        return {
          ...state,
          pipes: state.pipes.map((p) =>
            p.id === pipe.id ? { ...p, status: "completed" } : p
          ),
        };
      }
      // 簧片异常：必须有同规格备件已领走才能定音
      const taken = state.applications.find(
        (a) => a.pipeId === pipe.id && a.status === "taken"
      );
      if (!taken) return state; // 待料音管不算完成
      return {
        ...state,
        pipes: state.pipes.map((p) =>
          p.id === pipe.id
            ? { ...p, status: "completed", reedStatus: "normal", notes: "已更换同规格簧片并定音" }
            : p
        ),
      };
    }

    case "CREATE_REPORT": {
      const venuePipes = state.pipes.filter((p) => p.venue === action.venue);
      const takenApps = state.applications.filter(
        (a) => a.venue === action.venue && a.status === "taken"
      );
      const allDone = venuePipes.every((p) => p.status === "completed");
      const report: MaintenanceReport = {
        id: "r" + String(state.reports.length + 1).padStart(3, "0") + "-" + Date.now().toString(36),
        venue: action.venue,
        date: action.date,
        technician: action.technician,
        pipeIds: venuePipes.map((p) => p.id),
        partsUsed: takenApps.map((a) => a.id),
        summary: `${action.venue} 单次维护：音管 ${venuePipes.length} 根，已更换簧片 ${takenApps.length} 件，${allDone ? "全部完成" : "有待料音管"}`,
        completed: allDone,
        createdAt: Date.now(),
      };
      return { ...state, reports: [...state.reports, report] };
    }

    case "ADD_PIPE": {
      const newPipe: Pipe = {
        ...action.pipe,
        id: "p" + (state.pipes.length + 1) + "-" + Date.now().toString(36),
        status: action.pipe.reedStatus === "abnormal" ? "abnormal" : "normal",
      };
      return { ...state, pipes: [...state.pipes, newPipe] };
    }

    case "RESET":
      localStorage.removeItem(STORAGE_KEY);
      return {
        ...loadState(),
        role: state.role,
        online: state.online,
        degraded: state.degraded,
      };

    default:
      return state;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...loadState(),
    role: "technician" as Role,
    online: true,
    degraded: false,
  }));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const pushToast = (kind: Toast["kind"], message: string) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, kind, message }]);
    const timer = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
      timers.current.delete(id);
    }, 4200);
    timers.current.set(id, timer);
  };

  const dismissToast = (id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((t) => t.filter((x) => x.id !== id));
  };

  // 持久化
  useEffect(() => {
    const data: PersistShape = {
      pipes: state.pipes,
      spares: state.spares,
      applications: state.applications,
      reports: state.reports,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [state.pipes, state.spares, state.applications, state.reports]);

  // 离线/故障恢复时自动提示
  const prevOnline = useRef(state.online);
  const prevDegraded = useRef(state.degraded);
  useEffect(() => {
    if (prevOnline.current !== state.online) {
      pushToast(
        state.online ? "success" : "warning",
        state.online ? "已回网，可与库房对账" : "已进入现场离线模式，备件将本地预留"
      );
      prevOnline.current = state.online;
    }
  }, [state.online]);
  useEffect(() => {
    if (prevDegraded.current !== state.degraded) {
      pushToast(
        state.degraded ? "error" : "success",
        state.degraded ? "库房系统故障：出库将失败" : "库房系统已恢复，可按申请先后办理"
      );
      prevDegraded.current = state.degraded;
    }
  }, [state.degraded]);

  const value = useMemo<StoreContextValue>(
    () => ({
      ...state,
      dispatch,
      toasts,
      pushToast,
      dismissToast,
      setRole: (r: Role) => dispatch({ type: "SET_ROLE", role: r }),
      setOnline: (o: boolean) => dispatch({ type: "SET_ONLINE", online: o }),
      setDegraded: (d: boolean) => dispatch({ type: "SET_DEGRADED", degraded: d }),
      addPipe: (p: Omit<Pipe, "id" | "status">) => dispatch({ type: "ADD_PIPE", pipe: p }),
    }),
    [state, toasts]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { SUPERVISOR_NAME };
