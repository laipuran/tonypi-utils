import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, configureAgent, getAgentSettings, type AgentSettings } from "./api";
import { ActionList } from "./features/actions/ActionList";
import { GroupPanel } from "./features/groups/GroupPanel";
import { ServoPanel } from "./features/servo/ServoPanel";
import { blankAction, HEAD_SERVO_DEFAULTS, SERVO_COUNT, type Action, type ActionGroupDocument, type AgentStatus, type GroupMeta } from "./types";
import { Toolbar } from "./components/Toolbar";
import { HeadPanel } from "./features/head/HeadPanel";
import "./styles.css";

function makeDocument(name = "") : ActionGroupDocument {
  return { name, servo_count: SERVO_COUNT, actions: [{ ...blankAction() }] };
}

export default function App() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [groups, setGroups] = useState<GroupMeta[]>([]);
  const [document, setDocument] = useState<ActionGroupDocument>(makeDocument());
  const [groupName, setGroupName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedAction, setSelectedAction] = useState(0);
  const [selectedServo, setSelectedServo] = useState(1);
  const [servoValues, setServoValues] = useState(Array(SERVO_COUNT).fill(500));
  const [headValues, setHeadValues] = useState([...HEAD_SERVO_DEFAULTS]);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("正在连接 Agent…");
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(getAgentSettings());
  const servoTimers = useRef<Record<number, number>>({});
  const headTimers = useRef<Record<number, number>>({});

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage((current) => current === text ? "" : current), 2800);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [nextStatus, nextGroups] = await Promise.all([api.status(), api.groups()]);
      setStatus(nextStatus);
      setGroups(nextGroups);
      setMessage("");
    } catch (error) {
      showMessage(`Agent 未连接：${String(error)}`);
    }
  }, [showMessage]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(async () => {
      try {
        setStatus(await api.status());
      } catch {
        // The toolbar already shows the last known state; avoid noisy popups while offline.
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const currentAction = document.actions[selectedAction];
  const actionValues = currentAction?.servos ?? servoValues;
  const isConnected = Boolean(status?.hardware.connected);
  const isPlaying = Boolean(status?.playback.running);

  const replaceCurrentAction = (servos: number[]) => {
    setDocument((current) => ({
      ...current,
      actions: current.actions.map((action, index) => index === selectedAction ? { ...action, servos: [...servos] } : action),
    }));
    setServoValues([...servos]);
    setDirty(true);
  };

  const changeServo = (id: number, value: number) => {
    const nextValues = [...actionValues];
    nextValues[id - 1] = value;
    setServoValues(nextValues);
    replaceCurrentAction(nextValues);
    setSelectedServo(id);
    if (isConnected) {
      window.clearTimeout(servoTimers.current[id]);
      servoTimers.current[id] = window.setTimeout(() => {
        api.setServo(id, value).catch((error) => showMessage(`舵机控制失败：${String(error)}`));
      }, 35);
    }
  };

  const changeHeadServo = (id: number, value: number) => {
    const nextValues = [...headValues];
    nextValues[id - 1] = value;
    setHeadValues(nextValues);
    if (isConnected) {
      window.clearTimeout(headTimers.current[id]);
      headTimers.current[id] = window.setTimeout(() => {
        api.setHeadServo(id, value).catch((error) => showMessage(`头部控制失败：${String(error)}`));
      }, 35);
    }
  };

  const loadGroup = async (name = selectedGroup) => {
    if (!name) return;
    try {
      const next = await api.load(name);
      setDocument(next);
      setGroupName(next.name);
      setSelectedGroup(next.name);
      setSelectedAction(0);
      setServoValues(next.actions[0]?.servos ?? Array(next.servo_count).fill(500));
      setDirty(false);
      showMessage(`已打开 ${next.name}.d6a`);
    } catch (error) {
      showMessage(`打开失败：${String(error)}`);
    }
  };

  const saveGroup = async () => {
    const name = groupName.trim();
    if (!name) {
      showMessage("请先填写动作组名称");
      return;
    }
    try {
      const saved = await api.save(name, document.actions, document.servo_count);
      setDocument(saved);
      setGroupName(saved.name);
      setSelectedGroup(saved.name);
      setDirty(false);
      await refresh();
      showMessage(`已保存 ${saved.name}.d6a`);
    } catch (error) {
      showMessage(`保存失败：${String(error)}`);
    }
  };

  const selectAction = (index: number) => {
    setSelectedAction(index);
    setServoValues(document.actions[index]?.servos ?? Array(SERVO_COUNT).fill(500));
  };

  const addAction = () => {
    const next: Action = { index: document.actions.length + 1, time: 500, servos: [...actionValues] };
    setDocument((current) => ({ ...current, actions: [...current.actions, next] }));
    setSelectedAction(document.actions.length);
    setDirty(true);
  };

  const updateAction = () => {
    replaceCurrentAction(servoValues);
    showMessage(`已更新动作 ${selectedAction + 1}`);
  };

  const insertAction = () => {
    const next: Action = { index: selectedAction + 1, time: 500, servos: [...actionValues] };
    setDocument((current) => ({ ...current, actions: current.actions.flatMap((action, index) => index === selectedAction ? [next, action] : [action]).map((action, index) => ({ ...action, index: index + 1 })) }));
    setSelectedAction(selectedAction + 1);
    setDirty(true);
  };

  const deleteAction = () => {
    if (!document.actions.length) return;
    const nextActions = document.actions.filter((_, index) => index !== selectedAction).map((action, index) => ({ ...action, index: index + 1 }));
    setDocument((current) => ({ ...current, actions: nextActions }));
    setSelectedAction(Math.max(0, Math.min(selectedAction, nextActions.length - 1)));
    setServoValues(nextActions[Math.max(0, Math.min(selectedAction, nextActions.length - 1))]?.servos ?? Array(SERVO_COUNT).fill(500));
    setDirty(true);
  };

  const moveAction = (direction: -1 | 1) => {
    const target = selectedAction + direction;
    if (target < 0 || target >= document.actions.length) return;
    const next = [...document.actions];
    [next[selectedAction], next[target]] = [next[target], next[selectedAction]];
    setDocument((current) => ({ ...current, actions: next.map((action, index) => ({ ...action, index: index + 1 })) }));
    setSelectedAction(target);
    setServoValues(next[target].servos);
    setDirty(true);
  };

  const changeActionCell = (actionIndex: number, field: "time" | "servo", servoIndex: number, rawValue: number) => {
    setDocument((current) => ({
      ...current,
      actions: current.actions.map((action, index) => {
        if (index !== actionIndex) return action;
        if (field === "time") return { ...action, time: Math.max(20, Math.min(9999, rawValue || 20)) };
        const servos = [...action.servos];
        servos[servoIndex] = Math.max(0, Math.min(1000, rawValue || 0));
        return { ...action, servos };
      }),
    }));
    if (actionIndex === selectedAction) {
      const nextValues = [...actionValues];
      if (field === "servo") nextValues[servoIndex] = Math.max(0, Math.min(1000, rawValue || 0));
      if (field === "servo") setServoValues(nextValues);
    }
    setDirty(true);
  };

  const readPose = async () => {
    try {
      const pose = await api.readPose();
      replaceCurrentAction(pose.servos);
      showMessage("已读取舵机姿态");
    } catch (error) {
      showMessage(`读取姿态失败：${String(error)}`);
    }
  };

  const readHeadPose = async () => {
    try {
      const pose = await api.readHeadPose();
      setHeadValues(pose.servos);
      showMessage("已读取头部姿态");
    } catch (error) {
      showMessage(`读取头部姿态失败：${String(error)}`);
    }
  };

  const centerHead = () => {
    const centered = [...HEAD_SERVO_DEFAULTS];
    setHeadValues(centered);
    if (isConnected) {
      centered.forEach((pulse, index) => {
        api.setHeadServo(index + 1, pulse).catch((error) => showMessage(`头部回中失败：${String(error)}`));
      });
    }
  };

  const center = () => {
    const centered = Array(SERVO_COUNT).fill(500);
    replaceCurrentAction(centered);
    if (isConnected) api.setPose(centered.map((pulse, index) => ({ id: index + 1, pulse }))).catch((error) => showMessage(String(error)));
  };

  const connectHardware = async (mode: "mock" | "serial") => {
    try {
      const hardware = await api.connectHardware(mode, "/dev/ttyAMA0");
      setStatus((current) => current ? { ...current, hardware } : null);
      showMessage(mode === "mock" ? "模拟硬件已连接" : "串口硬件已连接");
    } catch (error) {
      showMessage(`连接失败：${String(error)}`);
    }
  };

  const disconnectHardware = async () => {
    try {
      const hardware = await api.disconnectHardware();
      setStatus((current) => current ? { ...current, hardware } : null);
      showMessage("硬件已断开");
    } catch (error) {
      showMessage(String(error));
    }
  };

  const releaseTorque = async () => {
    if (!window.confirm("释放全部舵机力矩后，机器人可能会失去支撑。确定继续吗？")) return;
    try {
      await api.setTorque(Array.from({ length: SERVO_COUNT }, (_, index) => index + 1), false);
      showMessage("已释放全部舵机力矩");
    } catch (error) {
      showMessage(`释放力矩失败：${String(error)}`);
    }
  };

  const startPlayback = async (loop: boolean) => {
    try {
      await api.play(document.actions, loop);
      setStatus((current) => current ? { ...current, playback: { running: true, loop, action_index: 0 } } : null);
      showMessage(loop ? "开始循环播放" : "开始播放");
    } catch (error) {
      showMessage(`播放失败：${String(error)}`);
    }
  };

  const stopPlayback = async () => {
    await api.stopPlayback().catch(() => undefined);
    setStatus((current) => current ? { ...current, playback: { running: false, loop: false, action_index: null } } : null);
    showMessage("已停止播放");
  };

  const removeGroup = async () => {
    if (!selectedGroup || !window.confirm(`确定删除 ${selectedGroup}.d6a？`)) return;
    try {
      await api.remove(selectedGroup);
      setSelectedGroup("");
      setDocument(makeDocument());
      setGroupName("");
      await refresh();
      showMessage("动作组已删除");
    } catch (error) {
      showMessage(`删除失败：${String(error)}`);
    }
  };

  const mergeGroups = async () => {
    const second = window.prompt("输入要合并的第二个动作组名称", groups.find((group) => group.name !== selectedGroup)?.name ?? "");
    if (!selectedGroup || !second) return;
    const target = window.prompt("输入合并后的动作组名称", `${selectedGroup}_${second}`);
    if (!target) return;
    try {
      const merged = await api.merge(selectedGroup, second, target);
      setDocument(merged);
      setGroupName(merged.name);
      setSelectedGroup(merged.name);
      setSelectedAction(0);
      setServoValues(merged.actions[0]?.servos ?? Array(SERVO_COUNT).fill(500));
      setDirty(false);
      await refresh();
      showMessage(`已合并为 ${merged.name}.d6a`);
    } catch (error) {
      showMessage(`合并失败：${String(error)}`);
    }
  };

  const updateAgent = async () => {
    const url = window.prompt("Agent HTTP 地址", agentSettings.url) ?? agentSettings.url;
    if (!/^https?:\/\/[^\s/]+(?::\d+)?(?:\/[^\s]*)?$/.test(url)) {
      showMessage("Agent 地址必须是有效的 http:// 或 https:// 地址");
      return;
    }
    const token = window.prompt("Agent 令牌（可留空）", agentSettings.token) ?? agentSettings.token;
    setAgentSettings({ url, token });
    configureAgent(url, token);
    await refresh();
  };

  const title = useMemo(() => groupName || "未命名动作组", [groupName]);

  return (
    <div className="app-shell">
      <Toolbar
        status={status}
        dirty={dirty}
        groupName={title}
        message={message}
        onNew={() => { setDocument(makeDocument()); setGroupName(""); setSelectedGroup(""); setSelectedAction(0); setServoValues(Array(SERVO_COUNT).fill(500)); setHeadValues([...HEAD_SERVO_DEFAULTS]); setDirty(false); }}
        onSave={saveGroup}
        onRefresh={refresh}
        onMockConnect={() => connectHardware("mock")}
        onSerialConnect={() => connectHardware("serial")}
        onDisconnect={disconnectHardware}
      />
      <main className="workspace">
        <aside className="left-column">
          <HeadPanel values={headValues} connected={isConnected} onChange={changeHeadServo} onRead={readHeadPose} onCenter={centerHead} />
          <ServoPanel values={actionValues} selected={selectedServo} connected={isConnected} onSelect={setSelectedServo} onChange={changeServo} onReadPose={readPose} onCenter={center} onStop={() => api.stopHardware().catch(() => undefined)} onReleaseTorque={releaseTorque} />
        </aside>
        <section className="center-column">
          <ActionList actions={document.actions} selected={selectedAction} onSelect={selectAction} onAdd={addAction} onUpdate={updateAction} onInsert={insertAction} onDelete={deleteAction} onMove={moveAction} onCellChange={changeActionCell} />
          <div className="hint-bar"><span className="hint-icon">i</span><span>动作值范围 0–1000 · 动作时间 20–9999 ms · 选中动作后可通过左侧滑块实时调整</span><button className="link-button" onClick={updateAgent}>Agent 设置</button></div>
        </section>
        <aside className="right-column">
          <GroupPanel groups={groups} selected={selectedGroup} groupName={groupName} onSelect={setSelectedGroup} onNameChange={setGroupName} onLoad={() => loadGroup()} onDelete={removeGroup} onMerge={mergeGroups} onPlay={startPlayback} onStop={stopPlayback} playing={isPlaying} />
          <section className="status-card panel-card">
            <div className="panel-heading compact"><div><span className="eyebrow">SYSTEM</span><h2>运行状态</h2></div></div>
            <div className="status-row"><span>Agent</span><strong className={status ? "status-good" : "status-bad"}>{status ? "在线" : "离线"}</strong></div>
            <div className="status-row"><span>动作目录</span><code>{status?.action_dir ?? "—"}</code></div>
            <div className="status-row"><span>舵机连接</span><strong>{isConnected ? `${status?.hardware.mode}` : "未连接"}</strong></div>
          </section>
        </aside>
      </main>
    </div>
  );
}
