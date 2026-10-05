import { useMemo, useState } from "react";
import { useStore } from "../store";
import { VENUES, TECHNICIANS } from "../seed";
import {
  PIPE_STATUS_LABEL,
  PIPE_STATUS_COLOR,
  APP_STATUS_LABEL,
  APP_STATUS_COLOR,
  deviationOverLimit,
} from "../utils";
import type { Pipe } from "../types";

function specOf(pipe: Pipe) {
  return `${pipe.stop} ${pipe.pitch}`;
}

export default function PipeLedger() {
  const {
    pipes,
    applications,
    role,
    online,
    degraded,
    dispatch,
    pushToast,
    addPipe,
  } = useStore();

  const [venueFilter, setVenueFilter] = useState<string>("全部");
  const [stopFilter, setStopFilter] = useState<string>("全部");
  const [technician, setTechnician] = useState(TECHNICIANS[0]);
  const [showForm, setShowForm] = useState(false);

  const stops = useMemo(
    () => ["全部", ...Array.from(new Set(pipes.map((p) => p.stop)))],
    [pipes]
  );

  const filtered = useMemo(() => {
    return pipes.filter((p) => {
      if (venueFilter !== "全部" && p.venue !== venueFilter) return false;
      if (stopFilter !== "全部" && p.stop !== stopFilter) return false;
      return true;
    });
  }, [pipes, venueFilter, stopFilter]);

  const activeAppOf = (pipeId: string) =>
    applications
      .filter((a) => a.pipeId === pipeId)
      .sort((a, b) => b.queueOrder - a.queueOrder)[0];

  const handleApply = (pipe: Pipe) => {
    if (pipe.reedStatus !== "abnormal") {
      pushToast("info", "簧片状态正常，无需申请备用簧片");
      return;
    }
    const exists = applications.find(
      (a) => a.pipeId === pipe.id && !["rejected", "taken"].includes(a.status)
    );
    if (exists) {
      pushToast("warning", `该音管已有进行中的申请（${APP_STATUS_LABEL[exists.status]}）`);
      return;
    }
    dispatch({ type: "APPLY_SPARE", pipeId: pipe.id, applicant: technician });
    pushToast("success", `已提交同规格备用簧片申请：${specOf(pipe)}（待琴房主管审批）`);
  };

  const handleDirectTake = (pipe: Pipe) => {
    dispatch({ type: "DIRECT_TAKE", pipeId: pipe.id, applicant: technician });
    pushToast(
      "error",
      role === "technician"
        ? "越权领用被拦下：须先提交申请，由琴房主管审批后出库"
        : "违规领用被拦下：请走正规申请审批流程"
    );
  };

  const handleTune = (pipe: Pipe) => {
    if (pipe.reedStatus === "abnormal") {
      const taken = applications.find(
        (a) => a.pipeId === pipe.id && a.status === "taken"
      );
      if (!taken) {
        pushToast(
          "error",
          "待料音管不算完成：同规格备用簧片尚未领走，不能定音"
        );
        return;
      }
    }
    dispatch({ type: "TUNE_PIPE", pipeId: pipe.id });
    pushToast("success", `${pipe.pipeNo} 已定音完成`);
  };

  const canTune = (pipe: Pipe) => {
    if (pipe.status === "completed") return false;
    if (pipe.reedStatus === "normal") return true;
    return applications.some((a) => a.pipeId === pipe.id && a.status === "taken");
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>音管台账</p>
          <h2>音管与簧片状态</h2>
        </div>
        <button className="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "收起表单" : "新增音管"}
        </button>
      </div>

      <div className="filter-bar">
        <div className="chips">
          <span className="filter-label">场馆：</span>
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
        <div className="chips">
          <span className="filter-label">音栓：</span>
          {stops.map((s) => (
            <button
              key={s}
              className={stopFilter === s ? "chip-active" : ""}
              onClick={() => setStopFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="chips">
          <span className="filter-label">作业技师：</span>
          <select
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
            className="tech-select"
          >
            {TECHNICIANS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showForm && (
        <AddPipeForm
          onAdd={(data) => {
            addPipe(data);
            setShowForm(false);
            pushToast("success", "已新增音管台账记录");
          }}
        />
      )}

      <div className="table-wrap">
        <table className="ledger">
          <thead>
            <tr>
              <th>场馆</th>
              <th>音栓</th>
              <th>音管编号</th>
              <th>音高</th>
              <th>音分偏差</th>
              <th>温/湿度</th>
              <th>簧片状态</th>
              <th>音管状态</th>
              <th>备件申请</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pipe) => {
              const app = activeAppOf(pipe.id);
              const over = deviationOverLimit(pipe.centDeviation);
              return (
                <tr
                  key={pipe.id}
                  className={pipe.status === "waiting_parts" ? "row-waiting" : ""}
                >
                  <td>{pipe.venue}</td>
                  <td>{pipe.stop}</td>
                  <td>{pipe.pipeNo}</td>
                  <td>{pipe.pitch}</td>
                  <td>
                    <span className={over ? "dev-over" : "dev-ok"}>
                      {pipe.centDeviation > 0 ? "+" : ""}
                      {pipe.centDeviation} cent
                    </span>
                  </td>
                  <td>
                    {pipe.temperature}℃ / {pipe.humidity}%
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        color: pipe.reedStatus === "abnormal" ? "#b91c1c" : "#15803d",
                        borderColor: pipe.reedStatus === "abnormal" ? "#fca5a5" : "#86efac",
                      }}
                    >
                      {pipe.reedStatus === "abnormal" ? "异常" : "正常"}
                    </span>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        color: PIPE_STATUS_COLOR[pipe.status],
                        borderColor: PIPE_STATUS_COLOR[pipe.status] + "55",
                      }}
                    >
                      {PIPE_STATUS_LABEL[pipe.status]}
                    </span>
                  </td>
                  <td>
                    {app ? (
                      <span
                        className="badge"
                        style={{
                          color: APP_STATUS_COLOR[app.status],
                          borderColor: APP_STATUS_COLOR[app.status] + "55",
                        }}
                      >
                        {APP_STATUS_LABEL[app.status]}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {pipe.reedStatus === "abnormal" && pipe.status !== "completed" && (
                        <>
                          {(!app || app.status === "rejected") && (
                            <button
                              className="mini primary"
                              onClick={() => handleApply(pipe)}
                            >
                              申请簧片
                            </button>
                          )}
                          <button
                            className="mini danger-outline"
                            onClick={() => handleDirectTake(pipe)}
                            title="绕过审批直接领用（越权，会被拦下）"
                          >
                            直接领用
                          </button>
                        </>
                      )}
                      {pipe.status !== "completed" && (
                        <button
                          className="mini"
                          disabled={!canTune(pipe)}
                          onClick={() => handleTune(pipe)}
                          title={
                            canTune(pipe)
                              ? "定音完成"
                              : "待料音管不算完成：备件未领走"
                          }
                        >
                          定音
                        </button>
                      )}
                      {pipe.status === "completed" && (
                        <span className="muted">✓ 已完成</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="muted" style={{ textAlign: "center" }}>
                  暂无符合条件的音管
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(!online || degraded) && (
        <p className="inline-note">
          {!online && "当前为现场离线模式：出库将以本地预留先占住，回网后与库房对账。"}
          {degraded && " 库房系统故障中：出库将失败，恢复后按申请先后办理。"}
        </p>
      )}
    </section>
  );
}

function AddPipeForm({
  onAdd,
}: {
  onAdd: (data: Omit<Pipe, "id" | "status">) => void;
}) {
  const [venue, setVenue] = useState(VENUES[0]);
  const [stop, setStop] = useState("");
  const [pipeNo, setPipeNo] = useState("");
  const [pitch, setPitch] = useState("");
  const [cent, setCent] = useState(0);
  const [temp, setTemp] = useState(18);
  const [hum, setHum] = useState(50);
  const [reedStatus, setReedStatus] = useState<"normal" | "abnormal">("normal");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!stop.trim() || !pipeNo.trim() || !pitch.trim()) return;
    onAdd({
      venue,
      stop: stop.trim(),
      pipeNo: pipeNo.trim(),
      pitch: pitch.trim(),
      centDeviation: Number(cent) || 0,
      temperature: Number(temp) || 0,
      humidity: Number(hum) || 0,
      reedStatus,
      notes: notes.trim(),
    });
  };

  return (
    <div className="add-form">
      <div className="field-grid">
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
          <span>音栓</span>
          <input value={stop} onChange={(e) => setStop(e.target.value)} placeholder="如 Trumpet 8'" />
        </label>
        <label>
          <span>音管编号</span>
          <input value={pipeNo} onChange={(e) => setPipeNo(e.target.value)} placeholder="如 T-01" />
        </label>
        <label>
          <span>音高</span>
          <input value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="如 C#4" />
        </label>
        <label>
          <span>音分偏差</span>
          <input
            type="number"
            value={cent}
            onChange={(e) => setCent(Number(e.target.value))}
          />
        </label>
        <label>
          <span>温度 (℃)</span>
          <input
            type="number"
            value={temp}
            onChange={(e) => setTemp(Number(e.target.value))}
          />
        </label>
        <label>
          <span>湿度 (%)</span>
          <input
            type="number"
            value={hum}
            onChange={(e) => setHum(Number(e.target.value))}
          />
        </label>
        <label>
          <span>簧片状态</span>
          <select
            value={reedStatus}
            onChange={(e) => setReedStatus(e.target.value as "normal" | "abnormal")}
          >
            <option value="normal">正常</option>
            <option value="abnormal">异常</option>
          </select>
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          <span>维修备注</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="维修备注"
          />
        </label>
      </div>
      <div className="form-actions">
        <button className="primary" onClick={submit}>
          保存音管
        </button>
      </div>
    </div>
  );
}
