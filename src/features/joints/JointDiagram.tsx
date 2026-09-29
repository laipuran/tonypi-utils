import { defaultServoNames } from "../../types";

type Props = {
  values: number[];
  selected: number;
  onSelect: (id: number) => void;
};

const joints = [
  [9, 150, 113], [10, 150, 158], [11, 150, 204], [12, 150, 246], [13, 150, 289],
  [14, 150, 332], [15, 150, 374], [16, 150, 416], [1, 222, 71], [2, 222, 99],
  [3, 191, 132], [4, 178, 178], [5, 164, 220], [6, 253, 132], [7, 266, 178],
  [8, 280, 220], [17, 210, 246], [18, 234, 246],
] as const;

export function JointDiagram({ values, selected, onSelect }: Props) {
  return (
    <section className="joint-card panel-card">
      <div className="panel-heading compact">
        <div>
          <span className="eyebrow">JOINT MAP</span>
          <h2>舵机与关节</h2>
        </div>
        <span className="muted-caption">点击编号定位</span>
      </div>
      <div className="joint-diagram">
        <svg viewBox="0 0 440 470" role="img" aria-label="TonyPi 舵机编号示意图">
          <path className="robot-outline" d="M220 43 L257 76 L257 110 L288 124 L300 213 L267 238 L282 360 L319 430 L275 430 L220 362 L165 430 L121 430 L158 360 L173 238 L140 213 L152 124 L183 110 L183 76 Z" />
          <path className="robot-line" d="M183 110 L220 125 L257 110 M173 238 L220 253 L267 238 M220 125 L220 253 L220 362 M173 238 L140 213 M267 238 L300 213" />
          <circle className="robot-head" cx="220" cy="82" r="32" />
          {joints.map(([id, x, y]) => (
            <g key={id} className={`joint-node ${selected === id ? "selected" : ""}`} onClick={() => onSelect(id)}>
              <circle cx={x} cy={y} r="15" />
              <text x={x} y={y + 4} textAnchor="middle">{id}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="joint-readout">
        <span>{defaultServoNames[selected - 1] ?? `舵机 ${selected}`}</span>
        <strong>{values[selected - 1] ?? 500}</strong>
        <span className="unit">pulse</span>
      </div>
    </section>
  );
}
