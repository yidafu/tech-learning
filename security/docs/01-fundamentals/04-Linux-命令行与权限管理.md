# Linux 命令行与权限管理（面向安全工作）

> 日期：2026-11-04
> 所属大纲阶段：1. 基础
> 参考资料：
> - Michael Kerrisk, The Linux Programming Interface（权限与进程章节）
> - man 手册：`passwd(5)`、`shadow(5)`、`sudoers(5)`、`sshd_config(5)`、`systemd(1)`、`logrotate(8)`
> - Ubuntu Server Documentation — Security 章节
> - 《鸟哥的 Linux 私房菜》（基础学习篇）
> - CIS Benchmarks（cisecurity.org）— Linux 加固基线的工业标准

---

## 0. 本篇定位

Linux 命令行是安全工程师的双手：靶场搭建、日志取证、应急响应、服务器加固都发生在这层。本篇以「防御/取证」为主线组织命令，最后给出「疑似被入侵机器排查」综合演练。所有操作以自有实验机为对象。

---

## 1. 文件与目录操作（安全视角速览）

默认读者已会基本操作，只列安全工作高频用法：

```bash
# 环境: Ubuntu 22.04 (macOS 的 BSD 工具参数略有差异, 注意)

ls -la /etc/ssh               # -a 含隐藏文件; 攻击者惯把后门藏进 .ssh/ 或 .config/
stat file                     # 比 ls 更全: 精确到纳秒的 atime/mtime/ctime/inode
                              # 取证关键: mtime 可伪造(touch), ctime 由内核维护不易伪造
cp -a src dst                 # 保留权限/时间戳/链接 (取证备份用, 尽量复制到只读介质)
md5sum file                   # 快速指纹(见 §11)
file suspicious.bin           # 识别真实类型(不信任扩展名)
xxd suspicious.bin | head     # 十六进制查看头部
sha256sum suspicious.bin
```

### 1.1 符号链接的坑

```bash
ln -s /etc/passwd /tmp/passwd_link
cat /tmp/passwd_link          # 读的是 /etc/passwd
# 攻击案例: 若备份脚本以 root 运行且跟随链接写文件 → 任意文件写入
# 防御: 打包/同步工具注意 --dereference 的默认值; GNU/POSIX cp 对命令行上的符号链接默认跟随(复制目标内容), -P/-d 才保留链接本身, -L 显式跟随
```

---

## 2. 查找：find 的取证用法

`find` 是取证第一工具，重点在「按权限、按时间、按类型」三个维度：

```bash
# 1. 查 SUID/SGID 文件(提权面审计, 与上篇 §4.2 呼应)
sudo find / -xdev -perm -4000 -type f -ls 2>/dev/null
sudo find / -xdev -perm -2000 -type f -ls 2>/dev/null
# -xdev: 不跨文件系统(避免扎进 /proc); -perm -4000: 权限位"包含"SUID

# 2. 全局可写文件(任何用户可篡改 = 潜在提权点)
sudo find / -xdev -type f -perm -0002 ! -path '/proc/*' ! -path '/sys/*' -ls 2>/dev/null

# 3. 无主文件(属主已被删除的用户, 权限语义悬空)
sudo find / -xdev -nouser -o -nogroup 2>/dev/null

# 4. 时间线取证(以"分钟"为单位):
sudo find /etc -type f -mmin -60 -ls        # 最近60分钟被修改(mtime)
sudo find /var/www -type f -cmin -1440 -ls # 24h内元数据/内容变更(ctime; -cmin 单位是分钟, -ctime -1440 意为 1440 天!)
sudo find / -xdev -type f -newermt "2026-11-01" ! -newermt "2026-11-03" -ls
                                            # 指定时间窗口内修改的文件

# 5. 大小异常的隐藏文件(webshell 常是小文件藏在 web 目录)
find /var/www -name '*.php' -size -50k -newerct '-7 days' -ls

# 6. locate: 走数据库的快查(先 updatedb), 适合"这个文件系统里还有哪些同名"
sudo updatedb && locate -i '\.ssh/id_rsa'
```

时间戳三兄弟回顾：**atime**（访问）、**mtime**（内容修改）、**ctime**（元数据变更，如权限/链接数，`touch` 改 mtime 也会推高 ctime）。取证时 ctime 与 mtime 的「不合理组合」（mtime 很旧、ctime 很新）是篡改痕迹。

---

## 3. 文本处理三剑客：grep / sed / awk

### 3.1 grep：模式检索

```bash
grep -rn 'password' /var/www/html/          # -r 递归 -n 行号: 找硬编码凭据
grep -iE '(select|union).*(from|select)' access.log   # -E 扩展正则 -i 忽略大小写
grep -vE '^(#|$)' sshd_config               # -v 反选: 去注释与空行看"生效配置"
grep -c 'Failed password' /var/log/auth.log # 只计数
zgrep 'Accepted' /var/log/auth.log.2.gz     # 直接查压缩日志
grep -f patterns.txt big.log                # 模式来自文件(IOC 清单匹配)
```

### 3.2 sed：流式替换/抽取

```bash
sed -n '100,150p' big.log                   # 只打印 100-150 行
sed 's/^\(.*\) - - \[/[\1]/' access.log     # 分组重排
sed -i.bak 's/PermitRootLogin yes/PermitRootLogin no/' sshd_config
                                            # -i 原地改, .bak 自动备份(改配置前必备)
```

### 3.3 awk：按列处理（日志分析主力）

Nginx/Apache 日志是空格分隔的固定列结构，awk 是天然工具：

```bash
# 实战小例子 1: 从 Nginx access.log 统计访问量 Top10 IP
# 日志格式: $1=客户端IP $4=时间 $6="GET /path" $9=状态码
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head

# 实战小例子 2: 找出扫描器特征 —— 状态码分布
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn
# 404/400 比例畸高 = 正在被扫描

# 实战小例子 3: 非 200 的 POST 请求(撞库/爆破特征)
awk '$6=="\"POST" && $9!=200 {print $1, $6, $7, $9}' /var/log/nginx/access.log

# 实战小例子 4: auth.log 中 SSH 爆破源统计
grep 'Failed password' /var/log/auth.log | \
  awk '{for(i=1;i<=NF;i++) if($i=="from") print $(i+1)}' | \
  sort | uniq -c | sort -rn | head

# 实战小例子 5: 单 IP 高频访问(60s 窗口 >100 次)
awk '{print substr($4,2,17), $1}' access.log | sort | uniq -c | awk '$1>100' | head
```

三剑客的组合拳 `grep | sort | uniq -c | sort -rn | head` 是日志分析万能骨架：过滤 → 排序 → 计数 → 降序 → 截取。

---

## 4. 进程与信号管理

```bash
ps auxf                       # 全量进程树
ps -eo pid,ppid,user,etime,cmd --sort=-etime | head   # 按运行时长排序
top / htop                    # 动态视图; htop 更直观
nohup cmd & / disown          # 脱离会话运行 —— 攻击者常驻手法之一(取证见 §13)
```

信号（重点几个）：

| 信号 | 编号 | 语义 | 安全关联 |
| --- | --- | --- | --- |
| SIGTERM | 15 | 请求退出（可捕获做清理） | 优雅停止 |
| SIGKILL | 9 | 强杀（**不可捕获**） | 恶意进程装死时用；也说明安全软件不能依赖 SIGTERM 让恶意进程配合 |
| SIGINT | 2 | Ctrl+C | — |
| SIGHUP | 1 | 终端断开/常用于「重载配置」 | `kill -HUP <sshd_pid>` 重读配置 |
| SIGSTOP/CONT | 19/18 | 暂停/继续 | 取证时**先 STOP 冻结再分析**，避免进程自杀或清痕 |

```bash
kill -STOP 12345; kill -CONT 12345
pgrep -a -f 'python.*http'    # 按完整命令行找进程
```

---

## 5. systemd 服务

```bash
systemctl status nginx            # 状态(含最近日志片段)
systemctl list-units --type=service --state=running
systemctl list-unit-files --state=enabled     # 开机自启清单 ← 持久化审计必查
systemctl cat nginx               # 查看 unit 文件实际内容(含 drop-in 覆盖)
journalctl -u nginx -n 50 --no-pager           # 该服务日志(见 §9.2)
```

自建服务的最小安全模板（最小权限落地）：

```ini
# /etc/systemd/system/myapp.service
[Service]
User=appuser                          # 专用低权用户
Group=appuser
NoNewPrivileges=true                  # 禁止通过 suid 等提权(含子进程)
ProtectSystem=strict                  # 整个文件系统只读
ReadWritePaths=/var/lib/myapp         # 仅开放必要写目录
ProtectHome=true
PrivateTmp=true                       # 私有 /tmp(隔离临时文件攻击)
CapabilityBoundingSet=CAP_NET_BIND_SERVICE   # 只给需要的能力
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

攻击视角（了解以防御）：攻击者持久化可伪造 unit 文件（`/etc/systemd/system/` 或用户级 `~/.config/systemd/user/`）、timer 单元替代 cron。排查时 `systemctl list-unit-files --state=enabled` 与包管理器记录对账。

---

## 6. 网络配置与排查

```bash
ip addr                       # 地址(替代 ifconfig)
ip route                      # 路由表
ip neigh                      # ARP 表(网关 MAC 是否被欺骗, 对照笔记 01 §6)

ss -tulpen                    # 监听端口全景 ← 任何机器上手第一条命令
ss -tnp state established     # 活动连接 + 进程
ss -tn dst :443 | wc -l       # 统计到 443 的连接数

# 配置文件(Ubuntu 22.04, netplan):
# /etc/netplan/*.yaml    网络规划(改完 netplan try 交互验证, 防失联)
# /etc/resolv.conf       DNS(常被 systemd-resolved 接管, 真身在 /run/systemd/resolve/)
# /etc/hosts             本地静态解析 ← 攻击者篡改此文件可做本地"域名劫持"
```

可疑外连排查：`ss -tnp state established` 里陌生 IP → `whois`/威胁情报比对 → `lsof -p <pid>` 看谁在连。

---

## 7. 用户与组管理

### 7.1 /etc/passwd 逐字段

```
root:x:0:0:root:/root:/bin/bash
 └┬┘ │└─┘ └┬┘└┬┘ └┬─┘ └──┬──┘└───┬────┘
  1    2    3  4    5      6        7

1. 用户名 login name
2. 密码占位符: 恒为 x → 真实哈希在 /etc/shadow
   (若此处出现哈希/为空 = 异常! 老系统将哈希存此处, 可被任何用户读走离线爆破)
3. UID: 0 = root(多个 0 = 后门账号的典型特征)
4. GID: 主组
5. GECOS: 描述字段
6. 家目录
7. 登录 shell: /bin/nologin / /usr/sbin/nologin = 禁止交互登录(服务账号应如此)
   出现 /bin/bash 的陌生账号 = 红色警报
```

> 注：此图保留 ASCII 原样 —— 字段注解（└┬┘ 对位线与逐字段编号说明）直接叠在 /etc/passwd 样例行上，转成 Mermaid 图会丢失注解与原文的逐字段对照关系。

### 7.2 /etc/shadow 逐字段

```
root:$6$salt$hash:19600:0:99999:7:::
 └┬┘ └────┬────┘ └─┬─┘ └┬┘ └─┬─┘└┬┘
  1       2        3    4    5   6  (7,8 略: 账号过期/保留)

1. 用户名
2. 哈希字段: $id$盐$哈希
   $1$=MD5(淘汰) $5$=SHA-256 $6$=SHA-512 $y$=yescrypt(现代默认, 抗GPU)
   空 = 无密码即可登录(!! 或 * = 锁定/不可密码登录)
3. 上次改密天数(自 1970-01-01)
4. 最小改密间隔(0=随时)
5. 密码有效期(99999≈永不过期)
6. 过期前警告天数
```

> 注：此图保留 ASCII 原样 —— 字段注解（└┬┘ 对位线与逐字段编号说明）直接叠在 /etc/shadow 样例行上，转成 Mermaid 图会丢失注解与原文的逐字段对照关系。

权限要点：`/etc/shadow` 必须 `640/600 root:shadow`——若变成 644，全部哈希暴露给本地用户离线爆破。审计命令：`stat -c '%a %U:%G %n' /etc/shadow`。

```bash
# 用户与组管理常用
useradd -m -s /bin/bash alice        # 建用户(-m 建家目录)
usermod -aG sudo alice               # 追加组(漏 -a 会把人踢出其他组, 经典事故!)
passwd -l bob                        # 锁定账号
chage -l alice                       # 查看密码策略
id alice                             # uid/gid/全部组
getent group sudo                    # 谁在 sudo 组
lastlog                              # 各账号最后登录时间(全空说明正常)
```

### 7.3 sudoers 语法与坑

```bash
visudo                                # 唯一正确的编辑方式(保存前做语法检查!)
# 语法: 谁 在哪些主机=(以谁的身份:哪个组) 命令列表
alice  ALL=(ALL:ALL) ALL              # 全权, 每次要密码
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart myapp
                                      # 免密但只能跑这一条 ← 最小权限范例

# 经典危险写法(每一条都是提权漏洞):
deploy ALL=(ALL) NOPASSWD: /usr/bin/vim
# → sudo vim 后 :!sh 直接拿 root shell
deploy ALL=(ALL) NOPASSWD: /usr/bin/tar
# → sudo tar --checkpoint=1 --checkpoint-action=exec=/bin/sh
deploy ALL=(ALL) NOPASSWD: /usr/bin/find
# → sudo find . -exec /bin/sh \;
deploy ALL=(ALL) NOPASSWD: /usr/bin/less /var/log/*
# → less 里 !id 执行命令; 且 * 通配可指到任意文件

# 规则: 授权给"能逃逸到 shell 的程序" = 授权 root;
#       路径务必绝对; 想用通配符时先想能不能被参数注入
sudo -l -U alice                      # 审计: 某用户到底被授权了什么(自查则去掉 -U)
sudo -l                               # 攻击者拿到低权shell后的第一件事, 你应先于他审计
```

### 7.4 su vs sudo

| 维度 | `su` | `sudo` |
| --- | --- | --- |
| 认证对象 | 目标用户(通常 root)的密码 | 自己的密码 |
| 密码分发 | 所有需要 root 的人都知道 root 密码 | root 密码可以无人知晓 |
| 审计 | 只知道"谁 su 了" | `/var/log/auth.log` 记录每条命令 |
| 粒度 | 全有或全无 | 命令级白名单 |

结论：禁 root 直接 SSH + 全员走 sudo，是服务器基线。

---

## 8. SSH 服务与密钥认证加固

sshd_config 关键项（Ubuntu 22.04：`/etc/ssh/sshd_config`，改完 `sshd -t` 验证语法再 `systemctl reload ssh`）：

```bash
# --- 认证 ---
PermitRootLogin no                # 禁 root 直接登录
PasswordAuthentication no         # 只留密钥认证(前提: 已确认密钥能登录!)
PubkeyAuthentication yes
PermitEmptyPasswords no
MaxAuthTries 3
LoginGraceTime 30                 # 未完成认证连接 30s 掐掉

# --- 面收敛 ---
AllowUsers alice deploy           # 白名单(默认拒绝一切更安全)
AddressFamily inet
ListenAddress 0.0.0.0             # 能绑内网 IP 就别全监听

# --- 会话与转发 ---
X11Forwarding no                  # 不用就关
AllowTcpForwarding no             # 关掉后攻击者无法把你机器当跳板隧道
ClientAliveInterval 300
ClientAliveCountMax 2             # 10分钟无响应踢下线
```

密钥认证：

```bash
# 客户端生成(默认 ed25519, 更短更安全; rsa 需 ≥3072 位)
ssh-keygen -t ed25519 -C "alice@laptop"

# ~/.ssh 权限是硬性要求(权限过宽 sshd 直接拒绝):
chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
# 服务端排错: tail -f /var/log/auth.log 同时 ssh -v 看握手细节

# 证书式 SSH(大规模主机管理, 免去分发 authorized_keys): 了解即可
```

纵深防御：密钥加口令（`ssh-keygen -p` 补设）、fail2ban 自动封爆破 IP、跳板机集中审计、双因素（PAM + TOTP）。

---

## 9. 日志体系

### 9.1 rsyslog 与常见日志清单

rsyslog 按「设施.优先级」路由（`authpriv.* /var/log/auth.log` 定义在 `/etc/rsyslog.d/50-default.conf`）：

| 日志 | 内容 | 取证用途 |
| --- | --- | --- |
| `/var/log/auth.log` | 认证相关：sudo、su、SSH 登录成败 | 爆破、提权行为 |
| `/var/log/syslog`（或 `/var/log/messages`） | 系统主日志 | 服务异常、内核事件 |
| `/var/log/nginx/access.log` / `error.log` | Web 访问 | Webshell 流量特征 |
| `/var/log/secure`（RHEL 系） | 同 auth.log | 同上 |
| `/var/log/kern.log` | 内核 | 驱动/内核模块异常 |
| `/var/log/dpkg.log` / `yum.log` | 软件包安装记录 | 「机器上何时被装了什么」的时间线 |
| `/var/log/wtmp`(last) / `btmp`(lastb) | 登录成功/失败（二进制） | `last -f /var/log/btmp | head` 看爆破 |
| `/var/log/faillog` | 失败登录计数 | 配合锁定策略 |

注意：**日志在默认轮转（logrotate）外留存有限**；攻击者高权限后第一件事常是清日志——所以集中式日志（rsyslog 转发/ELK）是响应能力的地基。

### 9.2 journalctl

```bash
journalctl -u ssh -n 100 --no-pager     # 某服务最近100条
journalctl --since "2026-11-04 09:00" --until "2026-11-04 12:00"
journalctl -p err -b                    # 本次启动以来的错误级以上
journalctl -f                           # 跟随输出(类似 tail -f)
journalctl --disk-usage                 # 日志占盘
```

---

## 10. 计划任务 cron（含持久化攻击面）

```bash
crontab -l                          # 当前用户任务
sudo crontab -l -u root             # root 的任务
ls -la /etc/cron.d/ /etc/cron.daily/ /var/spool/cron/crontabs/
systemctl list-timers               # systemd timer(现代替代)

# cron 行格式:
# 分 时 日 月 周  命令
*/5 * * * * /usr/local/bin/check.sh
```

**持久化攻击面（防御视角）**：cron 是攻击者「重启后还在」的经典落点。排查要点：

- `/etc/cron.d/`、`/var/spool/cron/` 下出现陌生条目，尤其调用 `/tmp/`、`/dev/shm/` 下脚本的；
- 环境变量注入：cron 任务里 `SHELL=`、`PATH=` 被改写，或脚本用相对路径调用命令 → 同目录放同名恶意二进制即可劫持（写脚本必须绝对路径）；
- 与 `systemctl list-timers`、`/etc/rc.local`、`~/.bashrc` 一起构成「持久化四件套」检查清单。

---

## 11. 文件完整性

```bash
sha256sum /usr/bin/sshd > sshd.sha256    # 生成基线
sha256sum -c sshd.sha256                 # 校验(逐字节内容比对)

# 目录级基线(把系统的关键二进制做指纹库, 定期对账):
sudo find /usr/bin /usr/sbin -type f -exec sha256sum {} + > /root/bin-baseline.txt
sha256sum -c bin-baseline.txt --quiet    # 只报不匹配项 ← 被替换的命令=后门信号

# 发行版自带校验(与包数据库对账, 比 md5 更权威):
dpkg -V                                  # Ubuntu/Debian
rpm -Va                                  # RHEL 系
# 注意: 配置文件被改会标记 5 (checksum), 需人工判断是运维改动还是篡改
```

进阶（了解）：AIDE/Tripwire 做入侵检测基线；容器场景用只读镜像+镜像签名。

---

## 12. Shell 脚本安全注意

### 12.1 引号

```bash
rm -rf "$DIR"        # 正确: 变量加双引号, 带空格的路径不会被拆词
rm -rf $DIR          # 危险: DIR="a b" → rm -rf a b(误删 b!)
                    # DIR 为空时 → rm -rf(经典删库事故)
rm -rf "${DIR:?}"    # 更稳: 变量为空时报错退出而非继续执行

# 注入示例(仅讲解原理, 勿在任何共享环境使用):
# 脚本把用户输入拼进命令:
eval "echo $USER_INPUT"          # USER_INPUT='$(rm -rf ~)' → 被执行
# 防御: 不用 eval 拼输入; 需要变量名时用 bash 间接展开 "${!name}"
```

### 12.2 shell 注入（命令注入）

```bash
# 危险模式: 把不受信输入直接拼进 shell 命令
filename="; cat /etc/passwd"       # 用户输入
tar czf backup.tar.gz "$filename"  # 双引号让 ';' 失去 shell 语法意义, 只是传给 tar 的字面文件名参数(tar 会报"无法 stat"), 这条本身并不注入
# 真正危险的是把整串重新交给一个新 shell 去解释:
system "tar czf backup.tar.gz $filename"   # 脚本语言里 shell=True 同类问题, ';' 在这里会被解析为命令分隔(见下篇 §1.2)

# 防御清单:
# 1. 白名单校验输入: [[ "$filename" =~ ^[A-Za-z0-9._-]+$ ]] || exit 1
# 2. 永远使用 "--" 终结符防参数注入: rm -rf -- "$path" (防 - 开头文件被当选项)
# 3. 变量一律双引号
# 4. set -euo pipefail 作为脚本头(未定义变量即退出)
```

---

## 13. 综合演练：排查「疑似被入侵」机器

场景：你接到一台行为异常的 Ubuntu 22.04 服务器（CPU 异常、有陌生外连）。原则：**先取证后处置**；条件允许先做快照/内存镜像；所有输出落到带时间戳的文件。以下为命令清单（顺序即流程）：

```bash
# ===== 阶段 0: 保全现场 =====
mkdir /root/ir-$(date +%F) && cd /root/ir-*
# 有条件: 快照磁盘/内存(vmware/virt-manager 快照), 本篇按下不表

# ===== 阶段 1: 现在谁在跑? =====
ps auxf > ps.txt                       # 陌生进程? 路径在 /tmp /dev/shm 的?
ls -l /proc/<PID>/exe                  # 可执行文件真实路径(已删除会显示 (deleted))
cat /proc/<PID>/cmdline | tr '\0' ' '  # 原始命令行(比 ps 难伪造)
ss -tulpen > listen.txt                # 异常监听端口
ss -tnp state established > conn.txt   # 异常外连(比对威胁情报)

# ===== 阶段 2: 入侵者怎么进来的? =====
last -a | head -30                     # 登录历史(来源IP)
lastb | head -30                       # 失败登录(爆破痕迹)
grep -E 'Accepted|session opened' /var/log/auth.log | tail -50
grep sudo /var/log/auth.log | tail -50 # 谁在什么时候用了 sudo
awk '$9>=400 && $9<500' /var/log/nginx/access.log | tail   # Web 被扫/利用痕迹

# ===== 阶段 3: 改了什么? =====
find /etc /var/www /root -type f -mtime -3 -ls 2>/dev/null > recent-mod.txt
stat /etc/passwd /etc/shadow           # 账号文件改动时间
awk -F: '$3==0' /etc/passwd            # UID=0 的账号(除 root 外都异常)
awk -F: '$7 !~ /nologin|false/' /etc/passwd   # 可交互登录的账号清单
diff <(ls -la ~/.ssh) <(echo)          # authorized_keys 是否被塞公钥!(最常见后门)

# ===== 阶段 4: 持久化在哪? =====
sudo find / -xdev -perm -4000 -type f -ls > suid.txt     # 与基线对比新增 SUID
ls -la /etc/cron.d/ /var/spool/cron/crontabs/            # cron 后门
systemctl list-unit-files --state=enabled > units.txt    # 可疑自启服务
grep -rE 'http|curl|wget|base64' /etc/cron* 2>/dev/null  # 下载器特征
cat ~/.bashrc ~/.profile | grep -vE '^#|^$' | tail -20   # shell 启动注入
ls -la /tmp /dev/shm /var/tmp                           # 临时目录可执行文件

# ===== 阶段 5: 完整性对账 =====
dpkg -V 2>/dev/null | tee dpkg-verify.txt               # 被替换的系统二进制
sha256sum -c bin-baseline.txt --quiet                   # 若有预先基线

# ===== 阶段 6: 处置(确认后) =====
# 隔离: 断网/安全组只留你自己的管理 IP
# kill -STOP 冻结可疑进程取证后再 kill -9
# 删除持久化项 → 改所有凭据(密码/密钥/token) → 重装是最终洁净手段
# 事后: 复盘入口(爆破?webshell?泄漏的密钥?) → 补丁/加固 → 输出报告
```

记忆框架：**保全 → 看进程/网络 → 查登录路径 → 查文件改动 → 查持久化 → 完整性 → 处置复盘**。

---

## 14. 常见误区

1. **「rm -rf 之前检查一遍就够了」** —— 脚本中必须双引号 + 空值保护（`${DIR:?}`）+ `--` 终结符；人工检查挡不住变量拆词。
2. **「日志在 /var/log 里永远找得到」** —— logrotate 轮转、攻击者清理、`journalctl` 独立存储（可能 `/var/log/journal` 未启用则重启即失）；重要资产要外发集中存储。
3. **「sudoers 写 NOPASSWD: 一条命令很安全」** —— 取决于命令能否逃逸（vim/less/tar/find 皆可拿 shell），见 §7.3。
4. **「改了 sshd_config 就生效」** —— 必须 `sshd -t` 检查语法并 reload；直接退出当前会话再测试新登录，是防锁死自己的标准流程。
5. **「mtime 没变就没被改」** —— mtime 可 `touch` 伪造，结合 ctime、inode、内容哈希与包管理器数据库交叉验证。
6. **「攻击者删了日志就没办法」** —— wtmp/btmp 是二进制但可解析（`last`），journal 可能仍在，网络设备/云平台流量日志、EDR 遥测是旁证。
7. **「密钥认证就绝对安全」** —— 私钥落盘、`authorized_keys` 被追加、`command=` 前缀缺失导致密钥全功能可用；高价值主机要证书+双因素。

---

## 15. 小结与自测

### 小结

- Linux 安全工作的两大循环：**加固循环**（最小权限、最小暴露面、基线对账）与**响应循环**（保全-排查-处置-复盘）。
- 权限体系一张网：rwx → SUID/SGID/Sticky → capabilities → sudoers → ACL，每层都要审计，漏一层就漏一扇门。
- 日志与时间是取证的主轴：auth.log/nginx/包管理日志 + atime/mtime/ctime + last/lastb 构成时间线骨架。
- 持久化「四件套」：cron、systemd unit/timer、shell rc、SSH authorized_keys——排查清单化。

### 自测问题

1. `/etc/passwd` 第二字段出现哈希字符串意味着什么？为什么现代系统用 `x`？
2. `/etc/shadow` 中 `$6$`、`$y$` 前缀分别是什么算法？空密码字段与 `!`、`*` 的区别？
3. 写一条 sudoers：允许 deploy 用户免密重启且仅重启 myapp 服务。这条规则里少了哪个细节就会变成提权漏洞？
4. `find / -xdev -perm -4000 -type f` 中 `-xdev` 与 `-perm -4000` 各自的作用？为什么 SUID 清单要「与基线对账」而不是只看列表？
5. 给定一段 nginx 日志，用 awk 统计 Top10 来源 IP 与 4xx/5xx 比例，并解释结果如何指示扫描行为。
6. SSH 加固后如何避免把自己锁在门外？写出验证顺序。
7. cron、systemd timer、`.bashrc`、`authorized_keys` 各自如何被用作持久化？对应的排查命令是什么？
8. 综合演练中为什么用 `kill -STOP` 而不是直接 `kill -9`？

（完）

---

## 附：ASCII 图 → Mermaid 替换清单

| 原 ASCII 图（小节 · 内容） | 替换后类型 |
| --- | --- |
| 「7.1 /etc/passwd 逐字段」节 · 样例行字段注解图 | 保留 ASCII（附注说明） |
| 「7.2 /etc/shadow 逐字段」节 · 样例行字段注解图 | 保留 ASCII（附注说明） |
