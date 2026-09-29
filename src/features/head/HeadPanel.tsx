type Props = {
  values: number[];
  connected: boolean;
  onChange: (id: number, value: number) => void;
  onRead: () => void;
  onCenter: () => void;
};

const controls = [
  { id: 1, name: "头部上下", hint: "PWM 1 · 俯仰" },
  { id: 2, name: "头部左右", hint: "PWM 2 · 水平" },
];

export function HeadPanel({ values, connected, onChange, onRead, onCenter }: Props) {
  return (
    <section className="head-panel panel-card">
      <div className="panel-heading compact">
        <div>
          <span className="eyebrow">HEAD PWM CONTROL</span>
          <h2>头部控制</h2>
        </div>
        <span className="servo-count">PWM 1–2</span>
      </div>
      <div className="head-actions">
        <button className="small-button" disabled={!connected} onClick={onRead}>读取头部</button>
        <button className="small-button" disabled={!connected} onClick={onCenter}>头部回中</button>
      </div>
      <div className="head-list">
        {controls.map((control) => {
          const value = values[control.id - 1] ?? 1500;
          return (
            <div className="head-row" key={control.id}>
              <div className="head-label">
                <span className="servo-id">PWM {control.id}</span>
                <strong>{control.name}</strong>
                <small>{control.hint}</small>
              </div>
              <input
                aria-label={control.name}
                type="range"
                min="500"
                max="2500"
                value={value}
                disabled={!connected}
                onChange={(event) => onChange(control.id, Number(event.target.value))}
              />
              <input
                className="pulse-input"
                type="number"
                min="500"
                max="2500"
                value={value}
                disabled={!connected}
                onChange={(event) => onChange(control.id, Math.max(500, Math.min(2500, Number(event.target.value) || 500)))}
              />
            </div>
          );
        })}
      </div>
      <div className="head-note">头部 PWM 与动作组中的 18 路总线舵机相互独立</div>
    </section>
  );
}
