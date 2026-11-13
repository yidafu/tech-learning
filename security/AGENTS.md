# AGENTS.md — 计算机安全学习工作区

## 工作区用途

本工作区是用户（一名开发者）深度学习计算机安全知识的学习空间。产出物以学习笔记（Docusaurus 文档站）、大纲、实验记录为主。

- 用户偏好：中文交流与中文笔记；有开发背景，可直接阅读代码，编程概念无需从零解释。
- 定位：以防御为导向的安全学习（defensive security / 安全研究 / CTF），不做任何未授权攻击。

## 目录约定

- 站点根 = 工作区根：Docusaurus 3.x 文档站。常用命令：`npm run dev`（本地开发）/ `npm run build`（构建，`onBrokenLinks: throw`）/ `npm run serve` / `npm run clear`（清缓存）。搭建与维护手册：`DOCUSAURUS-SETUP.md`。
- `docs/` — 站点内容即学习笔记。每个阶段一个子目录（`01-fundamentals` … `08-android-security`、`09-cloud-native-security`，`10-topics` 横向专题篇，外加 `11-resources` 资源索引）：目录内 `README.md` 自动成为分类索引页，笔记沿用 `NN-主题.md` 编号命名（编号全局连续，不因后补重排），`_category_.json` 控制分类排序。注意 URL 会剥掉数字前缀（如 `/docs/fundamentals`）。
- `docs/index.md` — 总索引/学习路线页（导航栏「总索引」）；新增笔记后需同步维护其链接表。
- `notes/_archive/` — 旧版笔记归档，留在 docs 外、不参与编译。
- `labs/` — 动手实验代码与记录（留在 docs 外），每个实验独立子目录；只允许在本地隔离环境（VM、Docker、故意设计漏洞的靶机如 DVWA/WebGoat）中操作。
- `src/`、`static/` — 首页组件、自定义样式与静态资源（Docusaurus 约定）。

## 学习大纲（总路线）

1. **基础** — 计算机网络（TCP/IP、HTTP/S）、操作系统（进程/内存/权限）、Linux 命令行、Python/C 基础加固。
2. **安全基础概念** — CIA 三元组、威胁建模、常见漏洞分类（OWASP Top 10、CWE/CVE）、密码学基础（对称/非对称、哈希、TLS）。
3. **Web 安全** — SQL 注入、XSS、CSRF、SSRF、文件上传、文件包含（LFI/RFI）、反序列化、认证与会话管理；Burp Suite 使用；靶场实操。
4. **系统与二进制安全** — x86-64 汇编、程序内存布局、栈/堆溢出、ROP、格式化字符串；工具：gdb/pwndbg、ghidra、objdump。
5. **网络安全与防御** — nmap、Wireshark、防火墙/IDS 概念、日志分析、渗透测试方法论（PTES/OWASP WSTG）。
6. **安全工程** — 安全编码规范、依赖供应链安全、密钥管理、安全 SDLC、应急响应基础。
7. **CTF 实战** — 按 Web/Pwn/Crypto/Reverse/Misc 分类刷题（picoCTF → HackTheBox/TryHackMe），复盘写入 `docs/07-ctf/`。

另有扩展阶段 8（Android 安全，`docs/08-android-security/`）、扩展阶段 9（云原生安全，`docs/09-cloud-native-security/`：容器隔离与逃逸 / Kubernetes 攻击面 / 镜像与供应链）与横向专题篇（`docs/10-topics/`），详见 `docs/index.md`。

## 内容清单（当前笔记地图）

- 阶段 1—7：笔记 01—40（基础 / 安全概念 / Web / 二进制 / 网络防御 / 安全工程 / CTF），见 `docs/index.md` 完整索引。
- 阶段 8（扩展·Android）：笔记 41—46（`docs/08-android-security/`）。
- 阶段 9（扩展·云原生）：笔记 49—51（`docs/09-cloud-native-security/`）——49 容器隔离原理与逃逸、50 Kubernetes 攻击面与防御、51 容器镜像与供应链安全。
- 横向专题篇：笔记 47（`docs/10-topics/`，近年重大 CVE 剖析）。
- Web 安全阶段 2026-11-13 补全缺口：笔记 48 文件包含（LFI/RFI），归 `docs/03-web-security/`（编号全局连续，故为 48 而非 19）。

## 安全与合规红线

- 所有实验仅限本地靶场或明确授权的环境；不触碰真实第三方系统。
- 不生成、不留存实际用于攻击未授权系统的工具或载荷；示例代码需可运行于靶场且带说明。

## 写作约定

- 笔记用简体中文，术语首次出现标注英文原文（如「跨站脚本（XSS）」）。
- 每篇笔记开头写：日期、所属大纲阶段、参考资料来源。
- 代码示例注明运行环境与前提（OS、依赖、靶场版本）。
- `.md` 按纯 Markdown 解析（不走 MDX）；画图直接写 ```` ```mermaid ```` 代码块（theme-mermaid 已启用）；裸 URL 务必用反引号包成行内代码，否则 URL 后紧跟全角标点会导致构建失败（详见 `DOCUSAURUS-SETUP.md` 踩坑清单）。
- 需要嵌 React 组件时新建 `.mdx`；组件放 `src/components/`。

## 当前状态

- 2026-11-04 初始化；2026-11-06 引入 Docusaurus 文档站（Docusaurus 3.10.2 / Node 24 / npm 11），原 `notes/` 47 篇笔记与 `resources/` 已迁入 `docs/`，构建 0 错误 0 告警、serve + curl 验收通过。
- 2026-11-13 新增扩展阶段 9 云原生安全（`docs/09-cloud-native-security/`，笔记 49—51）与 Web 安全文件包含笔记 48；`09-topics`/`10-resources` 目录前缀相应顺移为 `10-topics`/`11-resources`（URL 不变，数字前缀会被剥掉）。
- 新增笔记流程：放入对应阶段目录（`NN-主题.md`）→ 同目录 `README.md` 清单补链接 → `docs/index.md` 总索引补链接 → `npm run build` 验证无死链。
