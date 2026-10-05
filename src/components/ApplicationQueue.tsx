import { useMemo } from "react";
import { useStore } from "../store";
import {
  APP_STATUS_LABEL,
  APP_STATUS_COLOR,
  fmtTime,
} from "../utils";
import type { SpareApplication } from "../types";

export default function ApplicationQueue() {
  const {
    applications,
    pipes,
    role,
    online,
    degraded,
    dispatch,
    pushToast,
  } = useStore();

  const sorted = useMemo(
    () =>
      [...applications].sort((a, b) => {
        // 进行中的在前，按申请先后
        const active = (s: SpareApplication["status"]) =>
          ["pending_approval", "approved", "queued", "reserved_local", "outbound_failed", "pending_confirmation"].includes(s);
        if (active(a.status) && !active(b.status)) return -1;
        if (!active(a.status) && active(b.status)) return 1;
        return a.queueOrder - b.queueOrder;
      }),
    [applications]
  );

  const pipeOf = (id: string) => pipes.find((p) => p.id === id);

  const requireSupervisor = (fn: () => void, action: string) => {
    if (role !== "supervisor") {
      pushToast("error", `越权操作被拦下：${action}仅琴房主管可执行`);
      return;
    }
    fn();
  };

  const approve = (app: SpareApplication) =>
    requireSupervisor(() => {
      dispatch({ type: "APPROVE", appId: app.id });
      pushToast("success", `已批准申请（${app.spec}），可出库`);
    }, "审批");

  const reject = (app: SpareApplication) =>
    requireSupervisor(() => {
      dispatch({ type: "REJECT", appId: app.id });
      pushToast("info", `已驳回申请（${app.spec}）`);
    }, "驳回");

  const outbound = (app: SpareApplication) =>
    requireSupervisor(() => {
      if (degraded) {
        pushToast("error", "库房系统故障：出库失败，请待恢复后按申请先后办理");
      } else if (!online) {
        pushToast("warning", "现场离线：已本地预留先占住，回网后对账");
      } else {
        pushToast("success", `已出库：${app.spec}（${app.venue}）`);
      }
      dispatch({ type: "OUTBOUND", appId: app.id });
    }, "出库");

  const reconcile = (app: SpareApplication) =>
    requireSupervisor(() => {
      if (!online) {
        pushToast("error", "离线无法对账：请回网后再与库房对账");
        return;
      }
      dispatch({ type: "RECONCILE", appId: app.id });
      pushToast("info", "已与库房对账");
    }, "对账");

  const reconcileAll = () =>
    requireSupervisor(() => {
      if (!online) {
        pushToast("error", "离线无法对账：请回网后再与库房对账");
        return;
      }
      dispatch({ type: "RECONCILE_ALL" });
      pushToast("info", "已对全部本地预留完成对账");
    }, "批量对账");

  const retryPending = (app: SpareApplication) =>
    requireSupervisor(() => {
      dispatch({ type: "RETRY_PENDING", appId: app.id });
      pushToast("info", "已重新处理待确认申请");
    }, "待确认处理");

  const processQueue = () =>
    requireSupervisor(() => {
      if (degraded) {
        pushToast("error", "库房系统仍故障，无法恢复出库");
        return;
      }
      const before = applications.filter((a) =>
        ["queued", "outbound_failed"].includes(a.status)
      ).length;
      dispatch({ type: "PROCESS_QUEUE" });
      pushToast("success", `已按申请先后办理队列（待处理 ${before} 条），已领走记录照旧`);
    }, "恢复办理");

  const activeCount = applications.filter((a) =>
    ["pending_approval", "approved", "queued", "reserved_local", "outbound_failed", "pending_confirmation"].includes(a.status)
  ).length;
  const queuedCount = applications.filter((a) =>
    ["queued", "outbound_failed"].includes(a.status)
  ).length;
  const reservedCount = applications.filter((a) => a.status === "reserved_local").length;

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>领用队列</p>
          <h2>备件申请与出库（按申请先后）</h2>
        </div>
        <div className="queue-actions">
          <button onClick={reconcileAll} disabled={reservedCount === 0}>
            全部对账{reservedCount > 0 ? `（${reservedCount}）` : ""}
          </button>
          <button className="primary" onClick={processQueue} disabled={queuedCount === 0}>
            恢复办理{queuedCount > 0 ? `（${queuedCount}）` : ""}
          </button>
        </div>
      </div>

      <div className="queue-stats">
        <span>在途申请：<b>{activeCount}</b></span>
        <span>排队/失败待恢复：<b>{queuedCount}</b></span>
        <span>本地预留待对账：<b>{reservedCount}</b></span>
      </div>

      <div className="table-wrap">
        <table className="ledger">
          <thead>
            <tr>
              <th>顺序</th>
              <th>场馆</th>
              <th>规格</th>
              <th>申请音管</th>
              <th>申请人</th>
              <th>状态</th>
              <th>说明</th>
              <th>操作（主管）</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((app) => {
              const pipe = pipeOf(app.pipeId);
              return (
                <tr key={app.id}>
                  <td>
                    <span className="order-badge">#{app.queueOrder}</span>
                  </td>
                  <td>{app.venue}</td>
                  <td>{app.spec}</td>
                  <td>{pipe ? `${pipe.pipeNo}（${pipe.pitch}）` : "—"}</td>
                  <td>
                    {app.applicant}
                    <span className="muted"> · {app.applicantRole === "supervisor" ? "主管" : "技师"}</span>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        color: APP_STATUS_COLOR[app.status],
                        borderColor: APP_STATUS_COLOR[app.status] + "55",
                      }}
                    >
                      {APP_STATUS_LABEL[app.status]}
                    </span>
                  </td>
                  <td className="reason-cell">{app.reason ?? "—"}</td>
                  <td>
                    <div className="row-actions">
                      {app.status === "pending_approval" && (
                        <>
                          <button className="mini primary" onClick={() => approve(app)}>
                            批准
                          </button>
                          <button className="mini" onClick={() => reject(app)}>
                            驳回
                          </button>
                        </>
                      )}
                      {app.status === "approved" && (
                        <button className="mini primary" onClick={() => outbound(app)}>
                          出库
                        </button>
                      )}
                      {app.status === "reserved_local" && (
                        <button className="mini primary" onClick={() => reconcile(app)}>
                          对账
                        </button>
                      )}
                      {app.status === "pending_confirmation" && (
                        <button className="mini primary" onClick={() => retryPending(app)}>
                          重新处理
                        </button>
                      )}
                      {app.status === "queued" && (
                        <span className="muted">等待补货/恢复</span>
                      )}
                      {app.status === "outbound_failed" && (
                        <span className="muted">待恢复办理</span>
                      )}
                      {app.status === "taken" && <span className="muted">已领走</span>}
                      {app.status === "rejected" && <span className="muted">已驳回</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="muted" style={{ textAlign: "center" }}>
                  暂无申请记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="inline-note">
        出库失败后恢复时按申请先后（#顺序）接着办，已领走的记录照旧；各场馆备件分开记账，容量不足时申请先排队等出库。
      </p>
    </section>
  );
}
