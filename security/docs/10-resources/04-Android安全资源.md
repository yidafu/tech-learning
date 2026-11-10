# Android 安全资源索引

> 日期：2026-11-04
> 所属大纲阶段：8. 移动安全（Android）— 参考资料
> 说明：本索引为移动安全学习阶段的配套资源，只收录真实存在、社区公认的书籍 / 文档 / 靶场 / 工具；所有实操仅限本地靶场与自有研究设备。

## 一、书籍

### 1.1 《Android 软件安全权威指南》— 丰生强（人民邮电出版社，2019）

- **类型 / 难度 / 价格**：纸质书 / 中高 / 付费
- **适合场景**：逆向工程（reverse engineering）方向的系统学习，对应本阶段笔记 42、46。
- **推荐理由**：中文逆向经典，从 Dalvik/ART 虚拟机、smali 语法、APK 结构讲起到 SO 逆向、加壳脱壳、反调试对抗，体系完整且示例可复现，是国内作者写的最值得精读的一本。
- **使用建议**：作为 42-46 篇的配套精读书，边读边把示例做进 `labs/`。

### 1.2 《Android Hacker's Handbook》— Joshua J. Drake 等（Wiley，2014）

- **中译本**：《Android 安全攻防权威指南》，诸葛建伟、杨坤、肖梓航 译（人民邮电出版社·图灵，2015）。
- **类型 / 难度 / 价格**：纸质书 / 高 / 付费（中英文均易购得二手）
- **适合场景**：理解 Android 攻击面分析与漏洞挖掘方法论。
- **推荐理由与警告**：**内容基于 Android 4.x 时代，工具与系统版本已明显过时**，不作工具手册使用；但设备 root、漏洞研究、攻击面梳理的思路仍被广泛引用，适合选读补思维。
- **使用建议**：跳过具体工具章节，精读方法论章节即可；日常操作以 MASTG 为准。

### 1.3 《The Mobile Application Hacker's Handbook》— Dominic Chell、Tyrone Erasmus、Shaun Colley、Ollie Whitehouse（Wiley，2015）

- **类型 / 难度 / 价格**：纸质书 / 中高 / 付费
- **适合场景**：系统学习「如何完整地测试一个移动应用」，覆盖 Android + iOS 双平台。
- **推荐理由**：与上一本「挖系统漏洞」不同，这本聚焦应用层攻击面：本地存储、IPC、通信、客户端加固，方法论接近今天的应用渗透流程；同样注意出版年份较旧，工具用法需对照新版文档。
- **使用建议**：作为应用层测试方法论的补充读物，与 MASTG 交叉阅读。

### 1.4 OWASP MASTG — 免费在线「书」

- **地址**：<https://mas.owasp.org/MASTG/>（GitHub 仓库：[OWASP/mastg](https://github.com/OWASP/mastg)）
- **类型 / 难度 / 价格**：在线指南 / 全难度 / **免费**
- **适合场景**：移动应用安全测试的**主教材**，从环境搭建、静态分析、动态分析到反编译对抗、Frida 实战全覆盖。
- **推荐理由**：**重点推荐，优先级最高**。OWASP 官方维护、持续更新，配套 UnCrackable 练习与认证（MASRP），可完全替代过时纸质书；读英文原版即可。
- **使用建议**：把 MASTG 当作 41-46 全程的主线参考，纸质书作补充。

> 补充：丰生强前作《Android 软件安全与逆向分析》（人民邮电出版社，2015）为《权威指南》早期版本，二选一读新版即可；其余如《Android First》等书名查无实据，不列。

## 二、官方文档与标准

### 2.1 Android Developers 官方文档（安全板块）

- **入口**：<https://developer.android.com/privacy-and-security>（免费）
- **重点子主题**（对应笔记 41—44 的平台机制部分）：
  - **权限（permissions）**：运行时权限模型、特殊权限与最佳实践；
  - **Android Keystore System**：硬件级密钥存储与加密（cryptography）API；
  - **网络安全配置（Network Security Config）**：应用级 TLS/明文流量策略，抓包对抗的基础；
  - **WebView 安全**：`setJavaScriptEnabled`、文件访问、Intent 域名校验等高频漏洞点。
- **推荐理由**：平台安全机制的第一手权威资料，审计「App 是否用对了平台机制」之前必读。

### 2.2 OWASP MASVS / MASTG（重点）

- **MASVS**（Mobile Application Security Verification Standard，移动应用安全验证标准）：<https://mas.owasp.org/MASVS/>
  - v1 采用 L1/L2 两级验证深度（另有反篡改/弹性方向的 Resilience 补充要求，从未有过 L3）；2023 年 v2 起取消验证分级，改按八大安全主题组织：存储（STORAGE）、密码学（CRYPTO）、认证（AUTH）、网络（NETWORK）、平台（PLATFORM）、代码（CODE）、弹性（RESILIENCE）、配置（CONFIG）；
  - 用途：写安全需求、做差距分析、出审计报告的**标准依据**。
- **MASTG**（Mobile Application Security Testing Guide，测试指南）：<https://mas.owasp.org/MASTG/>
  - 与 MASVS 配对：标准告诉你「要满足什么」，指南告诉你「怎么测」；
  - 包含完整的测试用例集（MASVS-AUTH、MASVS-STORAGE 等逐条对应）、工具用法与绕过对抗技巧（root 检测、SSL Pinning、反调试）；
  - GitHub 仓库现为 [OWASP/mastg](https://github.com/OWASP/mastg)（原仓库名 owasp-mastg 已改名，旧链接会重定向）。
- **推荐理由**：两者是移动安全领域事实上的行业标准（大量企业审计与认证以其为基线），免费且持续更新，**本阶段首选主干资料**。

### 2.3 Android Security Bulletin（月度安全公告）

- **地址**：<https://source.android.com/docs/security/bulletin>（免费）
- **内容**：Google 每月发布的 CVE 公告——漏洞编号、受影响组件（framework、内核、驱动、高通/联发科组件）、补丁级别（patch level）与严重度评级。
- **推荐理由**：按月跟读公告 + 相关分析文章，是理解**真实 Android 漏洞生态**（而非只有靶场玩具漏洞）的最佳途径，对应笔记 43、46 的漏洞案例积累。

### 2.4 Google Play 安全政策（一句话）

- 上架 Google Play 的应用须遵守其安全政策（恶意行为、数据滥用零容忍，详见 Play 管理中心帮助文档）；逆向他人 App 时可对照理解其合规边界，也提醒自己产出的实验 App 不要越界。

### 2.5 Frida 官方文档与脚本市场

- **文档**：<https://frida.re/docs/home/>（免费）：JavaScript API、hook 语法、跨平台注入原理的权威来源。
- **Frida CodeShare**：<https://codeshare.frida.re/>（免费）：社区 Frida 脚本市场，学习 hook 脚本写法从读别人的脚本开始最快，常见需求（绕检测、dump 类）几乎都有现成参考。

## 三、在线学习资源

### 漏洞研究与 writeup

- [Oversecured Blog](https://blog.oversecured.com/) — 博客 / 中高 / 免费。移动安全公司 Oversecured 的技术博客，Android/iOS 漏洞 writeup（漏洞报告）高产且质量极高，每篇都从漏洞模式到利用链讲透，**重点推荐长期跟读**；配套靶场 OVAA 见下。
- [HackTricks — Mobile Android Pentesting](https://book.hacktricks.xyz/mobile-android-pentesting) — 速查手册 / 全难度 / 免费。渗透测试知识合集的移动安全分册，测试清单、技巧、命令速查，做靶场时当 cheat sheet 翻。

### 靶场（Vulnerable Apps）

- **[OWASP UnCrackable Apps for Android L1–L4](https://github.com/OWASP/mastg/tree/master/Crackmes/Android)**
  - 类型 / 难度 / 价格：官方破解练习 / 入门→进阶 / 免费
  - 适合场景：Frida 与 hook 对抗的第一轮实战（对应笔记 45、46）。
  - 推荐理由：root 检测、反调试、字符串加密层层递进，**Frida 实战入门公认第一站**。
- **[DIVA Android](https://github.com/payatu/diva-android)**
  - 类型 / 难度 / 价格：故意漏洞 App / 入门 / 免费
  - 适合场景：刚学完平台机制与存储/组件理论后的第一轮实操。
  - 推荐理由：Payatu 出品的老牌靶场，不安全存储、日志泄露、注入等基础问题一课一坑，节奏友好。
- **[InsecureBankv2](https://github.com/dineshshetty/Android-InsecureBankv2)**
  - 类型 / 难度 / 价格：综合漏洞 App / 中级 / 免费
  - 适合场景：组件安全与通信安全的综合审计练习（对应笔记 43、44）。
  - 推荐理由：模拟银行 App 的完整漏洞环境——组件导出、WebView 缺陷、不安全通信一应俱全，适合完整走一遍「审计→利用→修复」。
- **[OVAA (Oversecured Vulnerable Android App)](https://github.com/Oversecured/ovaa)**
  - 类型 / 难度 / 价格：综合漏洞 App / 中高 / 免费
  - 适合场景：进阶综合实战与 writeup 对照复现（对应笔记 46）。
  - 推荐理由：Oversecured 出品，聚合平台已知流行漏洞（deeplink 劫持、反序列化、路径遍历、硬编码密钥等），与博客文章一一对应，照着官方 writeup 复现效果最好。

### 平台与社区

- [TryHackMe](https://tryhackme.com/) — 在线平台 / 入门 / 部分免费。站内有移动安全相关模块（如 Android 恶意软件分析）与引导式房间，适合喜欢任务制学习的方式。
- [HackTheBox](https://www.hackthebox.com/) — 在线平台 / 中高 / 部分付费。Challenges 中有 Mobile 分类，可作 CTF 前的移动题练习场（具体题目随季节更新，从平台入口进入即可）。
- [看雪论坛 — 移动安全版块](https://bbs.pediy.com/) — 社区 / 全难度 / 免费（部分专栏收费）。国内移动安全研究质量最高的讨论区之一，逆向、脱壳、漏洞分析深度内容集中。
- [吾爱破解 — 移动安全区](https://www.52pojie.cn/) — 社区 / 入门→中级 / 免费。Android 逆向与脱壳实战氛围浓厚，教程贴多且手把手，适合入门期跟练（注意甄别内容用途，遵守版规与法律）。

> 说明：常见的「Mobile Hacking CheatSheet」「Corellium 博客」等因归属与现状未能核实，暂不收录；Codename「Android First」一类书名查无实据，不列。

## 四、工具索引

> 环境提示：分析环境建议用 **jadx（看代码）+ apktool（拆包回编）+ Frida（动态）** 起步，付费工具（JEB/IDA/Charles）等明确需要再投入；所有 root/注入操作只在模拟器或自有研究设备上进行。

### 静态分析（Static Analysis）

| 工具 | 链接 | 一句话说明 |
| --- | --- | --- |
| jadx | [github.com/skylot/jadx](https://github.com/skylot/jadx) | 开源 DEX→Java 反编译器，图形界面 + 命令行，日常 APK 逆向首选 |
| apktool | [apktool.org](https://apktool.org/) / [GitHub](https://github.com/iBotPeaches/Apktool) | 反编译/回编译 smali 与资源文件的标配，重打包与 Manifest 审计必用 |
| JEB | [pnfsoftware.com](https://www.pnfsoftware.com/) | 商业付费的 Android 逆向专业套件（smali/native/反混淆一体），工业级分析用 |
| Ghidra | [ghidra-sre.org](https://ghidra-sre.org/) | NSA 开源逆向框架，分析 APK 内 native so 库（ARM 汇编 + 反编译）主力 |
| IDA Pro | [hex-rays.com](https://hex-rays.com/) | 商业付费的逆向事实标准，native 层深度分析与调试首选（有免费版 IDA Free） |
| Bytecode Viewer | [github.com/Konloch/bytecode-viewer](https://github.com/Konloch/bytecode-viewer) | 聚合多个反编译引擎的开源查看器，单一引擎失效时拿来对照 |
| GDA | [gda.wiki](http://www.gda.wiki:9090/index.php?language=en) / [GitHub](https://github.com/charles2gan/GDA-android-reversing-Tool) | C++ 编写的轻量高速反编译器（Windows），不依赖 Java 环境，秒开大 APK |
| androguard | [github.com/androguard/androguard](https://github.com/androguard/androguard) | Python 分析库/CLI，可脚本化批量解析 APK 权限、组件与 Dalvik 字节码 |

### 动态分析（Dynamic Analysis）与 Hook

| 工具 | 链接 | 一句话说明 |
| --- | --- | --- |
| Frida | [frida.re](https://frida.re/) | 动态插桩（dynamic instrumentation）框架，注入 JavaScript hook 任意函数，移动安全动态分析的事实标准 |
| Objection | [github.com/sensepost/objection](https://github.com/sensepost/objection) | 基于 Frida 的运行时探索工具包，一条命令完成绕 SSL Pinning、hook 加密、调用方法等常用操作 |
| Xposed | [github.com/rovo89/Xposed](https://github.com/rovo89/Xposed) | 经典系统级 hook 框架（改 zygote 注入），原版早已停止维护，仅了解原理与老设备复现时使用 |
| LSPosed | [github.com/LSPosed/LSPosed](https://github.com/LSPosed/LSPosed) | 基于 Magisk/Zygisk 的现代 Xposed 实现（**项目已于 2024 年归档停更**，但仍被广泛使用），写 Xposed 模块做持久 hook |
| Magisk | [github.com/topjohnwu/Magisk](https://github.com/topjohnwu/Magisk) | 主流 root 方案（systemless），提供 Zygisk 与模块生态；**仅装在自有研究设备/模拟器上** |
| KernelSU | [github.com/tiann/KernelSU](https://github.com/tiann/KernelSU) | 基于内核的 root 与权限管理方案，新设备上 Magisk 的替代选择；同样**仅用于研究设备** |

### 网络抓包（Traffic Interception）

| 工具 | 链接 | 一句话说明 |
| --- | --- | --- |
| Burp Suite | [portswigger.net/burp](https://portswigger.net/burp) | HTTP(S) 抓包拦截代理事实标准（社区版免费），App 流量审计首选，用法同 Web 安全阶段 |
| mitmproxy | [mitmproxy.org](https://mitmproxy.org/) | 开源命令行抓包代理，支持 Python 脚本编程化处理流量，自动化测试好用 |
| Charles | [www.charlesproxy.com](https://www.charlesproxy.com/) | 付费的图形界面 HTTP 代理，上手门槛低、界面直观（付费许可证，有试用） |
| r0capture | [github.com/r0ysue/r0capture](https://github.com/r0ysue/r0capture) | 基于 Frida 的安卓应用层抓包「通杀」脚本，搞定证书绑定/双向校验抓不到流的场景 |

### 自动化框架

| 工具 | 链接 | 一句话说明 |
| --- | --- | --- |
| MobSF | [github.com/MobSF/Mobile-Security-Framework-MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF) | 一键式移动安全静态+动态分析框架，快速出报告，人工精分析的起点而非终点 |
| drozer | [github.com/ReversecLabs/drozer](https://github.com/ReversecLabs/drozer) | Android 组件（Activity/Provider/Service/广播）漏洞交互式测试框架，历经 MWR→F-Secure→WithSecure→Reversec 维护，导出组件 fuzz 必备 |
| Quark | [quark-engine.com](https://quark-engine.com/) / [GitHub](https://github.com/quark-engine/quark-engine) | 台湾团队开源的 APK 恶意行为规则评分引擎，用规则链判定敏感 API 调用链，恶意软件分析入门友好 |

### 脱壳与辅助（Unpacking）

| 工具 | 链接 | 一句话说明 |
| --- | --- | --- |
| FRIDA-DEXDump | [github.com/hluwa/FRIDA-DEXDump](https://github.com/hluwa/FRIDA-DEXDump) | 基于 Frida 的内存 DEX 转储脱壳工具，对多数一代/二代壳有效的第一手尝试方案 |
| BlackDex | [github.com/CodingGay/BlackDex](https://github.com/CodingGay/BlackDex) | 无需 root/免 hook 的安卓脱壳工具（App 形式运行），作为 FRIDA-DEXDump 失效时的备选 |

### 签名与打包（Signing & Packaging）

| 工具 | 链接 | 一句话说明 |
| --- | --- | --- |
| apksigner | [官方文档](https://developer.android.com/studio/publish/app-signing) | Android SDK Build-Tools 自带的 v1/v2/v3 方案签名与验签工具，重打包后必用 |
| zipalign | [官方文档](https://developer.android.com/studio/publish/app-signing) | SDK 自带的 APK 字节对齐工具，签名前的标准步骤 |
| uber-apk-signer | [github.com/patrickfav/uber-apk-signer](https://github.com/patrickfav/uber-apk-signer) | 一条命令完成对齐+debug 签名的封装工具，重打包调试省事神器 |
| keytool | [Oracle JDK 文档](https://docs.oracle.com/en/java/javase/21/tools/keytool.html) | JDK 自带密钥/证书管理工具，生成自签名 keystore 供测试签名用 |

## 五、学习路线建议

结合本仓库 `notes/41-46` 六篇移动安全笔记，建议按「**平台与安全模型（41）→ 静态分析与逆向（42）→ 组件安全（43）→ 数据存储与通信安全（44）→ Frida Hook 与动态分析（45）→ 漏洞复现与 CTF 实战（46）**」的顺序推进：先建立权限模型、签名机制、应用沙箱（sandbox）等平台心智模型，再进入工具链，每一篇的实验都落地到 `labs/` 独立子目录。靶场练手路线与之配套：**DIVA（跑通基础漏洞分类）→ OWASP UnCrackable L1–L4（练 Frida 与反调试对抗）→ InsecureBankv2（完整走一遍组件+通信+存储的综合审计）→ OVAA（对照 Oversecured 博客逐类漏洞复现）→ CTF Mobile 题（HackTheBox/TryHackMe 及各赛事）**。全部实操限制在模拟器（Android Studio AVD）或刷机的自有研究设备上，靶场 APK 只在隔离环境安装。

## 合规红线提醒

- 上述所有工具与靶场仅用于**本地隔离环境和明确授权的目标**；对他人的 App 做逆向/hook 前先确认当地法律与目标授权（例如 CTF 平台规则、漏洞披露政策）。
- Magisk/KernelSU 等 root 方案与脱壳工具只安装在**自有研究设备**上，不触碰日常主力机的支付与账号环境。
