# CTF 平台与工具索引

> 日期：2026-11-04
> 所属大纲阶段：参考资料
> 配套文件：`02-课程与在线资源.md`（课程与社区）、`notes/35-CTF-入门指南.md` 及方向笔记

## 一、CTF 平台大全

| 名称 | 网址 | 难度 | 形式 | 特点 |
| --- | --- | --- | --- | --- |
| picoCTF | <https://picoctf.org> | 入门 | Jeopardy（解题夺旗） | CMU 出品的新手友好型年度赛，题目提示多、难度曲线缓 |
| picoGym | <https://picoctf.org>（Practice 页） | 入门 | Jeopardy | picoCTF 历年真题的永久免费练习场，随到随刷 |
| CTFtime | <https://ctftime.org> | — | 日历 + 归档 | 全球 CTF 赛事日历、队伍积分排名与 writeup 聚合（用法见下） |
| BUUCTF | <https://buuoj.cn> | 入门→进阶 | 在线题库 | 国内最大的 CTF 在线题库，收录大量历年真题并提供**在线复现环境**（含部分 Pwn 远程环境），适合系统性刷题 |
| 攻防世界 | <https://adworld.xctf.org.cn> | 入门→进阶 | 分类题库 | XCTF 联赛出品，按 Web/Pwn/Reverse/Crypto/Misc 分区，配套练习模式 |
| CTFHub | <https://www.ctfhub.com> | 入门→进阶 | 技能树 + 靶场 | 按技能树组织的国内平台，每类考点配即开即用的环境，适合补短板 |
| HackTheBox | <https://www.hackthebox.com> | 进阶 | 靶机 + Academy | 接近真实场景的靶机平台（另有结构化课程 Academy），见 `02-课程与在线资源.md` |
| TryHackMe | <https://tryhackme.com> | 入门 | 房间制路径 | 引导式任务 + 问答，新手路径友好（Pre Security → Cyber Security 101） |
| pwnable.kr | <https://pwnable.kr> | 入门→进阶 | SSH 关卡 | Pwn 入门站：fd / collision / bof 三题必做 |
| pwnable.tw | <https://pwnable.tw> | 进阶 | SSH 关卡 | pwnable.kr 的进阶版，题量少而精、保护机制齐全 |
| CryptoHack | <https://cryptohack.org> | 入门→进阶 | 模块化挑战 | 密码学方向最佳平台，每关自带讲义 |
| Cryptopals | <https://cryptopals.com> | 进阶 | Set 1—8 编程挑战 | 密码工程经典挑战（原 Matasano 出品）：用代码实现并攻破真实密码方案，Crypto 方向必刷 |
| OverTheWire | <https://overthewire.org> | 入门 | SSH 关卡 | Bandit（Linux）→ Natas（Web）→ Narnia/Behemoth（二进制） |

**CTFtime 使用方法**：

1. **找比赛**：首页 Calendar 按时间列出全球赛事；新手优先选标注 open（公开报名）、形式为 Jeopardy 的线上赛。
2. **赛后学习**：进入具体比赛页面可看到各队公开的 writeup（题解）链接，是复盘的最佳材料。
3. **归档检索**：通过 Archives 浏览历年比赛，配合关键词搜 writeup（常见发布地：各队博客、GitHub 仓库）。
4. **团队与积分**：注册队伍后参加计分赛可获全球排名（仅作参考，不必焦虑）。

**国内赛事参与**：国内 CTF 生态以 XCTF 联赛的分站赛为代表，另有"强网杯""网鼎杯"等大型赛事，以及 Nu1L、DASCTF 等战队/平台举办的系列赛；每年秋季学期（约 9—12 月）各高校的新生赛、校赛门槛最低，是新手参赛的最佳入口。参与方式：关注主办方官网与公众号、CTFtime 日历及校内战队/社团招新；线上赛通常 3—5 人组队报名，先在 BUUCTF/攻防世界练题再上赛场。**所有比赛靶机仅限主办方授权范围，赛题技术严禁用于未授权系统。**

## 二、按方向工具索引

### Web

| 工具 | 环境 | 一句话用途 |
| --- | --- | --- |
| [Burp Suite](https://portswigger.net/burp) | Java，跨平台（社区版免费） | Web 渗透测试代理核心：拦截/重放/Intruder 爆破（笔记 17 篇主角） |
| [dirsearch](https://github.com/maurosoria/dirsearch) | Python | 目录与路径爆破扫描器，上手最简单 |
| [ffuf](https://github.com/ffuf/ffuf) | Go（单二进制） | 高速 Web Fuzzer：目录爆破、参数发现一把梭 |
| [sqlmap](https://sqlmap.org/) | Python | SQL 注入自动化检测与利用的事实标准 |
| HackBar | 浏览器扩展（Firefox） | 快速构造/重放 HTTP 请求的轻量插件（新版部分功能收费） |
| [AntSword（中国蚁剑）](https://github.com/AntSwordProject/AntSword) | Electron，跨平台 | 开源 WebShell 管理器（仅用于授权靶场） |
| [tplmap](https://github.com/epinna/tplmap) | Python | 服务端模板注入（SSTI）检测与利用工具 |

### Pwn

| 工具 | 环境 | 一句话用途 |
| --- | --- | --- |
| [pwntools](https://github.com/Gallopsled/pwntools) | Python | exploit 开发标准库：连接、payload 构造、ELF 解析 |
| [pwndbg](https://github.com/pwndbg/pwndbg) | gdb 插件 | 让 gdb 面向 Pwn 调试：堆/栈可视化、检查保护机制 |
| [ROPgadget](https://github.com/JonathanSalwan/ROPgadget) | Python | 从二进制中搜 ROP gadgets、生成链（笔记 22 篇） |
| [one_gadget](https://github.com/david942j/one_gadget) | Ruby | 在 libc 中找 execve("/bin/sh") 的 magic gadget |
| [seccomp-tools](https://github.com/david942j/seccomp-tools) | Ruby | 分析题目的 seccomp 沙箱规则（orw/open-read-write 判断） |
| [patchelf](https://github.com/NixOS/patchelf) | Linux CLI | 修改 ELF 的解释器/rpath，配合指定 libc 本地调试 |
| [glibc-all-in-one](https://github.com/matrix1001/glibc-all-in-one) | 脚本仓库 | 一键下载各版本 Ubuntu libc 及对应 ld，搭本地复现环境 |
| [LibcSearcher](https://github.com/lieanu/LibcSearcher) | Python | 由泄漏地址反查 libc 版本（配合在线 libc database 使用） |

### Crypto

| 工具 | 环境 | 一句话用途 |
| --- | --- | --- |
| [CyberChef](https://gchq.github.io/CyberChef/) | 浏览器（GCHQ 开源） | 编解码/加解密"瑞士军刀"，拖拽组合操作 |
| [SageMath](https://www.sagemath.org/) | 跨平台（可在线 CoCalc） | 数学计算环境：格、多项式、数论问题的事实标准 |
| [RsaCtfTool](https://github.com/Ganapati/RsaCtfTool) | Python | RSA 常见弱参数攻击自动化合集 |
| [yafu](https://github.com/bbuhrow/yafu) | Windows/Linux CLI | 大整数分解（N 较小时的利器） |
| [gmpy2](https://github.com/aleaxit/gmpy) | Python | 高精度快速数论库：gcd、模逆、素性、开根 |
| [hashpumpy](https://github.com/bwall/hashpumpy) | Python | 哈希长度扩展攻击（md5/sha1）工具 |
| [CrypTool](https://www.cryptool.org/) | 桌面端（跨平台） | 可视化密码学教学工具，直观理解算法流程 |

### Reverse

| 工具 | 环境 | 一句话用途 |
| --- | --- | --- |
| [Ghidra](https://ghidra-sre.org/) | Java，跨平台（NSA 开源） | 免费开源反编译套件，支持 Java/Python 脚本扩展 |
| [IDA Free](https://hex-rays.com/ida/free/) | Windows/Linux/macOS | 行业标准反汇编器（免费版可反汇编，高级功能付费） |
| [dnSpy](https://github.com/dnSpy/dnSpy) | Windows | .NET 程序反编译 + 调试一体（仓库已归档但依旧好用） |
| [jadx](https://github.com/skylot/jadx) | Java，跨平台 | Android APK/Dex 反编译为 Java 源码 |
| [x64dbg](https://github.com/x64dbg/x64dbg) | Windows | Windows 用户态动态调试主力 |
| [Frida](https://frida.re/) | 跨平台（Python 控制） | 动态插桩/hook 框架，App 与二进制通吃 |
| [UPX](https://github.com/upx/upx) | 跨平台 CLI | 加壳/脱壳工具，遇 UPX 壳一步到位 |
| [Detect It Easy](https://github.com/horsicq/Detect-It-Easy) | Windows/Linux/macOS | 查壳/查编译器/查打包器第一站 |
| [010 Editor](https://www.sweetscape.com/010editor/) | Windows/Linux/macOS（商业，有试用期） | 带模板语法的专业十六进制编辑器 |

### Misc

| 工具 | 环境 | 一句话用途 |
| --- | --- | --- |
| [binwalk](https://github.com/ReFirmLabs/binwalk) | Linux | 固件/文件识别与自动提取（魔术字扫描） |
| foremost | Linux（包管理器安装） | 按文件头雕刻恢复文件（carving） |
| StegSolve | Java（jar） | 图片隐写分析利器：通道/帧翻查（GitHub 搜 StegSolve） |
| [zsteg](https://github.com/zed-0xff/zsteg) | Ruby | PNG/BMP 的 LSB 隐写自动检测 |
| [ExifTool](https://exiftool.org/) | Perl，跨平台 | 读写文件元数据（EXIF 等）的事实标准 |
| [Audacity](https://www.audacityteam.org/) | 跨平台 | 音频分析：看波形/频谱图（摩斯电码、隐写音轨） |
| [Sonic Visualiser](https://www.sonicvisualiser.org/) | 跨平台 | 更强的音频频谱/时频分析，看频谱图隐写 |
| [Volatility 3](https://github.com/volatilityfoundation/volatility3) | Python | 内存取证标准框架：进程/网络/文件恢复（笔记 34 篇） |
| [Autopsy](https://www.autopsy.com/) | Java，跨平台 | 磁盘取证与案件管理平台（开源版） |
| [Wireshark](https://www.wireshark.org/) | 跨平台 | 流量包分析（pcap）必用，配合 tshark 命令行 |
| [GIMP](https://www.gimp.org/) | 跨平台 | 图层/宽高不符的图片隐写处理 |
| SilentEye | 跨平台 | 图像/音频隐写的编码与解码 GUI |
| DeepSound | Windows | 音频（WAV）隐写提取工具 |
| ARCHPR（ElcomSoft Advanced Archive Password Recovery） | Windows（商业软件） | RAR/ZIP 等压缩包密码爆破；开源替代：用 john 的 rar2john/zip2john 提取哈希后交给 [hashcat](https://hashcat.net/hashcat/) 爆破 |

## 三、字典与语料

- [SecLists](https://github.com/danielmiessler/SecLists)（GitHub）：安全测试字典合集的事实标准——目录、子域、用户名、密码、模糊测试 payload 应有尽有。
- 常用爆破字典建议：优先用 SecLists 中贴合目标的子集（如 `Passwords/Common-Credentials/10-million-password-list-top-1000.txt`），命中率远高于大而全的字典；对中文环境目标注意收集单位相关信息（域名、工号格式）自行扩充。
- [pydictor](https://github.com/LandGrey/pydictor)（Python）：按规则生成自定义字典（社会工程学信息组合、模式扩展）。

## 四、Docker 靶场资源

| 靶场 | 链接 | 一句话用途 |
| --- | --- | --- |
| **vulhub**（重点） | <https://github.com/vulhub/vulhub> | 复现真实 CVE 的 Docker 漏洞环境合集：进入对应目录 `docker compose up -d` 一键起环境，用完 `docker compose down` 销毁（详见笔记 18 篇） |
| DVWA | <https://github.com/digininja/DVWA> | 经典 Web 漏洞入门靶场（SQL 注入/XSS/上传等，难度分级） |
| WebGoat | <https://owasp.org/www-project-webgoat/> | OWASP 官方教学靶场：边上课边做题，自带讲解 |
| sqli-labs | <https://github.com/Audi-1/sqli-labs> | 65 关 SQL 注入专项练习（笔记 11 篇配套） |
| upload-labs | <https://github.com/c0ny1/upload-labs> | 21 关文件上传绕过专项练习（笔记 14 篇配套） |
| XVWA | <https://github.com/s4n7h0/xvwa-web-application-hacking> | 综合型 Web 漏洞练习应用（Kali/ PHP 环境） |

## 五、环境与效率工具

| 工具 | 平台 | 一句话用途 |
| --- | --- | --- |
| VMware Workstation Pro | Windows/Linux（个人使用免费） | 本地隔离虚拟机主力，所有靶场实验装在里面 |
| [UTM](https://mac.getutm.app/) | macOS（免费开源） | Apple Silicon 上的虚拟机方案（QEMU 封装） |
| [Docker](https://www.docker.com/) | 跨平台 | 靶场/靶机环境首选容器方案，配合 vulhub 使用 |
| WSL2 | Windows（系统组件） | Windows 用户获得原生 Linux 环境的最佳途径，pwntools/gdb 都在里面跑 |
| VSCode + 插件 | 跨平台 | 写脚本主力：推荐 C/C++、Python、Hex Editor、Markdown All in One、Rainbow CSV 插件 |
| Sublime Text | 跨平台 | 轻量文本/十六进制查看器（大文件秒开），当"快看一眼"工具 |

## 六、获取工具的合法渠道提示

- **首选官方渠道**：工具一律从**官方网站或官方 GitHub 仓库 Releases** 获取；能校验的核对发布签名或哈希值。
- **包管理器优先**：能用 `apt`（Kali/Ubuntu）、`brew`（macOS）、`pip` 安装的就不用第三方包——版本与完整性都有保障。
- **拒绝"工具合集"**：网盘/群文件流传的"黑客工具全家桶""破解版 Burp/IDA"是后门与挖矿木马的重灾区；安全学习者首先应做到不中招——这是职业素养，不是洁癖。
- 商业工具（IDA Pro、Burp Pro、010 Editor、ARCHPR）请购买正版或使用官方免费版/试用版；本工作区不存放任何破解软件。
