# 18. 靶场实操指南：DVWA / WebGoat / Vulhub 等

> 日期：2026-11-04
> 所属大纲阶段：3. Web 安全（实操篇）
> 参考资料：
> - DVWA 官方仓库（digininja/DVWA，GitHub）与项目内 README
> - OWASP WebGoat 官方文档（OWASP/www-webgoat、webgoat.github.io）
> - Vulhub 官方文档（vulhub/vulhub 及 vulhub.org）
> - sqli-labs（audi-1/sqli-labs）、upload-labs（c0ny1/upload-labs）项目说明
> - PortSwigger Web Security Academy / TryHackMe / Hack The Box 官方学习路径页
> - 本仓库 AGENTS.md 安全与合规红线章节

---

## 0. 阅读前提与本文目标

- **前提**：Docker 基本操作（run/compose/ps）；读过本系列《17-Burp-Suite-使用指南》（靶场需配 Burp 使用）。
- **目标**：
  1. 独立部署 DVWA / SQLi-labs / upload-labs / WebGoat / Vulhub 五类靶场；
  2. 拿到一张「每个靶场练什么、按什么顺序练、练完对应哪篇笔记」的总地图；
  3. 建立规范的**复盘记录模板**与靶场隔离习惯。
- **合规声明**：本文全部环境**只允许运行在本地/隔离环境**（Docker、VM、仅监听 127.0.0.1）。所有攻击性操作仅对本地靶场有效。

---

## 1. 本地靶场为什么安全合法（对照 AGENTS.md 红线）

本仓库 AGENTS.md 的红线是：**所有实验仅限本地靶场或明确授权的环境；不触碰真实第三方系统；不生成实际用于攻击未授权系统的工具或载荷。**

本地靶场恰好同时满足三个条件：

1. **授权主体明确**：靶场软件本身就是「设计出来被人攻击」的，作者在许可证中授权任意本地使用——不存在「未授权访问」；
2. **无第三方受损**：容器跑在自己机器上，攻击流量不出本机回环口；
3. **学习闭环**：每个漏洞同时给出 Low/Impossible 源码，「利用 + 修复」成对学习，符合防御导向。

**红线的操作化翻译**（务必遵守）：

- 端口映射一律 `-p 127.0.0.1:PORT:80`，不用 `-p 80:80`（后者会监听所有网卡）；
- 不把靶场部署到云服务器公网 IP「方便随时玩」；
- 靶机内所谓「攻击代码」只在本机回环流量内使用，不二次分发；
- 看到互联网上「和我靶场长得一样」的站（搜到的 DVWA 登录页）——那是别人的失误，不是你的邀请函，**不碰**。

---

## 2. DVWA 详解

### 2.1 Docker 部署完整命令

方式一：单容器（最快）：

```bash
# 环境：本机已装 Docker；镜像为社区维护的 vulnerables/web-dvwa
docker run -d --name dvwa \
  -p 127.0.0.1:4280:80 \
  vulnerables/web-dvwa
# 浏览器打开 http://127.0.0.1:4280
```

方式二：docker-compose（推荐，便于固定端口与重建）：

```yaml
# 文件：labs/dvwa/docker-compose.yml
services:
  dvwa:
    image: vulnerables/web-dvwa
    container_name: dvwa
    restart: unless-stopped
    ports:
      - "127.0.0.1:4280:80"   # 只绑定回环，绝不出本机
    # 可选：固定内部网络，见第 10 章
    networks:
      - labnet

networks:
  labnet:
    driver: bridge
```

```bash
cd labs/dvwa && docker compose up -d
```

### 2.2 初始化 setup 与默认账号

1. 首次访问 `http://127.0.0.1:4280/` 跳到 `setup.php`（或 `setup.php` 页面）；
2. 页面底部点 **Create / Reset Database**——它会创建 `dvwa` 库并写入测试数据；
3. 成功后自动跳登录页，**默认账号 `admin / password`**（另有 `gordonb / abc123` 等 5 个低权用户，用于越权类练习）；
4. 数据库连不上时：进容器检查 `/var/www/html/config/config.inc.php` 的 DB 配置——单容器镜像已内嵌 MySQL 并配好连接，无需外部数据库；页面用默认账号 `admin / password` 登录即可，一般无需改动配置。

### 2.3 安全级别与 Impossible 代码的意义

DVWA 每个漏洞模块都有四档，在左下角 DVWA Security 切换：

| 级别 | 含义 | 学习用法 |
|---|---|---|
| **Low** | 无任何防护，教科书式漏洞 | 观察漏洞本质行为、最短利用路径 |
| **Medium** | 加了一层「典型的错误防御」（黑名单、简单转义） | 学习**绕过技巧**，理解「为什么这层挡不住」 |
| **High** | 更严的防护，通常仍有逻辑缺口 | 训练靶场/CTF 式思路（token、二次编码） |
| **Impossible** | 参考实现：参数化查询、CSRF token、白名单、prepared statement | **最重要的一档**：逐行读源码，作为编码规范范本 |

**Low → Impossible 的代码 diff 阅读方法**（本仓库推荐的核心练习法）：

1. Low 档打通后，点右下角 **View Source** 复制源码；
2. 切 Impossible 档再复制源码；
3. 用 `diff` 或 VS Code Compare 对比：

```bash
diff low.php impossible.php
```

4. 对每处差异追问三连：**改了什么？防住了哪个攻击？为什么这样写是「正确姿势」？**
5. 把答案写进复盘表（第 11 章模板）——这一步把「会打」升级为「会防」。

### 2.4 模块清单与学习目标

| 模块 | 一句话学习目标 | 对应笔记 |
|---|---|---|
| **Brute Force** | 爆破无防护 vs 有 token/限速的攻击成本差异 | 《16-认证与会话管理》 |
| **Command Injection** | 管道/分号拼接命令，Medium 黑名单为何形同虚设 | 系统安全篇（命令注入主题，编号见 notes/ 目录） |
| **CSRF** | 跨站请求伪造的构造与 token/同源校验 | 《13-CSRF-与-SSRF》 |
| **File Inclusion (LFI/RFI)** | 路径拼接包含任意文件、协议包装器 | 文件包含笔记（编号见目录，暂缺时以 OWASP 资料替代） |
| **File Upload** | 上传校验（MIME/扩展名/内容）各层绕过与最终「重命名+隔离存储」 | 《14-文件上传漏洞》 |
| **Insecure CAPTCHA** | 验证码只做前端/可重放时形同虚设 | 《16-认证与会话管理》 |
| **SQL Injection / Blind** | union/报错/布尔盲注/时间盲注，参数化查询对照 | 《11-SQL-注入》 |
| **SQLi (SQLite)** | 不同数据库方言的差异意识 | 《11-SQL-注入》 |
| **XSS (Reflected/Stored/DOM)** | 反射/存储/DOM 三类注入点与转义时机 | 《12-XSS-跨站脚本》 |
| **CSP Bypass** | 内容安全策略配置缺陷的绕过 | 《12-XSS-跨站脚本》 |
| **JavaScript** | 前端逻辑逆向（解码/隐藏逻辑） | 《12-XSS-跨站脚本》 |
| **Weak Session IDs** | 会话 ID 可预测的危害 | 《16-认证与会话管理》 |
| **Content Security Policy / 文档类页面** | HTTP 安全响应头认知 | Web 安全基础笔记（编号见目录） |

> 交叉模块联动提示：File Upload（Low，直接传 `.php`）打通后，若想拿到 WebShell 的**持久化**理解，可串起 File Inclusion + Command Injection 三关做一次「组合演练」——这正是真实攻击链的微缩版，做完写进复盘表。

### 2.5 推荐学习路线

**顺序**（约 3–4 周，每模块 2–4 小时）：

```text
第 1 周：SQL Injection → SQL Injection (Blind) → Brute Force
        （先把「输入→后端」的直观感受建立起来）
第 2 周：XSS Reflected → XSS Stored → XSS DOM → CSP Bypass
第 3 周：File Inclusion → File Upload → Command Injection
第 4 周：CSRF → Insecure CAPTCHA → Weak Session IDs → JavaScript
```

- 每模块固定流程：**Low 打通 → View Source 读懂 → Medium/High 尝试绕过 → Impossible diff 复盘 → 写复盘表**；
- Burp 全程挂代理（见《17-Burp-Suite-使用指南》第 15 章节奏）；
- 同一漏洞在四档下的**请求层面差异**（不是页面层面）用 HTTP history 对比，培养流量思维。

---

## 3. SQLi-labs

### 3.1 部署

```bash
docker run -d --name sqli-labs \
  -p 127.0.0.1:4281:80 \
  acgpiano/sqli-labs
# 访问 http://127.0.0.1:4281 首页点 "Setup / Reset DB for labs" 初始化
```

### 3.2 关卡结构（Less 1–75+）

| 区段 | 类型 | 说明 |
|---|---|---|
| Less 1–10 | GET 基础 | 数字/字符型、单双引号/括号闭合，union 与报错注入 |
| Less 11–16 | POST 登录框 | 表单注入（配合 Burp Repeater） |
| Less 17–18 | UPDATE / Header 注入 | 修改密码处注入、UA/Referer 头注入 |
| Less 19–22 | Header/Cookie 注入 | Referer、Cookie 字段 |
| Less 23–37a | 绕过过滤 | 注释符被过滤、空格/WAF 类绕过 |
| Less 38–53 | 堆叠注入（Stacked） | `;` 多语句（mysqli_multi_query） |
| Less 54–65 | 挑战关 | 限时限量盲注训练（次数限制） |
| 之后 | 盲注/二次注入等进阶 | 按需 |

### 3.3 推荐前 20 关路线

```text
1–4  ：理解闭合类型（'  "  无引号  (") ），手写 union 1 次成型
5–6  ：报错注入（extractvalue/updatexml）
8–10 ：布尔盲注与时间盲注（sleep/benchmark 判断）
11–13：POST 场景（Burp 改包，登录框）
14–16：双引号/括号变体 + 报错
17   ：UPDATE 语句注入（先抓包看流程）
18–20：Header 注入（UA/Referer）
```

**Less 1–10 闭合方式速查表**（先自己试出来再对照）：

| 关卡 | 注入点 | 闭合方式 | 推荐打法 |
|---|---|---|---|
| Less-1 | GET id | `'$id'` 单引号 | `1' order by 3--+` 定列数 → union |
| Less-2 | GET id | `$id` 数字型 | 直接拼接 |
| Less-3 | GET id | `('$id')` 单引号+括号 | `1') --+` |
| Less-4 | GET id | `("$id")` 双引号+括号 | `1") --+` |
| Less-5 | GET id | 单引号，无回显位 | 报错注入（updatexml） |
| Less-6 | GET id | 双引号，无回显位 | 报错注入 |
| Less-7 | GET id | `((''))` | outfile 写文件（了解条件苛刻） |
| Less-8 | GET id | 单引号，纯盲 | 布尔盲注（and 1=2 看页面差异） |
| Less-9 | GET id | 无任何差异 | 时间盲注（if+sleep） |
| Less-10 | GET id | 双引号，纯盲 | 同 9 |

- 每关先手注（手工构造），再上 sqlmap 对照（`-u "http://127.0.0.1:4281/Less-1/?id=1" --batch --dbs`），理解工具每个请求在做什么；
- 记录每关**闭合方式 + 注入类型**两列，形成自己的速查表；
- `--+` 与 `#` 都是注释符，`+` 在 URL 里是空格——理解这个细节能解释很多「为什么 payload 不生效」。

---

## 4. upload-labs

### 4.1 部署

```bash
docker run -d --name upload-labs \
  -p 127.0.0.1:4282:80 \
  c0ny1/upload-labs
# 访问 http://127.0.0.1:4282
```

### 4.2 关卡结构简表

| 关 | 考点 | 一句话提示 |
|---|---|---|
| Pass-01 | 前端 JS 校验扩展名 | Burp 改包即过；体会「前端校验=没有校验」 |
| Pass-02 | MIME 类型校验 | 改 Content-Type |
| Pass-03 | 黑名单——特殊后缀 | `.php5/.phtml` 等可解析变体 |
| Pass-04 | 黑名单——`.htaccess` | 上传 `.htaccess` 让图片后缀按 PHP 解析（容器配置风险） |
| Pass-05–08 | 大小写/空格/点/`::$DATA` | Windows 特性与绕过 |
| Pass-09/10 | 点空格点 / 双写 | 后缀清洗逻辑缺陷 |
| Pass-11/12 | `%00` 截断（GET/POST） | 仅旧版 PHP 生效，理解历史 |
| Pass-13–15 | 文件头检查（GIF89a / getimagesize / exif_imagetype） | 图片马（真图头）+ 包含漏洞联动 |
| Pass-16 | 二次渲染 | 理解服务端重处理 |
| Pass-17/18 | 条件竞争 | 理解 TOCTOU |
| Pass-19 | move_uploaded_file / `%00` 截断 | 保存名可控时的截断陷阱 |
| Pass-20/21 | 数组参数绕过（Pass-21 为变体） | `save_name[]` 参数解析差异 |

- 练习目标不是「过全关」，而是每关总结**「校验发生在哪一层、为什么可绕、正确做法是什么」**，对照 DVWA File Upload Impossible 源码（重命名 + 白名单 + 存储隔离 + 不执行目录）。

---

## 5. WebGoat（Java 靶场）

### 5.1 定位与部署

WebGoat 是 OWASP 官方维护的 **Java 技术栈**教学靶场：不是「闯关游戏」，而是**每节课带讲解文档的互动课程**——左边读原理，右边直接输入 payload 验证，系统即时判分。

```bash
docker run -d --name webgoat \
  -p 127.0.0.1:8080:8080 -p 127.0.0.1:9090:9090 \
  -e TZ=Asia/Shanghai \
  webgoat/webgoat
# 8080 为课程端（http://127.0.0.1:8080/WebGoat）
# 9090 为 WebWolf（配套的"攻击者服务器"，用于接收外带数据练习）
```

登录说明：首次访问 `http://127.0.0.1:8080/WebGoat` 进入注册/登录页——既可在页面上注册新账号，也可直接用默认账号 `webgoat / webgoat` 登录。

### 5.2 课程结构与适合阶段

| 课程板块 | 内容 | 适合阶段 |
|---|---|---|
| General | HTTP 基础、代理使用 | 大纲阶段 1（基础） |
| Injection Flaws | SQL/命令/日志注入 | 阶段 3（Web 安全） |
| Broken Authentication / Access Control | 认证、越权 | 阶段 3，与《16》配套 |
| Cross-Site Scripting | XSS 三类 | 阶段 3，与 XSS 笔记配套 |
| Insecure Deserialization | Java 反序列化专章 | 阶段 3，**与《15-反序列化漏洞》第 3 章配套（Java 实操首选）** |
| XXE / SSRF / JWT / Crypto | 进阶主题 | 阶段 3 后期 |
| Client Side / Web Socket 等 | 前端与协议 | 按需 |

- **WebGoat 的独特价值**：与 Java 企业开发栈最贴近（JSP/Spring 生态），想理解「Java 项目为什么会被反序列化打穿」就练它；
- 学习节奏建议：读完《15》第 3 章后进 WebGoat 的 Insecure Deserialization 课程，把 CC 链与 ysoserial 的认知落到可操作层面。

---

## 6. Vulhub（按 CVE 复现的靶场框架）

### 6.1 是什么

Vulhub 把每个历史漏洞做成一个**带漏洞版本服务的 docker-compose 目录**（复现后即拆），是目前最系统的「漏洞复现底座」。它不是入门练习场——**每个条目都要求你先懂原理再复现**。

### 6.2 用法

```bash
git clone https://github.com/vulhub/vulhub.git ~/tools/vulhub
cd ~/tools/vulhub/shiro/CVE-2016-4437   # 例如 Shiro 反序列化
docker compose version                   # 打印 Compose 自身版本号
docker compose config                    # 校验并打印该目录编排的最终定义（镜像/端口/卷一目了然）
docker compose up -d                     # 起靶场
docker compose down -v                   # 复现完销毁（-v 连卷一起删，防脏数据残留）
```

> 注意：`docker compose -v` / `docker compose version` 只是打印 Compose 版本号，不能查看或校验编排内容；需要核对编排定义时用 `docker compose config`，或直接 `cat docker-compose.yml` 读懂再起。

### 6.3 按 CVE 复现的规范流程与记录模板

```text
① 选定 CVE：读官方通告/补丁 diff，一句话写清漏洞原理与影响版本
② 起环境：compose up；curl 验证服务存活
③ 验证存在性：先无害探测（版本指纹、报错、回显特征）——不直接打利用链
④ 复现利用：最小化 payload（弹计算器/whoami 级别），仅限本机回环
⑤ 复盘：调用栈/流量特征，整理检测规则（对照《15》第 8 章思路）
⑥ 防御验证：查补丁版本，起修复版本容器对比请求差异
⑦ 销毁：compose down -v；清理 payload 文件
```

记录模板（写入 `labs/<cve-编号>/README.md`）：

```markdown
# CVE-XXXX-XXXXX 复现记录
- 环境：vulhub 路径 + 镜像版本（含 commit hash）
- 原理：三行以内
- 复现步骤：请求/命令级粒度（可复跑）
- 流量特征：供检测规则使用的指纹
- 根因与修复：补丁链接 + 修复方式一句话
- 截图：存放于同目录 screenshots/
```

### 6.4 推荐起步清单（按大纲阶段排序）

| Vulhub 条目 | 漏洞 | 阶段 | 配套笔记 |
|---|---|---|---|
| `shiro/CVE-2016-4437` | Shiro rememberMe 反序列化（默认密钥） | 3 | 《15-反序列化漏洞》3.4 |
| `fastjson/1.2.24-rce` | Fastjson @type 多态反序列化 | 3 | 《15-反序列化漏洞》3.5 |
| `weblogic/CVE-2017-10271` | WebLogic WSDL 反序列化 | 3 | 《15-反序列化漏洞》3.6 |
| `struts2/s2-045` | 基于 Content-Type 的 OGNL 注入 | 3 | OWASP 相关资料 |
| `log4j/CVE-2021-44228` | Log4Shell JNDI 注入 | 3/6 | 供应链安全笔记 |
| `weblogic/CVE-2019-2725` 等 | 二次反序列化变体 | 3（进阶） | 《15》同上 |
| `mysql/CVE-2012-2122` | 认证绕过（经典理解型） | 3 | 《16-认证与会话管理》 |

> 复现顺序建议：**先通读《15》再动 Shiro/Fastjson 条目**——Vulhub 假设你懂原理，README 只给「起环境 + 起利用端」的最小说明。每个条目完成后按 6.3 模板归档，这些记录就是你的「漏洞案例库」。

---

## 7. bwapp / Pikachu 一句话简介

- **bWaaS/bWAPP**：Bug 单巨多的「全科」PHP 靶场（100+ 漏洞类型），适合做**漏洞类型字典式扫描练习**；部署同 Docker 模式（`sajari/bwapp`，注意绑定回环）。
- **Pikachu**：中文界面的国产 PHP 练习场，分类清晰、对新手友好，适合在 DVWA 之前**先用它熟悉每类漏洞的最裸形态**；同样仅本地。

---

## 8. 进阶平台衔接：HTB / TryHackMe / PortSwigger Academy

三个平台都是**授权的**在线靶场（平台自有环境，规则允许攻击），从本地过渡到它们不违反红线——但**只允许打平台分配给你的目标**。

| 平台 | 定位 | 建议衔接时机与模块 |
|---|---|---|
| **PortSwigger Web Security Academy** | 免费的 Web 漏洞百科 + 在线实验室（Burp 官方），每个主题从原理到实验闭环 | **大纲阶段 3 全程配餐**：学完本仓库某主题笔记 → 做对应模块实验室；进阶走它的「Bug bounty methodology / OAuth / JWT / HTTP request smuggling」专题 |
| **TryHackMe** | 引导式房间（Room），从零到中级，路径化 | 阶段 3 中后期：「Complete Beginner → Jr Penetration Tester」路径里的 Web 模块；阶段 5 时做 nmap/Wireshark 房间 |
| **Hack The Box** | 更自由的实战盒子（Starting Point → Easy → Medium） | 阶段 7（CTF 实战）：Web 为主 starting point 机器；配合阶段 4 学完二进制后再碰 Pwn 向 |

**PortSwigger Academy 学习路径推荐（阶段 3 的「课后作业」）**：

```text
① Server-side topics: SQL injection → Authentication → Path traversal →
   Command injection → Business logic vulnerabilities
② Client-side topics: XSS → CSRF → CORS → Clickjacking
③ 表面之下: Web cache poisoning / HTTP request smuggling（进阶选修）
④ 与工具结合: Burp Suite 实验室系列（巩固《17》）
```

**模块与本仓库笔记对照表**（学完笔记 → 做对应在线实验室，双向验证）：

| PortSwigger 模块 | 对应本仓库笔记 |
|---|---|
| SQL injection | 《11-SQL-注入》 |
| Cross-site scripting (XSS) | 《12-XSS-跨站脚本》 |
| CSRF / CORS | 《13-CSRF-与-SSRF》 |
| Authentication / OAuth / JWT | 《16-认证与会话管理》 |
| File upload / File path traversal | 文件上传/包含笔记（编号见目录） |
| Insecure deserialization | 《15-反序列化漏洞》 |
| Web cache deception 等 API 专题 | 阶段 3 后进阶阅读 |
| Burp Suite 系列 | 《17-Burp-Suite-使用指南》 |

- 做在线实验室时同样按五要素记录（平台路径截图即可，无需本地环境）；
- 每完成一个模块，回头补做 DVWA 对应关卡的 Impossible diff——「在线实验（陌生环境）+ DVWA（已知源码）」双轨交叉最扎实。

---

## 9. 刷靶场方法论

### 9.1 lab 记录表（五要素复盘模板）

每个实验在 `labs/<实验名>/` 建一份记录，五要素缺一不可：

```markdown
| 要素 | 内容示例 |
|---|---|
| 环境 | DVWA v1.9/镜像 digest、Burp 版本、浏览器、日期 |
| 漏洞类 | 反射型 XSS（Reflected XSS）——CVSS/OWASP 分类 |
| 利用步骤 | 请求级粒度：原始请求 → 修改点 → 响应证据（截图编号） |
| 根因 | 输出编码缺失：HTML 上下文未做实体转义（白盒源码行号） |
| 修复建议 | 输出侧按上下文编码（模板引擎 autoescape / OWASP Java Encoder）；CSP 作为纵深 |
```

> 关键习惯：**利用步骤要写到「别人照着能复跑」**；根因要落到代码/配置层，不许写「系统不安全」这种废话。

**填好的示例**（`labs/01-dvwa-sqli/README.md` 节选，可直接当模板）：

```markdown
# 实验：DVWA SQL Injection (Low)

- 环境：DVWA 镜像 vulnerables/web-dvwa@sha256:xxxx（docker images --digests 查）
       Burp Community 2024.x + Firefox，2026-11-04，127.0.0.1:4280
- 漏洞类：SQL 注入（SQL Injection）——union 联合查询型，OWASP Top10 A03
- 利用步骤：
  1. GET /vulnerabilities/sqli/?id=1'&Submit=Submit → 响应含 SQL 语法错误，确认单引号闭合
  2. id=1' order by 3--+ 报错、order by 2 成功 → 2 列
  3. id=1' union select user(),database()--+ → 返回 admin/dvwa
  4. 证据截图：screenshots/01-error.png、02-union.png
- 根因：源码 vulnerabilities/sqli/source/low.php 第 12 行直接字符串拼接
       `$query = "SELECT ... WHERE user_id = '$id';";` 无参数化、无转义
- 修复建议：PDO 预编译（impossible.php 同文件即参考实现）；
           输入侧白名单校验 is_numeric 作为纵深；错误信息统一不回传
```

> 复盘表里「根因」一行必须能定位到**文件/行号/配置项**——写不出来说明还没读 View Source，回炉。

### 9.2 变体测试

打通一个点后不要立刻走，做三组变体：

1. **输入变体**：大小写、编码（URL/Unicode/HTML 实体）、等价语法（`<img onerror>` vs `<svg onload>`）——验证过滤是黑名单还是白名单；
2. **位置变体**：同一 payload 换注入点（参数名、Header、JSON 键、路径段）；
3. **上下文变体**：同一漏洞在不同安全级别/不同模块是否同因（比如 DVWA 里 XSS 与 CSP Bypass 的联动）。

变体结论写进复盘表——**变体表就是你的「绕过手法库」**。

### 9.3 时间管理

- 单卡单次专注 45–90 分钟；卡住 30 分钟无进展 → 看提示/WriteUp 的「思路一节」而不是全答案，隔天重做；
- 每周固定「复盘日」：只整理记录表、重读自己的利用步骤、不看答案重打 1 个旧关卡；
- 用四档难度控制节奏：第一遍只求 Low+Medium 打通，High/Impossible 放到第二遍（螺旋上升）。

---

## 10. 靶场隔离注意事项

1. **端口只绑回环**：所有 `-p` 前缀 `127.0.0.1:`；需要手机/VM 访问时，改绑内网网卡并加防火墙规则，用完即改回；
2. **Docker 网络隔离**：靶场放独立 bridge 网络（第 2.1 节 `labnet`），与默认网络隔离；多靶场互联（如 WebGoat+WebWolf）放同一 labnet 内；

   ```bash
   # 建立专用隔离网络，靶场全部接入它
   docker network create --driver bridge labnet
   docker run -d --name dvwa --network labnet -p 127.0.0.1:4280:80 vulnerables/web-dvwa
   # 验证：容器只能访问 labnet 内成员与网关，不会混入其他默认网络
   docker network inspect labnet
   ```

3. **不暴露公网**：家用路由不做端口映射；云服务器上跑靶场必须用安全组只放行自己 IP，或干脆只跑在本地；
4. **容器不挂敏感目录**：不给靶场容器 `-v` 挂载宿主机家目录；镜像只用官方/高星仓库并核对 digest；
5. **用完即关**：`docker compose down -v` 销毁；长期不用的镜像定期清理；
6. **payload 文件管理**：exp/字典只存 `labs/` 下对应目录，命名带 `仅靶场` 语义；不进入个人网盘/仓库公开分支；
7. **快照回滚（VM 场景）**：若在虚拟机里跑无 Docker 版靶场，攻击实验前先打快照，实验后回滚——既防残留，也防实验失败卡死环境。

---

## 11. 本仓库 labs/ 目录使用约定（与 AGENTS.md 一致）

- `labs/` 每个实验独立子目录：`labs/<NN-实验名>/`（如 `labs/01-dvwa-sqli/`）；
- 子目录内至少包含：`README.md`（五要素复盘）、`docker-compose.yml`（若适用）、`screenshots/`；
- 攻击性脚本（exp）只允许写在实验目录内，且文件头注释**运行环境与「仅限本地靶场」声明**；
- 靶场 compose 文件统一 `127.0.0.1` 端口前缀 + 独立 labnet；
- 不提交大字典与真实攻击数据；字典引用 SecLists 等来源链接即可。

---

## 12. 常见误区

1. **「靶场打通=会渗透」**——靶场是「去掉了复杂性」的模型；真实场景的一半工作量在信息收集与业务理解；
2. **「直接跑 sqlmap/工具过关」**——工具过关等于没学；先手注（能解释每一步）再用工具对照；
3. **「只看 High 档 payload 收藏夹」**——不看 Impossible 源码的靶场学习只完成了 30%；防御视角在 diff 里；
4. **「复现 CVE 时直接粘全量攻击脚本」**——跳过无害验证一步，既学不到指纹，也容易在错误环境触发意外行为；
5. **「靶场挂公网方便远程玩」**——被真实攻击者驻留挖矿/做跳板的案例极多，见第 10 章；
6. **「一个 Docker 的事，不需要记录」**——不复盘的靶场时间一周后归零；记录表是主要产出物；
7. **「WriteUp 看一遍就过」**——看懂≠会做，隔天盲打验证；
8. **「平台账号随便注册小号」**——HTB/THM 等平台有明确使用条款，一台机器多人协作/共享账号可能违反规则，按平台规矩来。

---

## 13. 自测问题

1. DVWA 四个安全级别各自的教学定位是什么？哪一级最重要、为什么？
2. 描述「Low → Impossible diff 阅读法」的完整步骤与「三连问」。
3. DVWA Brute Force High 档的 user_token 对爆破造成什么影响？对应服务端的**正确**防御应该是什么（提示：不是 token 本身）？
4. SQLi-labs 前 20 关你打算按什么顺序做？每关需要记录的两列是什么？
5. upload-labs Pass-01/02 分别考什么？「前端校验/后端 MIME 校验」的正确替代方案是什么？
6. WebGoat 与 DVWA 的本质差异？为什么学 Java 反序列化优先 WebGoat？
7. Vulhub 复现七步流程中「无害验证」为什么排在「利用」之前？给出两个无害验证示例。
8. 五要素复盘模板是哪五要素？哪一要素最容易写成废话、应该怎么写？
9. 变体测试三组变体分别是什么？它们分别验证过滤器的什么性质？
10. `-p 4280:80` 与 `-p 127.0.0.1:4280:80` 的区别是什么？哪种是本仓库约定？为什么？
11. PortSwigger Academy / TryHackMe / HTB 各自适合大纲的哪个阶段？给出你的三阶段衔接计划。
12. 场景题：同事把 DVWA 起在了公司测试服务器 `0.0.0.0:80`，你发现的当下应该建议他做哪三件事？

---

## 附：靶场端口分配约定（避免互相踩端口）

| 靶场 | 本地端口（127.0.0.1） |
|---|---|
| DVWA | 4280 |
| SQLi-labs | 4281 |
| upload-labs | 4282 |
| WebGoat / WebWolf | 8080 / 9090 |
| Vulhub 各条目 | 按其 compose 默认，起前先 `docker ps` 查占用 |
