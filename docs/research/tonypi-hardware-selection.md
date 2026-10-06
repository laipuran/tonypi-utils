# TonyPi 头部舵机、扩展板与供电选型调查

## 结论与确证程度

**官方当前 TonyPi/TonyPi Pro 配置的头部型号指向两只 LFD-01M，树莓派 5 平台配套 B 型扩展板；官方板卡照片可以读到 `RasAdapter5B V1.0`，PWM 插座标为 `5V`。** 其中 LFD-01M 与头部的对应来自整机型号表、16 个身体总线舵机加 2 自由度头部的说明、头部 PWM 1/2 源码和官方硬件资料目录的交叉佐证，不是获得了逐关节型号 BOM。上述结论不能直接证明用户机器的批次、替换件或实际板卡版本。[R1、R2、R5、R6、S1、S2]

**新找到的型号级官方 LFD-01M 数据手册和用户手册仍没有规定信号丢失时释放力矩，也没有规定零脉宽是卸载。** 官方通用舵机教程甚至声称数字舵机收到一次 PWM 后可以保持位置；这不能代替型号级失效保护规范，却进一步说明不能默认“停发脉冲就松力矩”。新版板卡下载资料公开的是主机 Python SDK/示例，检查到的 PWM 方法没有逐通道输出禁用接口；本调查没有获得匹配 `RasAdapter5B` 的 MCU 命令处理固件。[R7、R8、R9、R10、S1]

调查日期：2026-10-06。保留原有 [head-pwm-torque.md](head-pwm-torque.md)，仅新增本文；没有修改控制代码、执行下载的程序、连接机器人或做真机实验。PDF、目录 HTML 与只读源码下载到 `/tmp/opencode/tonypi-hardware/`，这些临时文件不是项目交付物。

## 版本必须拆成三个维度

文档站的 `TonyPi v1.0`/较新的 TonyPi & TonyPi Pro 文档、教程的 `2024 Version`/`2025 Version`、硬件丝印的 `RasAdapter4…`/`RasAdapter5…` 不是同一套版本号。**Pro 首先是机器功能/套件区别，不是板卡代际。** 新官方版本配置工具明确把 TonyPi 定义为无开合手掌、TonyPi Pro 定义为有开合手掌；同一新版文档涵盖两者。[R3、R4]

| 范围 | 官方已确认 | 尚不能确认 |
| --- | --- | --- |
| 旧文档入口 `projects/TonyPi`，教程 2024 | 官方版本指南：树莓派 4B 主控 + 树莓派 4B 扩展板；丝印前缀 `RasAdapter4` | 用户机器是否属于此代；实际 B 型后缀、PCB 修订号和头部舵机批次 |
| 教程 2025 | 官方版本指南：树莓派 5 扩展板，兼容树莓派 4B **或** 5；丝印前缀 `RasAdapter5` | 不能只看到树莓派 4B 就判成旧板 |
| 新版 TonyPi / TonyPi Pro，树莓派 5 平台 | 官方板卡教程明确对应 B 型；照片为 `RasAdapter5B V1.0`；B 型 2 路 PWM、6 个总线插座、IMU | 不能保证所有出货板均为 V1.0；MCU 精确料号、固件版本没有确证 |
| 当前在售 TonyPi / TonyPi Pro | 产品参数列 `LX-824HV` / `LFD-01M`；TonyPi 身体 16 个总线舵机 + 头部 2 DOF；Pro 增加开合手掌 | 未获取覆盖所有历史版本的逐关节 BOM，不能回推旧机器配置 |

版本表依据：[R1–R6]。官方《Tony Pi Raspberry Pi 5 Update Instruction》另称自 **2024-03-15** 起提供 4B/5 主控版本，旧板采用 I2C/GPIO 控制，新板采用 32 位 ARM 主控及 CRC 通信。这也说明“2025 教程”不是硬件首次发布年份。[R4：第 1、3–4 页]

### 最可靠的机器身份线索

官方版本指南要求看扩展板丝印；它还提供出厂热点/远程桌面密码和壁纸作辅助线索，但这些软件设置可被修改，优先级低于板卡实物丝印。下一步只需获得用户已有的采购清单或断电状态照片/标签，不需要安排运动或信号实验。[R3]

## 头部两只 PWM 舵机的型号证据链

当前 TonyPi 产品页列 `LX-824HV bus servo / LFD-01M anti-blocking servo`，说明身体为 16 个总线舵机、头部 2 DOF；官方 `RPCServer.py` 的头部 PWM 接口只接受通道 1、2，`Functions/Follow.py` 回中也写这两路。新版下载包 `4. Hardware Materials` 则只列出 LFD-01M、LX-824HV 和超声波模块，其中 LFD-01M 快捷方式确实展开为该型号教程/数据手册目录。因此当前标准选型“头部 LFD-01M ×2”有很强的一手交叉证据，但仍标为**版本相关、非用户实机确证**。[R1、R5、S2、S3]

官网 Getting Ready 的 Package List 是整机包装清单，不是机器人内部 BOM。已检查到的维修 PDF《Troubleshoot Malfunctional Servo on TonyPi and Solution》针对 16 路身体舵机、各肢体的总线串接和维修注意事项，没有给出两只头部舵机的替换型号。旧版扩展板课程用 **LFD-01** 作通用示例，且含 ArmPi Pro 路径，不能当成 TonyPi 头部使用 LFD-01 的证据。**LFD-01 与 LFD-01M 不应混写。**[R11、R12、R13]

### LFD-01M 型号级参数

下面参数直接来自官方 `LFD-01M Digital Servo Datasheet V1.0`，不是其他机器的同名舵机摘录。[R7]

| 项目 | 参数 | PDF 页码 |
| --- | --- | --- |
| 工作电压 | 4.8–6 V | 2 |
| 无负载电流 / 堵转电流 | 50 mA / 700 mA | 2–3 |
| 堵转力矩 | 1.5 kg·cm @4.8 V；1.8 kg·cm @6 V | 2–3 |
| 控制方式 | PWM，500–2500 μs，中位 1500 μs | 3 |
| 转角 / 输入频率 | 0–180°；50–330 Hz | 3 |
| 接线 | 黄色 Signal/PWM、红色 VCC、棕色 GND | 3–4 |
| 重量 / 尺寸 | 14 g；22.3 ×12.0 ×23.2 mm（手册所列尺寸口径） | 2 |

型号用户手册要求 20 ms 周期，重复说明 500–2500 μs 对应 0–180°；数据手册给出更宽的 50–330 Hz 参数范围。这里保留来源的不同表述，不把允许频率范围当作 TonyPi 实际输出频率。尺寸也不替代带安装耳/输出轴的尺寸图，应按对应图纸核对机械安装。[R7、R8]

## 控制板选型：B 型已找到，精确 MCU/固件未找到

官方树莓派 5 扩展板教程第 1.1 节明确列出 TonyPi、TonyPi Pro、SpiderPi、SpiderPi Pro 使用 **B 型**；A 型主要面向车/机械臂，C 型面向 PuppyPi 且没有总线接口。B 型有 6 个总线舵机接口、2 路 PWM、风扇、2 路 I2C、2 路 GPIO、蜂鸣器、两个按键和六轴 IMU；“6 个总线接口”不是最多只能控制 6 个总线舵机。[R6]

同一教程官方 PDF 第 4 页照片的丝印为 **`RasAdapter5B V1.0`**。这已经比“ROS robot controller”文件名更具体；不能因 SDK 叫 `ros_robot_controller_sdk.py` 就认定 TonyPi 装了另售的 ROS Robot Control Board。官方产品页将树莓派 5 扩展板处理器描述为 Cortex-M3 32 位 ARM；检查到的照片不足以可靠读取芯片完整料号，因此这里不猜 STM32F103 的具体封装/容量。[R6、R14、S1]

公开 SDK 的 PWM 注释写通道 1–4，但 B 型实物/教程只有 2 路 PWM，说明该 SDK 含通用板卡代码，**不能用 SDK 可编码的通道数推算 B 型物理接口数**。新版板卡课程的某些演示还说“6 路 PWM”，这是通用/A 型示例，不覆盖 B 型专门介绍。[R6、R9、R10、S1：29–32]

## 电源路径：已定位 5 V PWM 接口，仍缺原理图

新版官方资料支持的路径是：**11.1 V 电池 → 扩展板电池接线端子/电源开关 → 板上低压供电 → 标为 5 V 的 PWM 接口 → LFD-01M 红线**；树莓派也由扩展板供电，12.6 V 充电器接扩展板充电口。B 型 PDF 照片在 PWM 排针处可读到 `S 5V -`，与 LFD-01M 的 4.8–6 V 规格匹配。这里的板上低压供电是从输入/输出电压及板卡照片作出的路径推断，**不是已获得稳压器电路或逐网连接图**。[R1、R6：第 4–5 页、R7、R12]

| 供电层 | 已确认 | 未确认 |
| --- | --- | --- |
| 整机电池 | 当前产品参数 11.1 V、2000 mAh、10C；官方开机文档整机工作范围 9–12.6 V | 用户实际电池规格/健康状态 |
| 充电 | 12.6 V 充电器接扩展板充电口；维修 PDF 称配套充电器 12.6 V 2 A | 开关各档与充电/输出的完整电路关系 |
| 新板 PWM | `RasAdapter5B V1.0` 照片 PWM 排针标 5 V；LFD-01M 4.8–6 V | PWM 5 V 电源与 Pi 5 V 是否同一稳压轨、最大电流、负载开关、是否有软件开关 |
| 新板总线 | 高压 LX-824HV 与低压 PWM 是不同负载规格 | 总线电源是否直接接电池、保护/开关拓扑；不能只凭照片宣称已确证 |
| 旧板课程 | 通用旧扩展板 PWM 1–4 为 5 V，5–6 与外部输入同电压 | 这些课程不能证明所有旧 TonyPi 实物都装同一种板，必须看实际接口 |

电源表依据：[R1、R6–R8、R12–R13]。**不要将 11.1/12.6 V 电池或充电电压直接施加给 LFD-01M；也不能把关闭 PWM 信号当成关闭红线供电。**旧板 Notice 对输入电压 PWM 口的表格有将正极写成“5V”的矛盾，专门的 PWM 课程正文明确 5–6 路跟随输入电压；本文保留这一资料质量边界。[R8、R13]

## 零脉宽、禁用输出与失去信号行为

新版板卡下载目录 `board_demo` 有独立官方 Python SDK。只读核查其 `pwm_servo_set_position`，位置仍编码为 `struct.pack('<BH', id, pulse)`，PWM 子命令 `0x01`；可表示 0，但没有赋予 0“关闭”含义。PWM 公开接口仍只有位置、偏差、读取；有卸载方法的是总线舵机。没有获得 MCU 的 PWM 命令处理器、定时器配置、PWM enable 或电源开关代码，故不能判断 MCU 对 0 是拒绝、限幅、忽略还是停止输出。[R10：354–384；S1：356–386]

LFD-01M 手册和数据手册均未写 `0 μs`、信号丢失超时、掉信号保持/卸载、恢复信号目标策略。通用 Servo Selection Manual 的 FAQ 3.1 和新版扩展板课 2.6.5 声称数字舵机单次信号即可保持位置，但没有绑定 LFD-01M 的特定内部固件，也没有给出失去输入后的时限。因此本次更深入资料仍不能确认“0/停 PWM 能释放这两只头部舵机”。[R7–R9、R15]

新版 TonyPi 附录的 `Firmware Flashing Tool` 名称容易误导：目录实际出现 `ci-tool`、`libmp3lame`、`PACK_UPDATE_TOOL` 等文件，没有看到 RasAdapter5B 的板卡固件/协议。不能把这个目录名当成已找到匹配板卡固件；也没有下载或执行其中的可执行文件。新版 `3. Source Code & System Image` 当前只显示 `Important Notice 25.pdf`，附录要求凭订单联系 support 获取镜像/源码；不能把整机 Python“开源”宣传扩大成 MCU 固件已公开。[R16、R17]

## 可复核官方来源

Google Drive 文件均从 Hiwonder 官方文档链接的目录继续进入；PDF 用 `https://drive.google.com/uc?export=download&id=<文件ID>` 下载，并用 `pdftotext`/页面渲染只读检查，没有执行下载内容。

- **R1**：[TonyPi 当前产品页](https://www.hiwonder.com/products/tonypi)，产品参数、18 DOF 结构说明。直接抓取受限，依据搜索工具返回的该官方页正文。
- **R2**：[TonyPi Pro 当前产品页](https://www.hiwonder.com/products/tonypi-pro)，产品参数；同上。
- **R3**：旧官方 [TonyPi 文档下载入口](https://docs.hiwonder.com/projects/TonyPi/en/latest/) → [总目录](https://drive.google.com/drive/folders/1Yo69FSOeFzGTlrr88d8FpKwNurD5-W56) → [2024/2025 版本指南 PDF](https://drive.google.com/file/d/1K9wSg90TKdCXSpcs8fpu37GN1KjYAUrm/view)，第 1–2 页，丝印与教程兼容关系。
- **R4**：上述总目录 → [2025 Version](https://drive.google.com/drive/folders/1aDX9m4dppOnr5t-l15zva6KiDJf7VKXo) → [Tony Pi Raspberry Pi 5 Update Instruction PDF](https://drive.google.com/file/d/1-uV6qqAoYRgSu0pCsrOy4V_r4fbemfM_/view)；以及[新版机器版本配置说明 3.3](https://docs.hiwonder.com/projects/TonyPi_Pro/en/latest/docs/3_remote_desktop_tool_installation_and_connection.html#overview-of-the-robot-version-configuration-tool)。
- **R5**：[新版 TonyPi 下载](https://drive.google.com/drive/folders/1EJppBKT0G0KF8uXjyMVlsAD1MwwAzq_2) → [4. Hardware Materials](https://drive.google.com/drive/folders/1J6ANk5-2mBHxJPEbm_WTOjKvNd9gj8e7) → [LFD-01M 快捷目录](https://drive.google.com/drive/folders/11bijnzjhQNy2ssBvNAGlDbuzC0mzw9av)。入口来自[新版官方首页](https://docs.hiwonder.com/projects/TonyPi_Pro/en/latest/)，该页还分别链接 TonyPi Pro 下载。
- **R6**：[树莓派 5 扩展板介绍](https://wiki.hiwonder.com/projects/Raspberry-Pi-5-Expansion-Board/en/latest/docs/1_Raspberry_Pi_Expansion_Board_Introduction.html)，1.1、1.3；[官方对应 PDF](https://drive.google.com/file/d/1uIJ629ZMebM6E1boJDVoc5oqz93T8KgS/view)，第 2、4–6 页。下载入口：[板卡附录](https://wiki.hiwonder.com/projects/Raspberry-Pi-5-Expansion-Board/en/latest/docs/resources_download.html) → [资料目录](https://drive.google.com/drive/folders/10olVCee9dYqQ2Swm085caoXdfCOFNc2F)。
- **R7**：[LFD-01M Digital Servo Datasheet V1.0 PDF](https://drive.google.com/file/d/1D2za3S-WT7IzK___ZptntImvmKuO8-f_/view)，第 2–4 页；路径：官方 [PWM 舵机教程入口](https://www.hiwonder.com.cn/store/learn/45.html) → [PWM 舵机总目录](https://drive.google.com/drive/folders/1Bgf1HGrfhB8N8XIxlRpz-U9_2oxVurDv) → [LFD-01M](https://drive.google.com/drive/folders/1ATWB7jU_hBfVTOExfxO5TFqv5gluvXlj) → 3 Servo Manual & Diagram → 03 LFD-01M Servo Datasheet。
- **R8**：[LFD-01M PWM Digital Servo User Manual V1.0 PDF](https://drive.google.com/file/d/1FqxSWDpfl0lMdxR9rHt0bGkkBln8JEvv/view)，第 2–4 页；路径：LFD-01M → 1 Tutorials → 1. LFD-01M Servo User Manual。
- **R9**：[新版扩展板控制课](https://wiki.hiwonder.com/projects/Raspberry-Pi-5-Expansion-Board/en/latest/docs/2_Expansion_Board_Control_Lesson.html)，2.6–2.8、2.6.5。
- **R10**：[板卡官方 board_demo 目录](https://drive.google.com/drive/folders/1l0dHNl8qMQo-WB1Af9wp23Msr-wEy8yj) → [ros_robot_controller_sdk.py](https://drive.google.com/file/d/10hQr4a1Tmsm0P3VlihPH1WUNcVLsGOx-/view)；下载快照第 354–384 行。板卡资料 → 2.Expansion Board Control Lesson → Appendix → board_demo。
- **R11**：[旧版 Getting Ready](https://docs.hiwonder.com/projects/TonyPi/en/latest/docs/1.getting_ready.html)，1.2 包装清单；[新版 Getting Ready](https://docs.hiwonder.com/projects/TonyPi_Pro/en/latest/docs/1_getting_ready.html)，同类清单。
- **R12**：新版 TonyPi 下载 → [FAQ 快捷目录](https://drive.google.com/drive/folders/1ICQ1cYNAW92NfjifgnjPx73yf-GxyCt-) → [Troubleshoot Malfunctional Servo on TonyPi and Solution PDF](https://drive.google.com/file/d/1YzpHBj85Q9sl9mHlAkZZhzJ1CEyKzCdO/view)，第 1–4 页。
- **R13**：旧下载 → 2024 Version → 5. Advanced Learning Course → [5. Raspberry Pi Expansion board Lesson](https://drive.google.com/drive/folders/1Eliqmo10lmI3Trsb-gE63lLrAPu7Rvqt) → [Lesson 3 Notice PDF](https://drive.google.com/file/d/1X0Dp5BHSlo41BJgeezi0J0f11_Kj0feR/view)，第 1–2 页；[Lesson 11 Single PWM PDF](https://drive.google.com/file/d/1SIZeQVlVJGKHdedaZGvC0pMUFKQsaki3/view)，第 1–2 页。属于通用示例，不能认定是具体机器 BOM。
- **R14**：[树莓派 5 扩展板产品页](https://www.hiwonder.com/products/expansion-board-for-raspberry-pi-5)，处理器、A/B/C 接口参数，官方搜索正文。
- **R15**：[Servo Selection Manual PDF](https://drive.google.com/file/d/1R2RLBWaPiMDOaaUZmab9zzZZ2yA0L-9i/view)，FAQ 3.1；来自 LFD-01M → 3 Servo Manual & Diagram → 04 Servo Selection Manual。
- **R16**：[TonyPi 新版附录](https://docs.hiwonder.com/projects/TonyPi_Pro/en/latest/docs/resources_download.html) → [Firmware Flashing Tool 目录](https://drive.google.com/drive/folders/1LwV4TehqX6nJHUp0eF_EUePXH1o-WiQQ)，只核查目录文件名。
- **R17**：[新版 Source Code & System Image 目录](https://drive.google.com/drive/folders/1ZARWrw8XlY2ThKJ1Rqiv1CXxzcfISYhK)，只核查目录；获取方式见 R16 附录。
- **S1**：`/home/duckran/codes/TonyPi/HiwonderSDK/hiwonder/ros_robot_controller_sdk.py`，[固定提交源码](https://github.com/Hiwonder/TonyPi/blob/dc452eaac9991516600860f706f4b889f3305d1d/HiwonderSDK/hiwonder/ros_robot_controller_sdk.py)，356–386 行。
- **S2**：`/home/duckran/codes/TonyPi/RPCServer.py`，[固定提交源码](https://github.com/Hiwonder/TonyPi/blob/dc452eaac9991516600860f706f4b889f3305d1d/RPCServer.py)，63–88 行。
- **S3**：`/home/duckran/codes/TonyPi/Functions/Follow.py`，[固定提交源码](https://github.com/Hiwonder/TonyPi/blob/dc452eaac9991516600860f706f4b889f3305d1d/Functions/Follow.py)，80–83 行。

## 剩余证据缺口与向官方索取的材料

研究已把选型从“泛称 PWM 舵机/未知扩展板”推进到 **当前 LFD-01M、B 型、照片 `RasAdapter5B V1.0`、5 V PWM 接口**。目前阻止确认软件松头部力矩的不是 Python 报文编码，而是以下具体证据缺口：

1. 用户机器的头部两只舵机标签和扩展板完整丝印/批次；旧版各批次逐关节 BOM/替换件清单。
2. 匹配板卡及固件版本的 PWM 协议：功能号 4、子命令 0x01、位置 0 的语义，以及是否存在逐通道输出禁用/enable 命令。
3. `RasAdapter5B` 原理图、PWM 5 V 稳压/电源开关网络，确认能否独立关闭头部电源而不影响 Pi/身体。
4. LFD-01M 对失去 PWM、恒低/恒高输入的型号级状态和超时，以及恢复信号行为。

这些材料可以凭订单和静态照片向官方 support@hiwonder.com 索取。不需要、也未授权以强扳头部、故意堵转、带电插拔、改固件或发送非法脉宽来填补缺口。
