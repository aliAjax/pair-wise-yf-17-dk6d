import { useStore } from "../store";
import { roleLabel } from "../utils";

export default function Header() {
  const { role, setRole, online, setOnline, degraded, setDegraded, pushToast } = useStore();

  const switchRole = () => {
    const next = role === "supervisor" ? "technician" : "supervisor";
    setRole(next);
    pushToast("info", `已切换为：${roleLabel(next)}`);
  };

  return (
    <header className="hero">
      <div className="hero-top">
        <div>
          <p>hxyfront-62005 · 管风琴维护 · 簧片备件台账</p>
          <h1>管风琴音管调音记录</h1>
        </div>
        <div className="hero-controls">
          <div className="control-group">
            <span className="control-label">当前身份</span>
            <button className="role-btn" onClick={switchRole}>
              {roleLabel(role)} ⇄
            </button>
          </div>
          <div className="control-group">
            <span className="control-label">作业网络</span>
            <button
              className={"net-btn " + (online ? "online" : "offline")}
              onClick={() => setOnline(!online)}
            >
              {online ? "● 在线（库房）" : "○ 离线（现场）"}
            </button>
          </div>
          <div className="control-group">
            <span className="control-label">库房系统</span>
            <button
              className={"deg-btn " + (degraded ? "down" : "up")}
              onClick={() => setDegraded(!degraded)}
            >
              {degraded ? "故障中" : "正常"}
            </button>
          </div>
        </div>
      </div>
      <span>
        音管台账、簧片备件库与单次维护报告联动：簧片异常须先申请同规格备用簧片，经琴房主管审批出库后方可定音；各场馆备件分开记账，容量不足排队等出库，待料音管不算完成；现场离线先本地预留，回网对账不符退回待确认，出库失败恢复后按申请先后办理。
      </span>
    </header>
  );
}
