import type { GroupMeta } from "../../types";

type Props = {
  groups: GroupMeta[];
  selected: string;
  groupName: string;
  onSelect: (name: string) => void;
  onNameChange: (name: string) => void;
  onLoad: () => void;
  onDelete: () => void;
  onMerge: () => void;
  onPlay: (loop: boolean) => void;
  onStop: () => void;
  playing: boolean;
};

export function GroupPanel({ groups, selected, groupName, onSelect, onNameChange, onLoad, onDelete, onMerge, onPlay, onStop, playing }: Props) {
  return (
    <section className="group-panel panel-card">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">ACTION GROUPS</span>
          <h2>动作组</h2>
        </div>
        <span className="muted-caption">{groups.length} FILES</span>
      </div>
      <label className="field-label" htmlFor="group-name">动作组名称</label>
      <input id="group-name" className="text-input" value={groupName} onChange={(event) => onNameChange(event.target.value)} placeholder="例如 bow" />
      <div className="group-list">
        {groups.map((group) => (
          <button key={group.name} className={`group-item ${selected === group.name ? "selected" : ""}`} onClick={() => onSelect(group.name)}>
            <span className="file-icon">D6A</span>
            <span className="group-item-copy"><strong>{group.name}</strong><small>{group.action_count ?? "?"} actions · {group.total_time ?? "?"} ms</small></span>
            <span className="chevron">›</span>
          </button>
        ))}
        {!groups.length && <div className="empty-state small">没有找到 .d6a 动作组</div>}
      </div>
      <div className="group-actions">
        <button className="small-button accent" onClick={onLoad}>打开动作组</button>
        <button className="small-button" onClick={onMerge}>合并</button>
        <button className="small-button danger-outline" onClick={onDelete}>删除文件</button>
      </div>
      <div className="playback-box">
        <div className="playback-title"><span className={`play-dot ${playing ? "running" : ""}`} />播放控制</div>
        <div className="playback-actions">
          <button className="play-button" onClick={() => onPlay(false)} disabled={playing}>▶ 播放一次</button>
          <button className="loop-button" onClick={() => onPlay(true)} disabled={playing}>↻ 循环</button>
          <button className="stop-button" onClick={onStop} disabled={!playing}>■ 停止</button>
        </div>
      </div>
    </section>
  );
}
