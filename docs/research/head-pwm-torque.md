# TonyPi 头部 PWM 舵机能否释放力矩

## 结论

**当前本地官方 SDK 没有提供头部 PWM 舵机的力矩释放或停止 PWM 输出接口，不能像身体总线舵机一样直接调用卸载命令。** `pulse=0` 可以通过底层 Python SDK 的参数编码，但现有证据不足以证明控制板会因此停发 PWM，更不足以证明实际头部舵机会停止保持力矩。本项目的 PWM 参数校验明确拒绝 `0`。因此不能把“发送零脉宽”作为已经核实、安全可用的释放力矩方案。[S1：356–385；S2：251–258；P1：192–197、262–266]

这里的“不支持”限定为**所检查版本公开的 Python 接口没有该功能**，不是断言硬件绝对无法实现。若要通过软件实现，仍需确认对应控制板固件的特殊值/禁用命令，以及实际舵机的失去信号行为；这两项没有从本地 SDK 或已查到的官方资料获得证明。[S1：356–378；H1；H2]

## 证据范围与引用方式

研究日期：2026-10-06。主要证据来自用户指定的 `/home/duckran/codes/TonyPi`，其 Git remote 为 `https://github.com/Hiwonder/TonyPi`，检查时 HEAD 为 `dc452eaac9991516600860f706f4b889f3305d1d`，工作区干净。当前仓库原有代码存在未提交修改；本研究只新增本文，没有修改代码、连接串口、驱动舵机或进行真机验证。

下列短名后面的数字是文件行号；`../TonyPi` 均相对于本仓库根目录，不是相对于本文所在目录。官方源码链接固定到上述提交，便于复核。

- **S1**：`../TonyPi/HiwonderSDK/hiwonder/ros_robot_controller_sdk.py`，[官方源码](https://github.com/Hiwonder/TonyPi/blob/dc452eaac9991516600860f706f4b889f3305d1d/HiwonderSDK/hiwonder/ros_robot_controller_sdk.py)。
- **S2**：`../TonyPi/HiwonderSDK/hiwonder/Controller.py`，[官方源码](https://github.com/Hiwonder/TonyPi/blob/dc452eaac9991516600860f706f4b889f3305d1d/HiwonderSDK/hiwonder/Controller.py)。
- **S3**：`../TonyPi/RPCServer.py`，[官方源码](https://github.com/Hiwonder/TonyPi/blob/dc452eaac9991516600860f706f4b889f3305d1d/RPCServer.py)。
- **S4**：`../TonyPi/Functions/Follow.py`，[官方源码](https://github.com/Hiwonder/TonyPi/blob/dc452eaac9991516600860f706f4b889f3305d1d/Functions/Follow.py)。
- **P1**：本仓库 `agent/tonypi_agent/hardware.py`，行号对应研究时工作区快照。
- **P2**：本仓库 `README.md`。
- **H1**：[官方 TonyPi 产品页](https://www.hiwonder.com/products/tonypi)，Product Parameters 的 Servo 项。
- **H2**：[官方 LFD-01M 产品页](https://www.hiwonder.com/products/lfd-01m)，Product Parameters 和 Anti-blocking servo 描述。
- **H3**：[官方 TonyPi / TonyPi Pro v2 使用文档](https://docs.hiwonder.com/projects/TonyPi_Pro/en/latest/docs/1_getting_ready.html)，Safety and Usage Guidelines、Start TonyPi Pro、Battery Level Check。
- **H4**：[官方 TonyPi v1 使用文档](https://docs.hiwonder.com/projects/TonyPi/en/latest/docs/1.getting_ready.html)，安全注意事项。

H1、H2 的直接抓取返回 HTTP 429，硬件参数依据联网检索返回的**同一官方网页正文摘录**，没有把第三方转述当作证据。H3 已读取完整正文。官方资料入口将 LFD-01M 指向 [PWM 舵机教程下载页](https://www.hiwonder.com.cn/store/learn/45.html)，该页仅提供下载入口；未获得足以确认失去信号行为的型号级说明。

## 官方 SDK 实际提供了什么

PWM 与总线舵机是两个独立功能域。SDK 将 PWM 定义为功能号 `4`，板上通道从里到外为 `1–4`；总线舵机功能号为 `5`。官方 TonyPi RPC 把头部 PWM 舵机限制在通道 `1、2`，注释给出的脉宽范围是 `500–2500`。本项目把 PWM 1 标为上下、PWM 2 标为左右。PWM 通道 1 与总线 ID 1 不代表同一舵机。[S1：25–32；S3：63–88；P2：11]

公开的 PWM 方法只有设置位置、设置偏差、读取偏差、读取位置及内部读取辅助方法；没有 `pwm_servo_enable_torque`、PWM 卸载、PWM 停止或 PWM 输出开关。上层 `Controller.set_pwm_servo_pulse` 只是把毫秒换成秒，转发到 `board.pwm_servo_set_position`，也没有附加释放语义。[S1：356–378；S2：181–190]

总线侧则确有独立操作：`bus_servo_stop` 发子命令 `0x03`；`bus_servo_enable_torque` 根据布尔值发 `0x0B` 或 `0x0C`；`bus_servo_read_torque_state` 发 `0x0D`。特别注意此 SDK 的命名容易误导：`Controller.unload_bus_servo` 调用 `bus_servo_enable_torque(id, 1)`，即 **truthy 参数对应卸载方向、发送 `0x0B`**，不能只凭方法名字把 `True` 理解为开启力矩。SDK 的 `False` 分支发送 `0x0C`，但这里不额外推断控制板内部如何执行或状态返回值如何映射。[S1：380–386、418–421、462–463；S2：251–258]

本项目真实硬件适配器的 `stop()` 只调用 `bus_servo_stop`，`set_torque()` 只调用 `bus_servo_enable_torque`；它们没有向 PWM 功能域发送命令。所以当前身体“停止/释放力矩”操作不会顺带释放头部 PWM 舵机。[P1：213–235]

## `pulse=0`：能发送不等于能关闭输出

### Python 编码层允许零值

`Board.pwm_servo_set_position(duration, positions)` 没有检查 `500–2500` 范围：每个位置用 `struct.pack("<BH", id, pulse)` 编码，`pulse` 是无符号 16 位整数，`0` 在编码范围内。`Controller.set_pwm_servo_pulse` 也不做脉宽校验。因此零值不会仅因为超出常用舵机范围而被这两层拒绝。[S1：356–361；S2：189–190]

按实际 `buf_write` 实现，树莓派到控制板的报文是 `AA 55 | Function | Length | Data | CRC8`。PWM 设置位置的数据区为 `01 | duration_ms低字节 | duration_ms高字节 | 数量 | (id:uint8, pulse:uint16小端)…`。零脉宽在这里仅是位置字段的 `00 00`，不是 SDK 内专门定义的禁用命令。SDK 文件开头的协议注释和实际函数/长度排列存在差异，此处以实际发送函数为准。[S1：14–16、316–321、356–361]

`duration=0` 同样只是把运动时间字段设为零，**不等于**把脉宽设为零，也不等于释放力矩。是否立即到位等具体固件行为不在这段 Python 源码中。[S1：356–361]

### 控制板和舵机层尚未证实

Python SDK 只把串口报文发给控制板，PWM 波形由下游硬件/固件处理；它没有直接设置树莓派 GPIO 的 PWM 占空比，也没有在零脉宽时执行本地停止逻辑。因此不能把其他平台的 `set_servo_pulsewidth(..., 0)` 或 GPIO PWM 停止规则移植成该控制板的保证。[S1：102–111、316–321、356–361]

本地 TonyPi 仓库未找到对应 PWM 命令处理器或 PWM 定时器的 C/C++ 固件源码，已检查官方硬件网页也没有给出 `pulse=0` 特殊语义。控制板可能拒绝、限幅、特殊处理零值或采取其他行为；这些只是待排除的可能性，不是本研究确认的实现。**必须获得匹配板型/固件的协议说明或处理器源码，才能确认零值是否会停止输出。**[证据边界：S1：356–378 仅含主机侧编码；H1；H2]

即使测得信号线不再输出脉冲，也还需要确认该型号舵机是否停止驱动、是否存在保持/失效保护、多久后生效。停发控制信号不等于切断舵机供电；“可手动转动”也不等于机械上完全无阻力。已查到的 LFD-01M 官方参数没有说明失去 PWM 信号后的行为，故不保证停 PWM 就松力矩。[H2；证据边界：S1：356–378 没有电源控制或舵机内部实现]

### 本项目目前不允许零值

真实适配器先执行 `_validate_pwm`，只接受通道 `1–4`、脉宽 `500–2500`，再调用底层 SDK；`pulse=0` 会在发送前抛出 `HardwareError`。这既不是底层 SDK 的限制，也不是硬件已被证明不支持零值，只是本项目现有接口契约。本文没有放宽该契约。[P1：192–197、262–266]

## 具体舵机和硬件限制

官方当前 TonyPi 产品参数列出 `LX-824HV bus servo / LFD-01M anti-blocking servo`；结合头部使用 PWM 的官方程序，可把 LFD-01M 作为需要核实的头部型号，但**不能仅凭网页就确认用户这台机器人两只头部舵机的型号和批次**。本地代码没有型号探测或头部完整 BOM；实际设备仍需看标签、采购清单或向官方确认。[H1；S3：63–88；S4：80–83]

LFD-01M 的官方参数列明：PWM 脉宽控制、`500–2500 μs` 对应 `0–180°`、工作电压 `4.8–6 V`、金属齿轮。零脉宽不属于公开的正常位置范围；“anti-blocking”描述也不能当作外部可调用的力矩释放接口或失去信号后的保证。本报告没有查到该型号的零脉宽、信号丢失超时、恢复 PWM 后的状态策略。[H2]

整机供电范围 `9–12.6 V` 与 LFD-01M 的 `4.8–6 V` 是不同层级参数，不能把电池电压直接作为头部舵机供电电压。本文没有获得匹配控制板的头部电源电路图，故不声称可以单独软件关闭头部供电，也不确定它与其他输出是否共享电源。[H2；H3：Battery Level Check]

PWM 的 `read_position` 只是读取控制板返回的一个整数，主机源码没有证明该数值来自舵机轴角传感器；它不能被用作“手动拖动后真实角度”的保证，更不能用作力矩释放成功反馈。总线侧力矩状态接口也没有 PWM 对应版本。[S1：367–378、430–436、462–463；H2：控制方式为 PWM]

## 停止运动与松力矩不是同一操作

| 操作 | 本地官方代码证据 | 能否证明头部松力矩 |
| --- | --- | --- |
| 停止玩法、停止继续生成目标 | `Follow.stop()` 只把 `__isRunning` 置为 `False`，不调用 PWM 禁用 | 不能。[S4：134–138] |
| 退出玩法 | `Follow.exit()` 停玩法并执行 `stand_slow` 动作组 | 不能。[S4：140–145] |
| 设置某个 PWM 位置或回中 | `initMove()` 向 PWM 1、2 发位置和 500 ms 运动时间 | 是位置命令，不是卸载。[S4：80–83；S1：356–361] |
| 总线舵机停止 | 单独的总线 `0x03` 命令 | 不属于 PWM 力矩接口，也不是卸载命令。[S1：418–421、380–385] |
| 总线舵机卸载 | `unload_bus_servo()` 发总线 `0x0B` | 仅有总线侧证据，不适用于 PWM 通道。[S2：251–258；S1：380–385] |
| 零脉宽、关闭信号或头部断电 | 零值可编码；其余行为缺少匹配固件/电路/舵机证据 | 不能据现有资料认定为已验证的软件方案。[S1：356–378；H2] |

## 安全边界和后续核实

**不要通过强扳通电头部或故意堵转来试验释放是否成功。** 官方明确要求通电时不要强行移动机器人部件；旧版官方文档还提醒舵机发热后要冷却、远离运动关节和跌落边缘。防堵转宣传不替代这些限制。[H3：Safety and Usage Guidelines 第 5 项；H4：安全注意事项]

若后续得到官方确认并安排真机验证，应该先支撑机器人与摄像头，停止跟踪/APP/其他控制进程的目标写入，再用匹配板型固件做单通道、受控实验。应分别记录信号波形、供电是否仍在、释放后是否仍主动保持、恢复合法脉宽时是否突然回到旧目标。恢复可能运动是安全风险预案，不是本研究已经验证的行为。官方文档说明上电会回到默认起始位置，本仓库也要求首次真机验证在安全支撑下、小范围进行。[H3：Start TonyPi Pro；P2：20、68；S4：275–276 存在持续头部位置写入]

断开头部连接或改变供电属于硬件操作，不是当前 SDK 的能力；没有匹配电路资料时不要建议带电拔插、随意短接信号线或直接接电池电压。若目的只是人工调整机构，应先停止程序、关机并按官方流程断电，仍不要强扳机械限位；卸载驱动不等于齿轮机构无阻力。[H3：Safety and Usage Guidelines；H2：工作电压、齿轮类型；安全建议而非已验证 SDK 功能]

下一步向官方询问时，应该明确提供实际头部舵机标签、控制板型号及固件版本，并要求回答三个具体问题：

1. PWM 功能号 `4`、子命令 `0x01` 的位置值 `0` 是禁用、限幅、拒绝，还是其他含义？是否另有逐通道输出关闭命令？[问题依据：S1：31、356–361]
2. 对应版本能否只关闭 PWM 1/2 而不影响身体舵机或其他输出？是否有独立头部电源开关？[问题依据：S1：31–32；当前缺少电路/固件证据]
3. 实际舵机失去 PWM 信号后是否解除主动保持、延迟多久、恢复信号时如何处理目标？[问题依据：H2 未公开这些行为]

在取得这些答案前，准确对用户的表述是：**身体总线舵机有官方卸载接口；头部 PWM 目前没有同等接口。停发 PWM 是否能达到松力矩效果尚未核实，不能承诺 `pulse=0` 可用。**
