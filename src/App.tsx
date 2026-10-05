import { useReducer, useState } from "react";
import "./styles.css";
import { initialState, reducer, ROLE_LABEL, isWaitingForPart } from "./store";
import { venues } from "./seed";
import Ledger from "./components/Ledger";
import Inventory from "./components/Inventory";
import Report from "./components/Report";

type Tab = "ledger" | "inventory" | "report";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "ledger", label: "音管台账" },
  { id: "inventory", label: "簧片备件库" },
  { id: "report", label: "单次维护报告" },
];

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [tab, setTab] = useState<Tab>("ledger");

  const pipes = state.pipes.filter((p) => p.venueId === state.venueId);
  const stopCount = new Set(pipes.map((p) => p.stop)).size;
  const overCount = pipes.filter((p) => Math.abs(p.cents) > 5).length;
  const waitingCount = pipes.filter((p) => isWaitingForPart(p, state.requests)).length;
  const env = state.env[state.venueId];

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62005 · 管风琴维护 · 台账 × 备件库 × 维护报告联动</p>
        <h1>管风琴音管调音记录</h1>
        <span>
          簧片异常的音管须先申请同规格备用簧片并出库才能定音；库房归琴房主管保管，技师越权领用会被拦下；
          各场馆备件分开记账，容量不够先排队等出库，待料管子不算完成；现场离线按本地预留先占住备件，
          回网后与库房对账，对不上的退回待确认；出库失败恢复后按申请先后接着办，已领走的记录照旧。
        </span>
        <div className="control-bar">
          <div className="control">
            <small>当前身份</small>
            <div className="seg">
              {(["technician", "supervisor"] as const).map((r) => (
                <button
                  key={r}
                  className={state.role === r ? "active" : ""}
                  onClick={() => dispatch({ type: "SET_ROLE", role: r })}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          <div className="control">
            <small>现场网络</small>
            <div className="seg">
              <button
                className={state.online ? "active" : ""}
                onClick={() => !state.online && dispatch({ type: "TOGGLE_ONLINE" })}
              >
                在线
              </button>
              <button
                className={!state.online ? "active warn" : ""}
                onClick={() => state.online && dispatch({ type: "TOGGLE_ONLINE" })}
              >
                离线（本地预留）
              </button>
            </div>
          </div>
          <div className="control">
            <small>库房系统</small>
            <div className="seg">
              <button
                className={state.warehouseOk ? "active" : ""}
                onClick={() => !state.warehouseOk && dispatch({ type: "TOGGLE_WAREHOUSE" })}
              >
                正常
              </button>
              <button
                className={!state.warehouseOk ? "active danger" : ""}
                onClick={() => state.warehouseOk && dispatch({ type: "TOGGLE_WAREHOUSE" })}
              >
                故障（出库失败）
              </button>
            </div>
          </div>
          <div className="control">
            <small>场馆（备件分开记账）</small>
            <div className="seg">
              {venues.map((v) => (
                <button
                  key={v.id}
                  className={state.venueId === v.id ? "active" : ""}
                  onClick={() => dispatch({ type: "SET_VENUE", venueId: v.id })}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="metrics">
        <article>
          <small>音栓数量</small>
          <strong>{stopCount}</strong>
        </article>
        <article>
          <small>偏差超限（|¢|&gt;5）</small>
          <strong>{overCount}</strong>
        </article>
        <article>
          <small>温度</small>
          <strong>{env ? `${env.temp.toFixed(1)}℃` : "—"}</strong>
        </article>
        <article>
          <small>湿度</small>
          <strong>{env ? `${env.humidity}%` : "—"}</strong>
        </article>
        <article>
          <small>待料音管</small>
          <strong className={waitingCount > 0 ? "warn-text" : ""}>{waitingCount}</strong>
        </article>
      </section>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "ledger" && <Ledger state={state} dispatch={dispatch} />}
      {tab === "inventory" && <Inventory state={state} dispatch={dispatch} />}
      {tab === "report" && <Report state={state} />}
    </main>
  );
}

export default App;
