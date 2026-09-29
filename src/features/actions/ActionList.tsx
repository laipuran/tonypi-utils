import type { Action } from "../../types";

type Props = {
  actions: Action[];
  selected: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onUpdate: () => void;
  onInsert: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onCellChange: (actionIndex: number, field: "time" | "servo", servoIndex: number, value: number) => void;
};

export function ActionList({ actions, selected, onSelect, onAdd, onUpdate, onInsert, onDelete, onMove, onCellChange }: Props) {
  return (
    <section className="action-card panel-card">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">ACTION TIMELINE</span>
          <h2>动作列表</h2>
        </div>
        <span className="muted-caption">{actions.length} 个动作 · {actions.reduce((sum, action) => sum + action.time, 0)} ms</span>
      </div>
      <div className="action-toolbar">
        <button className="small-button accent" onClick={onAdd}>＋ 添加动作</button>
        <button className="small-button" onClick={onUpdate}>更新</button>
        <button className="small-button" onClick={onInsert}>插入</button>
        <button className="small-button" onClick={onDelete}>删除</button>
        <span className="toolbar-spacer" />
        <button className="icon-button" title="上移" onClick={() => onMove(-1)}>↑</button>
        <button className="icon-button" title="下移" onClick={() => onMove(1)}>↓</button>
      </div>
      <div className="table-scroll">
        <table className="action-table">
          <thead>
            <tr>
              <th className="sticky-col">#</th>
              <th>TIME</th>
              {actions[0]?.servos.map((_, index) => <th key={index}>S{index + 1}</th>)}
            </tr>
          </thead>
              <tbody>
            {actions.map((action, index) => (
              <tr key={`${action.index}-${index}`} className={selected === index ? "selected" : ""} onClick={() => onSelect(index)}>
                <td className="sticky-col action-number">{String(index + 1).padStart(2, "0")}</td>
                <td className="time-cell"><input className="table-input time-input" type="number" min="20" max="9999" value={action.time} onClick={(event) => event.stopPropagation()} onChange={(event) => onCellChange(index, "time", -1, Number(event.target.value))} /></td>
                {action.servos.map((value, servoIndex) => <td key={servoIndex}><input className="table-input" type="number" min="0" max="1000" value={value} onClick={(event) => event.stopPropagation()} onChange={(event) => onCellChange(index, "servo", servoIndex, Number(event.target.value))} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!actions.length && <div className="empty-state">动作组为空，点击“添加动作”开始编排。</div>}
      </div>
    </section>
  );
}
