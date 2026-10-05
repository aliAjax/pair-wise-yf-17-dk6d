import type { State } from "../store";
import { STATUS_LABEL, isWaitingForPart, venueName } from "../store";
import { venues } from "../seed";

interface Props {
  state: State;
}

export default function Report({ state }: Props) {
  return (
    <div className="report-grid">
      {venues.map((v) => {
        const pipes = state.pipes.filter((p) => p.venueId === v.id);
        const tuned = pipes.filter((p) => p.tuned).length;
        const abnormal = pipes.filter((p) => p.reedStatus === "abnormal");
        const waiting = pipes.filter((p) => isWaitingForPart(p, state.requests));
        const done = pipes.length - waiting.length; // 待料管子不算完成
        const env = state.env[v.id];
        const reqs = state.requests.filter((r) => r.venueId === v.id);
        const issued = reqs.filter((r) => r.status === "issued");
        const openReqs = reqs.filter((r) => r.status !== "issued");
        const rate = pipes.length > 0 ? Math.round((done / pipes.length) * 100) : 0;

        return (
          <section className="panel report" key={v.id}>
            <div className="heading">
              <div>
                <p>单次维护报告 · {state.reportNo}-{v.id.toUpperCase()}</p>
                <h2>{v.name}</h2>
              </div>
              <span className="hint">2026-10-05 · {v.kind}</span>
            </div>

            <div className="report-stats">
              <div>
                <small>音管总数</small>
                <strong>{pipes.length}</strong>
              </div>
              <div>
                <small>已定音</small>
                <strong>{tuned}</strong>
              </div>
              <div>
                <small>簧片异常</small>
                <strong>{abnormal.length}</strong>
              </div>
              <div>
                <small>待料（不计完成）</small>
                <strong className={waiting.length > 0 ? "warn-text" : ""}>{waiting.length}</strong>
              </div>
              <div>
                <small>完成率</small>
                <strong>{rate}%</strong>
              </div>
            </div>
            <div className="meter big">
              <i style={{ width: `${rate}%` }} />
            </div>

            {env && (
              <p className="report-line">
                现场环境：{env.temp.toFixed(1)}℃ / {env.humidity}%（记录于 {env.at}）
              </p>
            )}

            <h3>本次备件领用</h3>
            {issued.length === 0 ? (
              <p className="muted">本次无备件出库。</p>
            ) : (
              <ul className="report-list">
                {issued.map((r) => (
                  <li key={r.id}>
                    #{r.seq} {state.pipes.find((p) => p.id === r.pipeId)?.pipeNo} 领用「{r.spec}」
                    — {r.note}
                  </li>
                ))}
              </ul>
            )}

            <h3>待确认 / 在途事项</h3>
            {openReqs.length === 0 && waiting.length === 0 ? (
              <p className="muted">无待办，全部对清。</p>
            ) : (
              <ul className="report-list">
                {openReqs.map((r) => (
                  <li key={r.id}>
                    申请 #{r.seq}（{r.spec}）{STATUS_LABEL[r.status]} — {r.note}
                  </li>
                ))}
                {waiting
                  .filter((p) => !openReqs.some((r) => r.pipeId === p.id))
                  .map((p) => (
                    <li key={p.id}>{p.pipeNo} 簧片异常，尚未申请备用簧片，待料中</li>
                  ))}
              </ul>
            )}

            <h3>异常音管标记</h3>
            {abnormal.length === 0 ? (
              <p className="muted">无异常音管。</p>
            ) : (
              <ul className="report-list">
                {abnormal.map((p) => (
                  <li key={p.id}>
                    {p.pipeNo}（{p.stop} · {p.pitch}，{p.cents > 0 ? "+" : ""}
                    {p.cents}¢）— {p.note}
                  </li>
                ))}
              </ul>
            )}

            <div className="sign">
              <span>技师签字：＿＿＿＿＿＿</span>
              <span>琴房主管签字：＿＿＿＿＿＿</span>
            </div>
            <p className="report-venue-id">{venueName(v.id)} · 备件独立记账</p>
          </section>
        );
      })}
    </div>
  );
}
