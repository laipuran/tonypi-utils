import { defaultServoNames } from "../../types";
import { CommitNumberInput } from "../../components/CommitNumberInput";

type Props = {
  values: (number | null)[];
  availableCount: number;
  selected: number;
  connected: boolean;
  onSelect: (id: number) => void;
  onChange: (id: number, value: number) => void;
  onReadPose: () => void;
  onStand: () => void;
  onApplyAction: () => void;
  onSavePose: () => void;
  onStop: () => void;
  onReleaseTorque: () => void;
};

export function ServoPanel({ values, availableCount, selected, connected, onSelect, onChange, onReadPose, onStand, onApplyAction, onSavePose, onStop, onReleaseTorque }: Props) {
  return (
    <section className="servo-panel panel-card">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">SERVO CONTROL</span>
          <h2>舵机操作</h2>
        </div>
        <span className="servo-count">18 DOF</span>
      </div>
      <div className="servo-actions">
        <button className="small-button" disabled={!connected} onClick={onReadPose}>读取姿态</button>
        <button className="small-button" disabled={!connected} onClick={onStand}>站立姿态</button>
        <button className="small-button accent" disabled={!connected} onClick={onApplyAction}>置位选中动作</button>
        <button className="small-button" disabled={!connected} onClick={onSavePose}>保存位姿</button>
        <button className="small-button stop-button" disabled={!connected} onClick={onStop}>停止</button>
        <button className="small-button torque-button" disabled={!connected} onClick={onReleaseTorque}>释放力矩</button>
      </div>
      <div className="servo-list">
        {values.map((value, index) => {
          const id = index + 1;
          const unavailable = id > availableCount || value == null;
          return (
            <div key={id} className={`servo-row ${selected === id ? "active" : ""} ${unavailable ? "unavailable" : ""}`} onClick={() => onSelect(id)}>
              <div className="servo-label">
                <span className="servo-id">{String(id).padStart(2, "0")}</span>
                <span>{defaultServoNames[index] ?? `舵机 ${id}`}</span>
                {unavailable && <small>不可用</small>}
              </div>
              <input
                aria-label={`舵机 ${id}`}
                type="range"
                min="0"
                max="1000"
                value={value ?? 0}
                disabled={!connected || unavailable}
                onChange={(event) => onChange(id, Number(event.target.value))}
              />
              <CommitNumberInput
                className="pulse-input"
                min={0}
                max={1000}
                value={value}
                disabled={!connected || unavailable}
                ariaLabel={`舵机 ${id}`}
                onCommit={(next) => onChange(id, next)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
