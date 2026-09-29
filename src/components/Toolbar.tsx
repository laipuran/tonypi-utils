import type { AgentStatus } from "../types";

type Props = {
  status: AgentStatus | null;
  dirty: boolean;
  groupName: string;
  message: string;
  onNew: () => void;
  onSave: () => void;
  onRefresh: () => void;
  onMockConnect: () => void;
  onSerialConnect: () => void;
  onDisconnect: () => void;
};

export function Toolbar({
  status,
  dirty,
  groupName,
  message,
  onNew,
  onSave,
  onRefresh,
  onMockConnect,
  onSerialConnect,
  onDisconnect,
}: Props) {
  const hardware = status?.hardware;
  return (
    <header className="topbar">
      <div className="brand-mark">TP</div>
      <div className="brand-copy">
        <strong>TonyPi</strong>
        <span>动作组编辑器</span>
      </div>
      <div className="toolbar-divider" />
      <div className="document-title">
        <span className="eyebrow">当前动作组</span>
        <strong>{groupName || "未命名动作组"}{dirty ? " ·" : ""}</strong>
      </div>
      <div className="toolbar-spacer" />
      <div className={`connection-pill ${hardware?.connected ? "online" : "offline"}`}>
        <i />
        {hardware?.connected ? (hardware.mode === "mock" ? "模拟连接" : "舵机已连接") : "未连接"}
      </div>
      <div className="toolbar-actions">
        <button className="ghost-button" onClick={onNew}>新建</button>
        <button className="ghost-button" onClick={onRefresh}>刷新</button>
        <button className="primary-button" onClick={onSave}>保存动作组</button>
        {hardware?.connected ? (
          <button className="danger-button" onClick={onDisconnect}>断开</button>
        ) : (
          <>
            <button className="ghost-button" onClick={onMockConnect}>模拟</button>
            <button className="ghost-button" onClick={onSerialConnect}>串口</button>
          </>
        )}
      </div>
      {message && <div className="toast-message">{message}</div>}
    </header>
  );
}
