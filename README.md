# TonyPi 动作组编辑器

这是一个基于 React 和 Python Agent 的 TonyPi 动作组编辑器。React 负责浏览器界面，`agent/` 是运行在开发机或机器人上的无界面 Python Agent。

## 当前状态

- 支持读取、编辑、保存、删除和合并 `.d6a` 动作组
- 支持新增、插入、删除、移动动作
- 支持动作时间和 18 个舵机值的表格编辑
- 支持 Mock 硬件实时滑块调节
- 支持独立的 PWM 头部控制（PWM 1 上下、PWM 2 左右）
- 新建动作默认使用内置的站立姿态参数，不依赖 `stand.d6a`
- 舵机操作区表示实时机器人姿态，可将选中动作置位或保存回选中动作
- 真实串口模式下兼容当前仅有 1–16 路总线舵机的设备，17、18 路读取失败不会中断
- 已接入 HiwonderSDK 的真实串口适配器（尚未连接机器人验证）
- 浏览器通过 HTTP JSON 接口连接 Agent

### SDK 对接说明

串口适配器按当前 HiwonderSDK 实现调用：总线舵机使用 `bus_servo_*` 接口，头部使用独立的 `pwm_servo_set_position(seconds, [[id, pulse]])` 和 `pwm_servo_read_position(id)` 接口。开发机测试覆盖了这些调用的参数形状和时间单位；真机仍需在安全支撑条件下进行首次验证。

## 开发机离线运行

终端一：启动 Agent，使用本地 `../TonyPi` 动作组目录和模拟硬件：

```bash
python3 agent/main.py --root ../TonyPi --hardware mock
```

终端二：启动 React 开发服务器：

```bash
npm run dev
```

浏览器打开 `http://127.0.0.1:1420`，点击顶部“刷新”，然后点击“模拟”连接 Mock 硬件。动作组默认来自：

```text
../TonyPi/ActionGroups
```

## 机器人部署方式

机器人上启动 Agent：

```bash
python3 agent/main.py \
  --root /home/ubuntu/TonyPi \
  --hardware serial \
  --device /dev/ttyAMA0 \
  --bind 0.0.0.0 \
  --port 8765 \
  --token 'change-this-token'
```

浏览器中通过“Agent 设置”填写完整 HTTP 地址，例如 `http://192.168.1.20:8765`。远程使用时应设置访问令牌，并只在 TonyPi 局域网中开放端口。
Agent 默认只允许来自 `http://127.0.0.1:1420` 的浏览器页面；如果前端部署在其他地址，可增加 `--cors-origin http://你的前端地址`。

## 验证

```bash
python3 -m unittest discover -s agent -v
npm run build
```

## 重要安全说明

在真实机器人上第一次使用前，应先让机器人支撑好，并使用较短动作、较小范围测试。动作文件保留 `.d6a` 的 `Servo1..Servo18` 结构，但串口硬件会跳过当前不可用的 17、18 路；`config/servo_map.json` 中的名称只是显示映射，不会自动改变舵机脉宽方向。
