import type { Action, State } from "../store";
import { ROLE_LABEL, STATUS_LABEL, venueName } from "../store";
import { REED_SPECS } from "../seed";

interface Props {
  state: State;
  dispatch: React.Dispatch<Action>;
}

export default function Inventory({ state, dispatch }: Props) {
  const venueId = state.venueId;
  const stock = state.stock[venueId] ?? {};
  const capacity = state.capacity[venueId] ?? {};
  const requests = state.requests
    .filter((r) => r.venueId === venueId)
    .sort((a, b) => b.seq - a.seq);

  const reservedCount = (spec: string) =>
    state.requests.filter(
      (r) => r.venueId === venueId && r.spec === spec && r.status === "reserved"
    ).length;

  return (
    <>
      <div className="workspace">
        <section className="panel">
          <div className="heading">
            <div>
              <p>簧片备件库 · 分馆记账</p>
              <h2>{venueName(venueId)} 库存账本</h2>
            </div>
            <span className="hint">库房归琴房主管保管，技师越权领用会被拦下</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>簧片规格</th>
                <th>在库 / 容量</th>
                <th>本地预留占用</th>
                <th>库存水位</th>
                <th>入库</th>
              </tr>
            </thead>
            <tbody>
              {REED_SPECS.map((spec) => {
                const cur = stock[spec] ?? 0;
                const cap = capacity[spec] ?? 0;
                const pct = cap > 0 ? Math.round((cur / cap) * 100) : 0;
                return (
                  <tr key={spec}>
                    <td>
                      <b>{spec}</b>
                    </td>
                    <td>
                      {cur} / {cap}
                      {cur === 0 && <span className="badge b-err"> 缺货</span>}
                    </td>
                    <td>
                      {reservedCount(spec) > 0 ? (
                        <span className="badge st-reserved">{reservedCount(spec)} 件预留中</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="meter">
                        <i style={{ width: `${pct}%` }} className={cur === 0 ? "empty" : ""} />
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => dispatch({ type: "RESTOCK", venueId, spec })}
                        disabled={cur >= cap}
                      >
                        入库 +1
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>申请流水</p>
              <h2>备用簧片申请</h2>
            </div>
            <span className="hint">
              当前身份：{ROLE_LABEL[state.role]} · {state.online ? "在线" : "离线"} · 库房
              {state.warehouseOk ? "正常" : "故障"}
            </span>
          </div>
          {requests.length === 0 && <p className="muted">本场馆暂无申请。到「音管台账」对异常音管提交申请。</p>}
          <div className="req-list">
            {requests.map((r) => {
              const pipe = state.pipes.find((p) => p.id === r.pipeId);
              return (
                <article key={r.id} className={`req st-${r.status}`}>
                  <b className="req-seq">#{r.seq}</b>
                  <div className="req-main">
                    <h3>
                      {pipe?.pipeNo ?? r.pipeId} · {r.spec}
                      <span className={`badge st-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                    </h3>
                    <p>
                      申请人：{ROLE_LABEL[r.applicant]} · {r.createdAt} · {r.note}
                    </p>
                  </div>
                  {r.status !== "issued" && (
                    <button className="primary" onClick={() => dispatch({ type: "ISSUE", requestId: r.id })}>
                      办理出库
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="heading">
          <div>
            <p>全馆联动</p>
            <h2>操作日志</h2>
          </div>
          <span className="hint">越权拦截、排队、对账、故障恢复都会留痕</span>
        </div>
        <div className="log">
          {state.log.map((entry) => (
            <p key={entry.id} className={`log-${entry.kind}`}>
              <time>{entry.time}</time>
              {entry.text}
            </p>
          ))}
        </div>
      </section>
    </>
  );
}
