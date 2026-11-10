---
sidebar_position: 4
---

# eBPF 可观测性：无侵入的内核视角

> 阶段 5 · 生产进阶 · 笔记 5-4
>
> eBPF 让"不改动任何代码、不重启任何进程"就能观测系统内部成为可能。本篇覆盖：eBPF 基础（是什么/能做什么/为什么对可观测性重要）、典型应用（网络流量、syscall、TCP 重传、安全审计）、工具生态一览、与 OTel 的关系、局限与开销、以及 macOS 用户必须知道的平台限制。

---

## 1. eBPF 是什么

### 1.1 一句话定义

**eBPF（extended Berkeley Packet Filter）是 Linux 内核提供的可编程沙箱**：你用受限的 C 语言写一段小程序，经内核**验证器（verifier）**静态检查安全性后，JIT 编译成原生指令，**挂载到内核的钩子点**上运行——从而在内核态对每个事件（每个网络包、每次系统调用、每次上下文切换）执行自定义逻辑。

### 1.2 关键机制速览

| 概念 | 作用 | 与可观测性的关系 |
| --- | --- | --- |
| **Hook（钩子点）** | 程序 attach 的位置：kprobe/kretprobe、tracepoint、perf_event、XDP（网卡入口）、tc（流量控制）、cgroup（sysctl/socket）、USDT（用户态探针） | 决定你能"看见"什么事件 |
| **Verifier（验证器）** | 加载前静态分析：禁止越界访问、保证循环有界、检查指针来源 | 保证不崩溃内核 → 才能"安全地常驻生产" |
| **Map（键值存储）** | 内核态与用户态交换数据：hash、histogram、ring buffer、per-CPU 数组 | 采集的指标直方图就存在 map 里，用户态定期读取 |
| **JIT 编译** | 字节码 → 本机指令 | 开销接近原生函数调用 |
| **CO-RE（Compile Once, Run Everywhere）** | BTF 类型信息 + 重定位，一次编译适配不同内核版本 | 解决"每个内核版本重编译"的运维噩梦 |
| **bpftrace / bcc** | 编写与加载 eBPF 程序的主流框架 | bcc=Python/C 库（写工具），bpftrace=高级语言（一行出结果） |

### 1.2.1 钩子点（Hook）与程序类型对照

选钩子 = 选"你能看见什么事件"。可观测性最常用的几类：

| 钩子/程序类型 | 挂载点 | 稳定性 | 观测用途举例 |
| --- | --- | --- | --- |
| kprobe / kretprobe | 任意内核函数进出 | 随内核版本可能变 | TCP 重传、VFS 读写延迟 |
| tracepoint | 内核静态埋点 | **稳定 ABI**（优先用） | 进程 exec、调度切换、块 IO |
| perf_event | PMU/定时事件 | 稳定 | CPU 采样剖析（profiler 的底层） |
| XDP | 网卡驱动入口（最早看到包） | 稳定 | DDoS 防护、包级计数 |
| tc (traffic control) | 网络栈收发路径 | 稳定 | L7 流量解析（HTTP/DNS） |
| cgroup（sock_ops/skb） | cgroup 级 socket 事件 | 稳定 | 容器级网络可观测 |
| LSM | Linux 安全模块 | 稳定 | 策略执行/安全审计（Tetragon） |
| uprobe / USDT | 用户态函数/静态探针 | 依赖二进制符号 | OpenSSL 明文抓取、语言运行时 hook |

官方介绍：https://ebpf.io/what-is-ebpf/ （访问日期：2026-11-04）

### 1.3 能做什么（事件清单）

- 追踪**任意系统调用**（open/execve/connect…）及参数；
- 追踪**任意内核函数**（kprobe）与稳定 tracepoint（如 `sched:sched_switch`）；
- **网络包级别**观测：XDP 在驱动层看到每个包、TCP 重传/RTT/丢包统计；
- **性能剖析**：基于 perf 事件采样调用栈（CPU profiling），甚至跨语言统一符号化；
- **文件/进程/容器事件**：谁打开了哪个文件、容器逃逸检测；
- **安全审计**：LSM 钩子上的策略执行（Tetragon、Falco）。

---

## 2. 为什么 eBPF 对可观测性重要

对比三种观测手段的"侵入性—视角"矩阵：

| 手段 | 需要改代码 | 需要重启进程 | 视角 | 覆盖率 |
| --- | --- | --- | --- | --- |
| 传统埋点（SDK/exporter） | 是 | 是 | 应用内部 | 只有埋了的地方 |
| 日志/指标采集器 | 否 | 否（旁路） | 文件/sysctl 外部 | 看得到"输出"，看不到"过程" |
| **eBPF** | **否** | **否** | **内核 + 全部进程** | **节点上所有事件** |

三个"不可替代"的价值点：

1. **无侵入**：存量服务、黑盒第三方组件（旧版 JDK、闭源 agent、静态二进制）也能观测——不改一行代码拿到它的网络延迟、syscall、CPU 热点；
2. **内核视角**：TCP 重传、丢包、调度延迟、IO 排队这些信息应用层根本看不到，内核层却是第一现场；
3. **统一低开销**：一次部署（每节点一个 DaemonSet）覆盖全节点语言栈，典型开销 1% 以内，避免"每种语言装一套 SDK"。

局限也很明确（见第 6 节）：**Linux 内核 4.x+ 才可用，且需要特权**；macOS/Windows 原生不可用。

---

## 3. 典型应用与最小示例

以下示例用 **bpftrace**（一行命令出结果）展示思想；生产化工具见第 4 节。

### 3.1 系统调用追踪：谁在 execve

```bash
# 追踪新进程创建（含参数），排查"神秘进程是谁拉起的"
bpftrace -e 'tracepoint:syscalls:sys_enter_execve {
  printf("%s -> %s\n", comm, str(args->filename));
}'
```

输出示例：

```
sh -> /usr/bin/curl
python3 -> /bin/sh
```

安全场景：监控容器里谁在起 shell（常见攻击行为）。

### 3.2 TCP 重传：网络质量直方图

```bash
# 统计 TCP 重传次数按进程分布
bpftrace -e 'kprobe:tcp_retransmit_skb { @[comm] = count(); }'
```

内核视角的独有指标：`tcp_retransmit`、`tcp_drop`、RTT 分布。**应用只会觉得"变慢了"，内核知道是丢了哪个包。** 类似思路的成熟实现：`tcpretrans`（bcc 工具集）。

### 3.3 函数级延迟直方图

```bash
# 测量 read() 系统调用耗时分布（微秒，log2 直方图）
bpftrace -e 'kprobe:vfs_read { @start[tid] = nsecs; }
kretprobe:vfs_read /@start[tid]/ {
  @usecs = hist((nsecs - @start[tid]) / 1000);
  delete(@start[tid]);
}'
```

输出是 log2 直方图，一眼看出 IO 延迟主体落在哪一档——这正是 histogram 类 eBPF 工具（biolatency、ext4slower）的原理。

### 3.4 网络流量观测（L7）

XDP/tc 钩子上解析 HTTP/DNS/gRPC 明文流量 → 不改应用就得到"每条连接每秒多少请求、哪个 URL 慢"。这是 Pixie、kindling、Cilium Hubble 的核心能力。

### 3.5 安全审计

LSM/kprobe 上的策略引擎（Tetragon）：如"容器内进程 execve(/bin/bash) → 立刻报警/拦截"；文件提权、`/etc/passwd` 修改等规则化检测（Falco 的思路）。审计日志同时成为可观测性的一部分。

### 3.6 bpftrace one-liner 速查表（现场排障够用版）

```bash
# 每秒新建的 TCP 连接（谁连了谁）
bpftrace -e 'kprobe:tcp_v4_connect { printf("%s -> %s\n", comm, ntop(args->daddr)); }'

# 文件打开监控（排"谁在读这个文件"）
bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s %s\n", comm, str(args->filename)); }'

# 按进程统计块设备 IO 大小直方图
bpftrace -e 'tracepoint:block:block_rq_issue { @bytes[comm] = hist(args->bytes); }'

# 调度延迟（线程等 CPU 多久才被调度，卡顿诊断）
bpftrace -e 'tracepoint:sched:sched_wakeup { @q[tid] = nsecs; }
tracepoint:sched:sched_switch /@q[args->next_pid]/ {
  @usecs = hist((nsecs - @q[args->next_pid]) / 1000); delete(@q[args->next_pid]);
}'

# 内核里谁在杀进程（SIGKILL 来源审计）
bpftrace -e 'tracepoint:signal:signal_generate /args->sig == 9/ {
  printf("%s killed pid %d\n", comm, args->pid);
}'

# CPU on-CPU 采样剖析（60 秒，输出到文件后用 FlameGraph 脚本渲染）
bpftrace -e 'profile:hz:99 /cpu > 0/ { @[ustack, kstack] = sample(); }' > out.svg
```

> 注意：`args->xxx` 字段名随内核版本可能不同（`bpftrace -l tracepoint:xxx -v` 可查看当前内核的字段）。这正是"生产优先用 tracepoint 而不是 kprobe"的原因。

### 3.7 macOS + podman machine 动手（本地体验路径）

macOS 没有 Linux 内核，但在 podman machine 提供的 Linux 虚拟机里可以体验大部分能力：

```bash
# 1) 官方 bpftrace 镜像需要特权 + 挂载内核虚拟文件系统
podman run --rm -it --privileged \
  -v /sys/kernel/debug:/sys/kernel/debug:rw \
  -v /sys/kernel/tracing:/sys/kernel/tracing:rw \
  quay.io/iovisor/bpftrace:latest \
  bpftrace -e 'tracepoint:syscalls:sys_enter_execve { printf("%s\n", comm); }'

# 2) 体验 BCC 工具（如 biolatency 块设备延迟直方图）
podman run --rm -it --privileged \
  -v /sys/kernel/debug:/sys/kernel/debug:rw \
  ghcr.io/iovisor/bcc:latest /usr/share/bcc/tools/biolatency 10 1

# 3) 先看 podman machine VM 的内核版本（结论外推到生产前必查）
podman run --rm --privileged alpine uname -r
```

限制提醒：VM 内核版本由 podman machine 的 Linux 发行版镜像决定（通常较新且开启 BTF）；`--privileged` 是硬要求；容器里只能看到 VM 内的事件，看不到 macOS 宿主进程。

### 3.8 BCC 经典性能工具速查（Brendan Gregg 体系）

装好 BCC 后，这些现成工具覆盖了 80% 的主机级排障场景：

| 工具 | 观测什么 | 对应的"应用侧症状" |
| --- | --- | --- |
| `execsnoop` | 新进程创建 | 定时任务风暴、异常 shell |
| `opensnoop` | 文件打开 | 配置热加载风暴、异常文件读取 |
| `biolatency` | 块设备 IO 延迟直方图 | "磁盘慢"量化 |
| `fileslower` | 慢于阈值的文件读写 | 应用读配置/日志变慢 |
| `tcpretrans` | TCP 重传 | 网络抖动、超时根因 |
| `tcplife` | TCP 连接生命周期（时长/字节） | 短连接风暴、连接池失效 |
| `runqlat` | 线程等待调度延迟 | CPU 饱和/超卖 |
| `offcputime` | 线程离开 CPU 的原因栈 | off-CPU 分析的命令行版 |
| `profile` | on-CPU 采样剖析 | CPU 热点（profiler 的底层原理） |
| `softirqs` / `hardirqs` | 中断耗时 | 网络中断风暴 |

每个工具都接受 `-h` 查看参数；它们就是第 4 节那些"产品化 eBPF 观测平台"在单机上的原型——理解了它们，就理解了平台在节点上采集什么。

---

## 4. 工具生态一览

| 工具 | 一句话定位 | 备注 |
| --- | --- | --- |
| **bcc（BPF Compiler Collection）** | eBPF 工具的"老牌军火库"，Python/C 框架 + 几十个现成工具（biolatency、tcpretrans、execsnoop、opensnoop…） | 写生产工具用 |
| **bpftrace** | "eBPF 界的 awk"，一行命令出结果，探查现场首选 | 排障神器 |
| **Pixie** | （CNCF 沙箱，现由社区/开源继续）K8s 集群无侵入 L7 观测：自动抓 HTTP/gRPC/SQL/PDU 流量 + 火焰图 | 部署 DaemonSet 即用 |
| **Cilium Hubble** | 基于 Cilium 的网络可观测性：网络流、L7 HTTP 状态、drop 事件、服务依赖图 | K8s CNI 事实标准搭档 |
| **kindling** | （中国企业开源）基于 eBPF 的应用级 tracing/指标增强，专注"0 代码接入拿到黄金指标" | 对无需改造存量的场景友好 |
| **Inspektor Gadget** | K8s 节点调试"瑞士军刀"：execsnoop、tcpdump、top、profile 以 gadget 形式 kubectl 一键运行 | 运维排障 |
| **Parca / Grafana Alloy eBPF profiler / OTel eBPF profiler** | 持续剖析路线（见 profiling.md） | 零侵入 CPU 热点 |
| **Tetragon / Falco** | 运行时安全检测与策略执行 | 安全 + 审计观测 |
| **kubectl-trace** | 在集群里调度 bpftrace 脚本 | 实验性 |

---

## 5. 与 OpenTelemetry 的关系

OTel 生态正在"吸收" eBPF 作为采集层之一：

1. **OTel eBPF profiler**：Grafana/Red Hat 等推动的 eBPF CPU profiler，将 pprof 格式的 profile 通过 OTLP Profiles 信号导出，与 trace/metrics 同一管道（见 profiling.md 第 4 节）。参考：https://opentelemetry.io/blog/2024/otel-profiles-and-ebpf/ （访问日期：2026-11-04）
2. **OTel Kubernetes Operator / k8s-collector**：以 DaemonSet 形态部署的 OTel collector，除 OTLP 接收外可叠加 hostmetrics、filelog 等接收器；社区亦有探索将 eBPF 观测数据（网络流指标）接入 collector 管道，实现"一套 OTLP 出口"。
3. **格局判断**：
   - **应用语义**（业务维度、span、日志结构）→ 仍是 SDK 主场；
   - **系统语义**（网络、syscall、CPU 栈、安全事件）→ eBPF 主场；
   - 两者在 collector 层汇合：eBPF 提供无侵入的数据面，OTel 提供统一的传输/语义规范面。未来一年最值得关注的方向是 OTLP Profiles 的正式稳定。

---

## 6. 局限与开销

### 6.1 平台限制（重点）

- **只存在于 Linux 内核**（4.x 起步，5.x+ 才好用；部分特性如 ring buffer、BTF 需要 5.2/5.8+）；
- **需要特权**：`CAP_BPF`/`CAP_SYS_ADMIN`/root。容器里通常要求 privileged 或超大 BPF 权限集——这是平台团队对 eBPF 工具审查的第一关；
- **macOS 无法直接运行**：eBPF 依赖 Linux 内核，macOS（Darwin）没有。macOS 上的开发者/CI：
  - 在 **podman machine 的 Linux 虚拟机**里运行 eBPF 工具是可行的（那是一个真正的 Linux 内核），例如 `podman run --privileged --pid=host -v /sys:/sys ...` 跑 bcc/bpftrace 镜像，能用到大部分功能；
  - 但 podman machine 的 VM 内核版本固定（跟随其 Linux 发行版镜像发布），个别 tracepoint/kprobe 可能与目标生产内核不一致，结论外推要小心；
  - **容器内可用的能力子集**：非特权容器里通常不能加载 BPF 程序；需要 privileged。Apple Silicon 的 podman machine VM 是 aarch64 Linux，常用工具镜像均有 arm64 版本。
- **内核版本碎片化**：CO-RE 大幅缓解但不消灭差异；老内核（3.x）完全无解。

### 6.2 开销

- 事件触发型（kprobe 挂高频函数如 `tcp_sendmsg`）：每事件 ~百纳秒级；高频路径叠加多个工具会叠加；
- 采样型（profiling 100Hz、每 10ms 一次）：CPU 开销 <1% 量级；
- map 内存：直方图/聚合表通常 KB~MB 级；
- **经验值**：单节点 eBPF 观测全家桶（profiler + 网络 + syscall）总开销目标控制在 1%~2% CPU。

### 6.3 可观测性语义局限

- **看不到应用语义**：内核知道 socket 字节流，不知道"这是下单还是退款"——业务维度仍需 SDK/trace；
- **TLS 流量加密后 L7 解析受限**：需要 SSL 上下文 hook（如 uprobe 挂 OpenSSL/BoringSSL）才能看到明文；
- **符号信息依赖**：profiling 跨语言符号化对解释型语言（Python/JS）需要额外栈支持。

---

## 7. 常见坑

1. **把 eBPF 当万金油**：它是"内核事件的眼睛"，不能替代应用埋点；业务可观测性（trace/结构化日志）仍是 SDK 主场。
2. **生产容器缺特权导致加载失败**：报 `Operation not permitted`。排查：Pod securityContext（privileged 或 capabilities: [BPF, PERFMON, SYS_ADMIN]）、宿主机 `kernel.unprivileged_bpf_disabled` sysctl。
3. **bpftrace 脚本绑死内核版本**：kprobe 函数名随内核变化（如 `tcp_retransmit_skb` 参数变化）。优先用 tracepoint（稳定 ABI），脚本注明适用内核。
4. **podman machine（macOS）里测完直接推广生产**：VM 内核 ≠ 生产内核，版本与配置差异可能导致行为不同；结论先在预发 Linux 验证。
5. **高频事件无过滤全量上报**：`execve` 一秒数万次的场景别 `printf` 直出，用 map 聚合（`count()`/`hist()`），或加 filter（按 cgroup/comm 过滤）。
6. **忘了看 verifier 拒绝原因**：程序加载失败时 `dmesg` 里有详细 verifier log，90% 是指针/边界问题。
7. **安全与观测的权限冲突**：eBPF 工具要求特权与最小权限原则冲突，用专用的 DaemonSet + RBAC 收敛（只允许特定程序签名加载，参考 Tetragon 的策略签名机制）。

---

## 8. 面试题小结

1. **Q：eBPF 是什么？为什么它对可观测性重要？**
   A：Linux 内核的可编程沙箱，程序经验证器检查后 JIT 运行在内核钩子上。重要性在于：无侵入（不改代码、不重启）、内核视角（网络/调度/IO 第一现场）、节点级一次部署覆盖所有语言。

2. **Q：verifier 与 CO-RE 分别解决什么问题？**
   A：verifier 通过静态分析保证程序安全（不崩内核、不越界），让 eBPF 能常驻生产；CO-RE（BTF + 重定位）解决一次编译跨内核版本运行，免除"每个内核重编译"的运维负担。

3. **Q：举两个 eBPF 提供而应用埋点拿不到的观测数据。**
   A：TCP 重传/丢包与 RTT 分布（内核网络栈事件）；syscall 级追踪如某容器内 execve 出 shell（安全审计）。再如调度延迟、块设备 IO 直方图。

4. **Q：eBPF 和 OTel 是竞争关系吗？**
   A：不是，是互补与融合：eBPF 是数据采集层（系统语义），OTel 是语义/传输标准层（应用语义与统一 OTLP 出口）；典型融合是 OTel eBPF profiler 把 profile 以 OTLP Profiles 信号送入统一管道。

5. **Q：为什么 macOS 上跑不了 eBPF？怎么办？**
   A：eBPF 依赖 Linux 内核钩子与验证器，Darwin 内核没有。替代：在 podman machine 的 Linux 虚拟机内以 privileged 容器运行 bcc/bpftrace 等工具验证思路，注意 VM 内核版本与生产的差异，最终在 Linux 预发验证。

6. **Q：eBPF 观测的开销量级？如何控制？**
   A：采样型 ~<1% CPU；事件型每 hook 百纳秒级，总量取决于事件频率。控制：优先 map 内聚合而非用户态上报、按 cgroup/comm 过滤、限制挂载点数量、控制 profiler 频率，并持续测量自身开销。

---

## 9. 参考资料

| 资料 | 链接 | 访问日期 |
| --- | --- | --- |
| eBPF 官方介绍 | https://ebpf.io/what-is-ebpf/ | 2026-11-04 |
| eBPF 文档（内核侧） | https://docs.kernel.org/bpf/ | 2026-11-04 |
| bcc 工具集 | https://github.com/iovisor/bcc | 2026-11-04 |
| bpftrace | https://github.com/iovisor/bpftrace | 2026-11-04 |
| BPF Performance Tools（Brendan Gregg 书页/工具） | http://www.brendangregg.com/bpfperformanceanalyticsbook.html | 2026-11-04 |
| Pixie | https://github.com/pixie-io/pixie | 2026-11-04 |
| Cilium Hubble | https://github.com/cilium/hubble | 2026-11-04 |
| kindling | https://github.com/Kindling-project/kindling | 2026-11-04 |
| Inspektor Gadget | https://github.com/inspektor-gadget/inspektor-gadget | 2026-11-04 |
| OTel eBPF profiler 公告 | https://opentelemetry.io/blog/2024/otel-profiles-and-ebpf/ | 2026-11-04 |
| Tetragon | https://github.com/cilium/tetragon | 2026-11-04 |
