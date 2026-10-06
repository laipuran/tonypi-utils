# 在 TonyPi 真机上运行 Agent

本指南说明如何把 Python Agent 部署到 TonyPi 机器人，并让浏览器中的动作组编辑器通过局域网连接它。Agent 应运行在连接舵机控制板的机器人上；网页界面可以运行在另一台电脑上。

当前仓库已接入 HiwonderSDK 串口适配器，但尚未完成真机验证。首次使用必须先固定并支撑好机器人，再用短动作、小幅度测试。

## 准备机器人目录

将本项目复制或克隆到机器人上，并确认机器人上的 TonyPi 根目录至少包含：

```text
/home/ubuntu/TonyPi/HiwonderSDK/hiwonder/ros_robot_controller_sdk.py
/home/ubuntu/TonyPi/ActionGroups/
```

Agent 的 `--root` 参数必须指向 TonyPi 根目录，而不是 `HiwonderSDK` 或 `ActionGroups` 子目录。Agent 会从该目录加载 SDK，并在 `ActionGroups/` 中读取和保存 `.d6a` 动作组。

确认串口设备存在：

```bash
ls -l /dev/ttyAMA0
```

如果设备名与此不同，后续命令中的 `--device` 必须使用实际设备路径。运行 Agent 的 Linux 用户还必须有权访问该串口。

## 在机器人上启动 Agent

在机器人上进入本项目根目录，替换项目路径、令牌和网页来源地址后启动：

```bash
cd /home/ubuntu/tonypi-utils

python3 agent/main.py \
  --root /home/ubuntu/TonyPi \
  --hardware serial \
  --device /dev/ttyAMA0 \
  --bind 0.0.0.0 \
  --port 8765 \
  --token '替换为长随机令牌' \
  --cors-origin 'http://127.0.0.1:1420'
```

Agent 绑定到 `0.0.0.0` 才能接受局域网中其他设备的请求，因此必须设置 `--token`。默认 CORS 来源是 `http://127.0.0.1:1420`；如果网页不是从这个地址打开，就将 `--cors-origin` 改成浏览器地址栏中的完整来源（协议、主机和端口），例如 `http://192.168.1.50:1420`。来源地址不包含路径。

`--hardware serial` 选择真实串口适配器，但不会在 Agent 启动时立即连接控制板。连接步骤在网页中完成。

## 从网页连接 Agent

让运行网页的电脑与机器人接入同一个局域网，然后在机器人上查出它的 IP 地址。在网页中点击 **Agent 设置**，填写：

- **Agent HTTP 地址**：`http://<机器人IP>:8765`，例如 `http://192.168.1.20:8765`
- **Agent 令牌**：启动 Agent 时传入的同一个令牌

保存设置后，点击页面顶部的 **串口** 按钮。连接成功后，状态应显示“舵机已连接”。

可以先从运行网页的电脑检查网络和 Agent：

```bash
curl http://<机器人IP>:8765/api/health
```

成功时会返回包含 `"ok": true` 的 JSON。此检查只验证 Agent 的 HTTP 服务可达，不会连接舵机。

## 常见问题

- **找不到 HiwonderSDK 模块**：检查 `--root` 指向的目录是否包含 `HiwonderSDK/hiwonder/ros_robot_controller_sdk.py`。
- **串口无法打开或权限被拒绝**：确认 `--device` 路径正确，并检查运行 Agent 的用户是否有该设备的访问权限。
- **浏览器无法连接或提示 CORS 错误**：确认电脑能访问机器人 IP，并让 `--cors-origin` 与浏览器地址栏中的网页来源完全一致。
- **提示令牌错误**：确认网页“Agent 设置”中的令牌与启动命令中的 `--token` 完全一致。

如果网页也需要通过局域网中的手机或其他设备访问，前端开发服务器必须监听局域网接口，并且 `--cors-origin` 必须使用该设备实际访问网页时的来源地址。不要把 Agent 端口开放到公网；令牌通过普通 HTTP 发送，只应在可信的 TonyPi 局域网内使用。

## 真机安全

第一次操作前，先支撑好机器人，避免跌落或关节碰撞。先检查当前姿态，再使用短动作和小幅度变化验证；确认舵机编号、方向和动作范围无误后再扩大测试范围。不要在机器人未固定时直接播放较大的动作组。
