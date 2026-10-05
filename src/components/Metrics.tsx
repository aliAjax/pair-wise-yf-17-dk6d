import { useStore } from "../store";
import { deviationOverLimit } from "../utils";

export default function Metrics() {
  const { pipes, spares, applications } = useStore();

  const stopCount = new Set(pipes.map((p) => p.stop)).size;
  const deviationOver = pipes.filter((p) => deviationOverLimit(p.centDeviation)).length;
  const waitingParts = pipes.filter((p) => p.status === "waiting_parts").length;
  const spareTotal = spares.reduce((sum, s) => sum + s.quantity, 0);
  const pendingApps = applications.filter((a) =>
    ["pending_approval", "queued", "reserved_local", "outbound_failed", "pending_confirmation"].includes(
      a.status
    )
  ).length;

  const cards = [
    { label: "音栓数量", value: stopCount, accent: "#475569" },
    { label: "偏差超限", value: deviationOver, accent: "#b91c1c" },
    { label: "待料音管", value: waitingParts, accent: "#9a3412" },
    { label: "备件库存", value: spareTotal, accent: "#0369a1" },
    { label: "在途申请", value: pendingApps, accent: "#6d28d9" },
  ];

  return (
    <section className="metrics">
      {cards.map((c) => (
        <article key={c.label} style={{ borderTopColor: c.accent }}>
          <small>{c.label}</small>
          <strong>{c.value}</strong>
        </article>
      ))}
    </section>
  );
}
