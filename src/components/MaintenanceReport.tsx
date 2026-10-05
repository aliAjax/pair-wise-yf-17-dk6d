import { useState } from "react";
import { useStore } from "../store";
import { VENUES, TECHNICIANS } from "../seed";
import {
  PIPE_STATUS_LABEL,
  PIPE_STATUS_COLOR,
  APP_STATUS_LABEL,
  APP_STATUS_COLOR,
  todayStr,
  fmtTime,
} from "../utils";

export default function MaintenanceReport() {
  const { pipes, applications, reports, dispatch, pushToast } = useStore();
  const [venue, setVenue] = useState(VENUES[0]);
  const [date, setDate] = useState(todayStr());
  const [technician, setTechnician] = useState(TECHNICIANS[0]);
  const [viewing, setViewing] = useState<string | null>(null);

  const venuePipes = pipes.filter((p) => p.venue === venue);
  const takenApps = applications.filter(
    (a) => a.venue === venue && a.status === "taken"
  );
  const waitingCount = venuePipes.filter((p) => p.status === "waiting_parts").length;
  const completedCount = venuePipes.filter((p) => p.status === "completed").length;

  const viewingReport = reports.find((r) => r.id === viewing);

  const createReport = () => {
    dispatch({ type: "CREATE_REPORT", venue, date, technician });
    pushToast("success", "已生成本次维护报告");
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>单次维护报告</p>
          <h2>生成 / 查看报告</h2>
        </div>
      </div>

      <div className="report-form">
        <label>
          <span>场馆名称</span>
          <select value={venue} onChange={(e) => setVenue(e.target.value)}>
            {VENUES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>维护日期</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span>负责技师</span>
          <select value={technician} onChange={(e) => setTechnician(e.target.value)}>
            {TECHNICIANS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button className="primary" onClick={createReport}>
          生成报告
        </button>
      </div>

      <div className="report-preview">
        <h3>
          {venue} · 现场预览（{date}）
        </h3>
        <div className="report-stats">
          <span>音管总数：<b>{venuePipes.length}</b></span>
          <span>已完成：<b style={{ color: "#15803d" }}>{completedCount}</b></span>
          <span>待料（不算完成）：<b style={{ color: "#9a3412" }}>{waitingCount}</b></span>
          <span>已更换簧片：<b>{takenApps.length}</b> 件</span>
        </div>
        <div className="table-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>音管编号</th>
                <th>音栓</th>
                <th>音高</th>
                <th>音分偏差</th>
                <th>簧片状态</th>
                <th>音管状态</th>
              </tr>
            </thead>
            <tbody>
              {venuePipes.map((p) => (
                <tr key={p.id}>
                  <td>{p.pipeNo}</td>
                  <td>{p.stop}</td>
                  <td>{p.pitch}</td>
                  <td>
                    {p.centDeviation > 0 ? "+" : ""}
                    {p.centDeviation} cent
                  </td>
                  <td>{p.reedStatus === "abnormal" ? "异常" : "正常"}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        color: PIPE_STATUS_COLOR[p.status],
                        borderColor: PIPE_STATUS_COLOR[p.status] + "55",
                      }}
                    >
                      {PIPE_STATUS_LABEL[p.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="report-list">
        <h3>历史报告</h3>
        {reports.length === 0 && <p className="muted">暂无维护报告</p>}
        <div className="records">
          {reports.map((r) => (
            <article key={r.id}>
              <b>{r.completed ? "✓" : "…"}</b>
              <div>
                <h3>
                  {r.venue} · {r.date}
                </h3>
                <p>
                  {r.technician} · {fmtTime(r.createdAt)} · 音管 {r.pipeIds.length} · 簧片{" "}
                  {r.partsUsed.length} 件 ·{" "}
                  <span style={{ color: r.completed ? "#15803d" : "#9a3412" }}>
                    {r.completed ? "全部完成" : "有待料音管"}
                  </span>
                </p>
                <button className="mini" onClick={() => setViewing(r.id)}>
                  查看详情
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {viewingReport && (
        <div className="modal-backdrop" onClick={() => setViewing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="heading">
              <div>
                <p>维护报告详情</p>
                <h2>
                  {viewingReport.venue} · {viewingReport.date}
                </h2>
              </div>
              <button onClick={() => setViewing(null)}>关闭</button>
            </div>
            <p className="modal-summary">{viewingReport.summary}</p>
            <p>
              <b>负责技师：</b>
              {viewingReport.technician}
            </p>
            <p>
              <b>音管数：</b>
              {viewingReport.pipeIds.length} · <b>更换簧片：</b>
              {viewingReport.partsUsed.length} 件
            </p>
            <h4>备件领用记录</h4>
            <ul className="modal-parts">
              {viewingReport.partsUsed.length === 0 && (
                <li className="muted">本报告无已领走备件</li>
              )}
              {viewingReport.partsUsed.map((pid) => {
                const app = applications.find((a) => a.id === pid);
                if (!app) return null;
                return (
                  <li key={pid}>
                    {app.spec} · {APP_STATUS_LABEL[app.status]}（{app.applicant}）
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
