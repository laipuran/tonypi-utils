import { defaultServoNames } from "../../types";

type Props = {
  values: number[];
  selected: number;
  connected: boolean;
  onSelect: (id: number) => void;
  onChange: (id: number, value: number) => void;
  onReadPose: () => void;
  onCenter: () => void;
  onStop: () => void;
  onReleaseTorque: () => void;
};

export function ServoPanel({ values, selected, connected, onSelect, onChange, onReadPose, onCenter, onStop, onReleaseTorque }: Props) {
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
        <button className="small-button" disabled={!connected} onClick={onCenter}>回中 500</button>
        <button className="small-button stop-button" disabled={!connected} onClick={onStop}>停止</button>
        <button className="small-button torque-button" disabled={!connected} onClick={onReleaseTorque}>释放力矩</button>
      </div>
      <div className="servo-list">
        {values.map((value, index) => {
          const id = index + 1;
          return (
            <div key={id} className={`servo-row ${selected === id ? "active" : ""}`} onClick={() => onSelect(id)}>
              <div className="servo-label">
                <span className="servo-id">{String(id).padStart(2, "0")}</span>
                <span>{defaultServoNames[index] ?? `舵机 ${id}`}</span>
              </div>
              <input
                aria-label={`舵机 ${id}`}
                type="range"
                min="0"
                max="1000"
                value={value}
                onChange={(event) => onChange(id, Number(event.target.value))}
              />
              <input
                className="pulse-input"
                type="number"
                min="0"
                max="1000"
                value={value}
                onChange={(event) => onChange(id, Math.max(0, Math.min(1000, Number(event.target.value) || 0)))}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
