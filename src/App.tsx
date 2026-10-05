import { useState } from "react";
import { StoreProvider } from "./store";
import Header from "./components/Header";
import Metrics from "./components/Metrics";
import PipeLedger from "./components/PipeLedger";
import SpareInventory from "./components/SpareInventory";
import ApplicationQueue from "./components/ApplicationQueue";
import MaintenanceReport from "./components/MaintenanceReport";
import Toasts from "./components/Toasts";

type Tab = "ledger" | "spares" | "queue" | "report";

const TABS: { key: Tab; label: string }[] = [
  { key: "ledger", label: "音管台账" },
  { key: "spares", label: "簧片备件库" },
  { key: "queue", label: "领用队列" },
  { key: "report", label: "维护报告" },
];

function Shell() {
  const [tab, setTab] = useState<Tab>("ledger");

  return (
    <main className="app">
      <Header />
      <Metrics />

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "tab-active" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "ledger" && <PipeLedger />}
      {tab === "spares" && <SpareInventory />}
      {tab === "queue" && <ApplicationQueue />}
      {tab === "report" && <MaintenanceReport />}

      <Toasts />
    </main>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
