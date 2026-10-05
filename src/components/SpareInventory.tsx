import { useState } from "react";
import { useStore } from "../store";
import { VENUES } from "../seed";

export default function SpareInventory() {
  const { spares, role, dispatch, pushToast } = useStore();
  const [venueFilter, setVenueFilter] = useState<string>("全部");
  const [restockQty, setRestockQty] = useState<Record<string, number>>({});

  const filtered = spares.filter((s) =>
    venueFilter === "全部" ? true : s.venue === venueFilter
  );

  const handleRestock = (id: string, venue: string, spec: string) => {
    if (role !== "supervisor") {
      pushToast("error", "越权操作被拦下：备件入库仅琴房主管可执行");
      return;
    }
    const qty = Math.max(1, Number(restockQty[id] ?? 1));
    dispatch({ type: "RESTOCK", venue, spec, qty });
    pushToast("success", `已补货：${spec} ×${qty}（${venue}）`);
    setRestockQty((m) => ({ ...m, [id]: 1 }));
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>簧片备件库</p>
          <h2>各场馆备件台账（分开记账）</h2>
        </div>
        <div className="chips">
          {["全部", ...VENUES].map((v) => (
            <button
              key={v}
              className={venueFilter === v ? "chip-active" : ""}
              onClick={() => setVenueFilter(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="ledger">
          <thead>
            <tr>
              <th>场馆</th>
              <th>规格（音栓 + 音高）</th>
              <th>库存 / 容量</th>
              <th>状态</th>
              <th>补货（主管）</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const ratio = s.capacity > 0 ? s.quantity / s.capacity : 0;
              const stockState =
                s.quantity === 0
                  ? { label: "缺货", color: "#b91c1c" }
                  : ratio >= 1
                  ? { label: "满库", color: "#15803d" }
                  : { label: "有货", color: "#0369a1" };
              return (
                <tr key={s.id}>
                  <td>{s.venue}</td>
                  <td>{s.spec}</td>
                  <td>
                    <div className="stock-cell">
                      <div className="stock-bar">
                        <div
                          className="stock-fill"
                          style={{
                            width: `${ratio * 100}%`,
                            background: stockState.color,
                          }}
                        />
                      </div>
                      <span>
                        {s.quantity} / {s.capacity}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        color: stockState.color,
                        borderColor: stockState.color + "55",
                      }}
                    >
                      {stockState.label}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <input
                        type="number"
                        min={1}
                        max={s.capacity}
                        value={restockQty[s.id] ?? 1}
                        onChange={(e) =>
                          setRestockQty((m) => ({
                            ...m,
                            [s.id]: Number(e.target.value),
                          }))
                        }
                        className="restock-input"
                      />
                      <button
                        className="mini primary"
                        onClick={() => handleRestock(s.id, s.venue, s.spec)}
                        disabled={s.quantity >= s.capacity}
                      >
                        入库
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {role !== "supervisor" && (
        <p className="inline-note warning">
          当前为技师身份：备件入库仅琴房主管可操作，越权会被拦下。
        </p>
      )}
    </section>
  );
}
