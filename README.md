# TonyPi 动作组编辑器

这是一个基于 React 和 Python Agent 的 TonyPi 动作组编辑器。React 负责浏览器界面，`agent/` 是运行在开发机或机器人上的无界面 Python Agent。

## 当前状态

- 支持读取、编辑、保存、删除和合并 `.d6a` 动作组
- 支持新增、更新、插入、删除、移动动作
- 支持动作时间和 18 个舵机值的表格编辑
- 支持 SVG 舵机/关节示意图
- 支持 Mock 硬件实时滑块调节
- 已接入 HiwonderSDK 的真实串口适配器（尚未连接机器人验证）
- 浏览器通过 HTTP JSON 接口连接 Agent

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

在真实机器人上第一次使用前，应先让机器人支撑好，并使用较短动作、较小范围测试。当前动作值会直接按照 `.d6a` 的 `Servo1..Servo18` 写入 SDK；`config/servo_map.json` 中的关节名称和示意位置只是可编辑的显示映射，不会自动改变舵机脉宽方向。
