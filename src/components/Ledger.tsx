import { useState } from "react";
import type { Action, State } from "../store";
import { STATUS_LABEL, isWaitingForPart, requestForPipe } from "../store";

interface Props {
  state: State;
  dispatch: React.Dispatch<Action>;
}

function CentsBar({ cents }: { cents: number }) {
  const pct = Math.max(-15, Math.min(15, cents)) / 15; // -1..1
  const over = Math.abs(cents) > 5;
  return (
    <div className="cents">
      <div className="cents-track">
        <i className="cents-zero" />
        <i
          className={`cents-dot ${over ? "over" : ""}`}
          style={{ left: `${50 + pct * 50}%` }}
        />
      </div>
      <b className={over ? "over" : ""}>
        {cents > 0 ? "+" : ""}
        {cents}¢
      </b>
    </div>
  );
}

export default function Ledger({ state, dispatch }: Props) {
  const pipes = state.pipes.filter((p) => p.venueId === state.venueId);
  const env = state.env[state.venueId];
  const [temp, setTemp] = useState(String(env?.temp ?? 20));
  const [hum, setHum] = useState(String(env?.humidity ?? 50));

  const stops = Array.from(new Set(pipes.map((p) => p.stop)));

  return (
    <div className="workspace">
      <aside className="panel">
        <h2>音栓列表</h2>
        <div className="stop-list">
          {stops.map((stop) => {
            const rows = pipes.filter((p) => p.stop === stop);
            const abnormal = rows.filter((p) => p.reedStatus === "abnormal").length;
            return (
              <div className="stop-row" key={stop}>
                <span>{stop}</span>
                <small>
                  {rows.length} 根{abnormal > 0 ? ` · ${abnormal} 异常` : ""}
                </small>
              </div>
            );
          })}
        </div>

        <h2 style={{ marginTop: 22 }}>温湿度记录</h2>
        {env && (
          <div className="env-card">
            <p>
              当前 <b>{env.temp.toFixed(1)}℃</b> / <b>{env.humidity}%</b>
              <small>记录于 {env.at}</small>
            </p>
            <div className="env-form">
              <label>
                <span>温度 ℃</span>
                <input value={temp} onChange={(e) => setTemp(e.target.value)} />
              </label>
              <label>
                <span>湿度 %</span>
                <input value={hum} onChange={(e) => setHum(e.target.value)} />
              </label>
              <button
                className="primary"
                onClick={() => {
                  const t = Number(temp);
                  const h = Number(hum);
                  if (Number.isFinite(t) && Number.isFinite(h)) {
                    dispatch({ type: "SET_ENV", venueId: state.venueId, temp: t, humidity: h });
                  }
                }}
              >
                记录温湿度
              </button>
            </div>
          </div>
        )}
      </aside>

      <section className="panel">
        <div className="heading">
          <div>
            <p>音管台账 · 调音偏差表</p>
            <h2>偏差与簧片状态</h2>
          </div>
          <span className="hint">簧片异常的音管须先申请同规格备用簧片并出库，才能定音</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>音管编号</th>
              <th>音栓</th>
              <th>音高</th>
              <th>音分偏差</th>
              <th>簧片状态</th>
              <th>备件申请</th>
              <th>定音</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pipes.map((p) => {
              const req = requestForPipe(p.id, state.requests);
              const waiting = isWaitingForPart(p, state.requests);
              const canApply = p.reedStatus === "abnormal" && (!req || req.status === "issued");
              return (
                <tr key={p.id} className={p.reedStatus === "abnormal" ? "row-abnormal" : ""}>
                  <td>
                    <b>{p.pipeNo}</b>
                    <small className="sub">{p.note}</small>
                  </td>
                  <td>{p.stop}</td>
                  <td>{p.pitch}</td>
                  <td>
                    <CentsBar cents={p.cents} />
                  </td>
                  <td>
                    <span className={`badge ${p.reedStatus === "abnormal" ? "b-err" : "b-ok"}`}>
                      {p.reedStatus === "abnormal" ? "簧片异常" : "正常"}
                    </span>
                  </td>
                  <td>
                    {req ? (
                      <span className={`badge st-${req.status}`} title={req.note}>
                        #{req.seq} {STATUS_LABEL[req.status]}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {waiting ? (
                      <span className="badge b-warn">待料</span>
                    ) : p.tuned ? (
                      <span className="badge b-ok">已定音</span>
                    ) : (
                      <span className="badge b-muted">未定音</span>
                    )}
                  </td>
                  <td className="ops">
                    <button onClick={() => dispatch({ type: "TOGGLE_REED", pipeId: p.id })}>
                      {p.reedStatus === "abnormal" ? "复检通过" : "标记异常"}
                    </button>
                    <button
                      disabled={!canApply}
                      onClick={() => dispatch({ type: "APPLY", pipeId: p.id })}
                    >
                      申请备片
                    </button>
                    <button
                      className="primary"
                      disabled={p.tuned && p.reedStatus === "normal"}
                      onClick={() => dispatch({ type: "TUNE", pipeId: p.id })}
                    >
                      定音
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
