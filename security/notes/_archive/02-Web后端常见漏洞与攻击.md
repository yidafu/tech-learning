# Web 后端常见漏洞与攻击方式

- 日期：2026-11-04
- 所属大纲阶段：第 3 阶段 Web 安全（部分涉及第 6 阶段安全工程）
- 参考资料：OWASP Top 10 (2021)、OWASP Cheat Sheet Series（SQL Injection Prevention / File Upload / Deserialization）、PortSwigger Web Security Academy（SQL injection / SSRF / Access control / JWT 模块）、CWE Top 25
- 说明：所有 payload 与代码均为最小教学演示，仅可在本地靶场（DVWA、sqli-labs、PortSwigger Academy、自建 Docker 环境）中复现。

---

## 总览

| 漏洞 | 核心成因 | 典型危害 | CWE |
|---|---|---|---|
| SQL 注入 | SQL 语句与数据拼接 | 拖库、认证绕过、RCE（特定条件） | CWE-89 |
| 命令注入 | 拼接调用系统 shell | 服务器完全失陷 | CWE-78 |
| 路径遍历 | 文件路径拼接用户输入 | 任意文件读/写 | CWE-22 |
| 文件上传 | 上传校验不严 | WebShell 落地 → RCE | CWE-434 |
| SSRF | 服务端按用户输入发起请求 | 内网探测、云凭证窃取 | CWE-918 |
| 反序列化 | 反序列化不可信数据 | RCE | CWE-502 |
| XXE | XML 解析器处理外部实体 | 文件读取 / SSRF / DoS | CWE-611 |
| 越权（IDOR 等） | 只做了认证没做授权 | 数据泄露、水平/垂直越权 | CWE-862/863 |
| 认证/会话缺陷 | 会话管理、令牌实现错误 | 账户接管 | CWE-287 |
| 竞态条件 | 非原子的检查-使用逻辑 | 余额套现、重复领取 | CWE-362 |
| 依赖供应链 | 引入被投毒的包 | 后门、密钥窃取 | CWE-1357 |

---

## 1. SQL 注入（SQLi, SQL Injection）

### 原理
用户输入被直接拼进 SQL 语句，攻击者借输入改变语句语义。

```sql
-- 有漏洞的拼接（Python 伪代码示例）
query = f"SELECT * FROM users WHERE name = '{req.name}'"
-- 输入 ' OR '1'='1 后：
SELECT * FROM users WHERE name = '' OR '1'='1'   -- 恒真，返回全部用户
```

### 攻击方式分类（示例均限靶场）

| 技术 | 手段 | 适用场景 |
|---|---|---|
| UNION 注入 | `' UNION SELECT username, password FROM users-- ` | 页面回显查询结果 |
| 报错注入 | `AND extractvalue(1, concat(0x7e, version()))` | 页面显示数据库报错（MySQL） |
| 布尔盲注 | `AND substring(password,1,1)='a'`，按页面真假逐位猜 | 无回显、响应有差异 |
| 时间盲注 | `AND IF(cond, SLEEP(5), 0)` | 响应真假无差异，只看耗时 |
| 堆叠查询 | `; DROP TABLE x;--` | 驱动允许多语句（少见） |

辅助：`sqlmap -u "http://target/item?id=1" --batch`（仅授权靶场使用）。

### 防御
1. **参数化查询 / 预编译**（首选）：
   ```python
   # 安全：数据与语句结构分离
   cur.execute("SELECT * FROM users WHERE name = %s", (req.name,))
   ```
2. ORM 默认参数化，但拼接 API（如 Django 的 `extra()`、Sequelize 的 `literal`）仍是高危出口。
3. 白名单校验无法参数化的部分（如表名、`ORDER BY` 列名）。
4. 最小权限数据库账号（禁止 FILE/DDL 权限）、错误信息不外泄、WAF 作纵深防御。

---

## 2. 操作系统命令注入（OS Command Injection）

### 原理
后端把用户输入拼进 shell 命令。

```python
# 有漏洞
os.system(f"ping -c 1 {req.host}")
```

攻击者输入 `127.0.0.1; whoami`（分隔符家族：`;` `&&` `||` `` `cmd` `` `$(cmd)`、换行 `%0a`）。

### 防御
1. 首选**不用 shell**：`subprocess.run(["ping", "-c", "1", host], shell=False)`，参数以数组传递。
2. 输入白名单（如 IP 用正则严格校验）。
3. 确需 shell 时做转义（`shlex.quote`），但仍是次选。

---

## 3. 路径遍历（Path Traversal / Directory Traversal）

### 原理
文件操作直接拼接用户输入的文件名。

```python
# 有漏洞：GET /download?file=report.pdf
open(f"/uploads/{req.file}")    # 输入 ../../etc/passwd 即逃出目录
```

绕过变体：URL 编码 `%2e%2e%2f`、双重编码、绝对路径直接注入、截断（老版本 PHP `%00`）。Windows 上 `..\` 与盘符绝对路径。相关姊妹漏洞：**本地文件包含（LFI）**，见第 7 节 XXE 与文件上传的组合。

### 防御
1. 不信任原始路径：白名单映射 ID → 路径，或 `os.path.basename()` 归一化。
2. 归一化后校验前缀：`os.path.realpath(p).startswith(BASE_DIR)`。
3. 运行账号最小权限、`chroot`/容器隔离。

---

## 4. 文件上传漏洞（Unrestricted File Upload）

### 原理
上传的文件可被 Web 服务当作可执行内容解析。核心问题两件事：**内容可控** + **可被解析执行**。

### 常见绕过方式（攻防对照）

| 校验方式 | 绕过手法 |
|---|---|
| 黑名单扩展名 | `.php5` `.phtml`、大小写 `.PHP`、尾空格/点（Windows）、`::DATA`（NTFS） |
| MIME 类型检查 | 抓包改 `Content-Type: image/jpeg` |
| 文件头（魔法字节） | 图片头 + PHP 代码拼接（GIF89a 兼容图片） |
| 重新渲染图片 | 竞争条件：先上传再渲染间隙访问 |
| 重命名 | `.htaccess` / `.user.ini` 上传，使 `xx.png` 按 PHP 解析 |

### 防御
1. 扩展名白名单 + 随机重命名 + 独立存储（对象存储/独立静态域，与 Web 容器分离）。
2. 图片用库重新编码（隐马赛克攻击，同时消灭多语言文件 polyglot）。
3. 上传目录禁执行（nginx: `location /uploads/ { add_header Content-Type text/plain; }` 或 PHP `engine off`）。
4. 病毒扫描、大小与频率限制。

---

## 5. 服务端请求伪造（SSRF, Server-Side Request Forgery）

### 原理
后端按用户输入的 URL 发起请求（如「预览 URL」「导入远程图片」「Webhook」），攻击者让服务器访问**本应只有内网可达**的资源。

### 攻击方式（示例）

```
# 探测内网
?url=http://192.168.1.1:8080/console
# 云元数据接口（高危，以 AWS IMDSv1 为例）
?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/
# file 协议读文件
?url=file:///etc/passwd
# 绕过域名黑名单：进制 IP（0x7f000001）、DNS 重绑定、302 跳转、@ 符号混淆
```

### 防御
1. 协议与主机白名单（仅 http/https、仅外部域名）。
2. 禁止私网/回环/链路本地地址：解析后校验 IP（防 DNS rebinding 需在连接时复核，或直接用解析出的 IP 建连）。
3. 禁止重定向跟随或跟随后重新校验。
4. 云上使用 IMDSv2、给实例最小权限角色。
5. 网络层隔离：应用服务器单独 egress 策略。

---

## 6. 不安全反序列化（Insecure Deserialization）

### 原理
把不可信数据反序列化成对象时，若库支持恢复对象图（含攻击者控制的类型），可触发** gadget chain**（利用应用/库中已有方法组合出危险行为）。「反序列化即执行」——对比注入是「数据被当代码」，这里是「数据被还原成带行为的对象」。

### 各语言高危入口（示例）

| 语言 | 危险 API | 经典 gadget 库 |
|---|---|---|
| Java | `ObjectInputStream.readObject()` | Commons-Collections、Fastjson `parse()`（autoType） |
| PHP | `unserialize()` | 各框架 `__wakeup`/`__destruct` POP 链（如 Laravel/ThinkPHP 历史 RCE） |
| Python | `pickle.loads()` | `__reduce__` 直接执行任意命令 |
| .NET | `BinaryFormatter` | ViewState 反序列化（machineKey 泄露时） |
| Ruby | `Marshal.load` | 通用 gadget |

Python 最小演示（靶场自建环境）：

```python
import pickle, os
class Evil:
    def __reduce__(self):
        return (os.system, ("id > /tmp/pwned",))
payload = pickle.dumps(Evil())   # 若服务端 pickle.loads(payload) 即触发
```

### 防御
1. **不反序列化不可信数据**：改用 JSON 等纯数据格式。
2. 无法避免时：签名（HMAC）防篡改、类型白名单、隔离低权限进程运行。
3. 升级依赖（gadget 库补丁）、监控异常反序列化告警。
4. Java 关注 ysoserial 的公开链对应 CVE，逐项核对依赖版本。

---

## 7. XML 外部实体注入（XXE, XML External Entity）

### 原理
XML 标准支持 DTD 定义外部实体，解析器默认解析 `SYSTEM "uri"` 实体 → 文件读取 / 内网请求（SSRF）/ 参数实体外带数据。

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<user><name>&xxe;</name></user>
```

出现面：老式 SOAP 接口、SAML 断言解析、Office 文件解析（.docx 本质是 zip+xml）、SVG 上传。

### 防御
禁用 DTD 与外部实体：Java `factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)`；libxml2 ≥ 2.9 默认禁用；各解析器对照 OWASP XXE Cheat Sheet 配置。

---

## 8. 访问控制与越权（Broken Access Control）

> OWASP Top 10 (2021) 第一名。与认证（你是谁）不同，授权（你能做什么）必须**在每个请求上由服务端强制执行**。

### 分类与攻击方式

| 类型 | 说明 | 攻击示例 |
|---|---|---|
| IDOR（不安全的直接对象引用） | 换 ID 即可访问他人资源 | `GET /api/orders/1024` → 改成 `1023` 读到别人订单 |
| 水平越权 | 同角色、跨用户 | 修改请求中的 user_id/email 参数 |
| 垂直越权 | 低权限调高权限接口 | 普通用户直接请求 `/admin/deleteUser`（后端只靠前端隐藏菜单） |
| 参数篡改 | 隐藏字段/JSON 属性 | 提交时加 `"role":"admin"`、`"price":1` |
| GUID 就安全？ | 否 | GUID 可从其他接口、日志、分享链接泄露 |

测试要点（授权测试方法论）：两个账号 A/B，A 的每个请求改掉标识（ID、用户名）后用 B 重放，对比响应。

### 防御
1. 默认拒绝（deny by default），路由层中间件统一鉴权，不依赖前端隐藏。
2. 资源归属校验写进数据访问：`WHERE id = ? AND owner_id = session.user`。
3. 接口按角色最小暴露；管理接口独立网段/认证域。
4. 日志记录访问控制失败并告警。

---

## 9. 认证与会话管理缺陷

### 常见问题与攻击方式

- **弱口令 / 默认凭证 / 口令喷洒**：`admin/admin`、`123456`、一年一度的弱密码榜；防御：密码策略（NIST 800-63B：长度优先于复杂度）、限速、泄露密码库比对。
- **会话固定（Session Fixation）**：登录成功后不换新 session ID；防御：登录后重新生成。
- **会话不失效**：登出/改密后旧 token 仍有效；防御：服务端会话表 + 吊销。
- **JWT（JSON Web Token）常见漏洞**：

| 漏洞 | 原理 | 防御 |
|---|---|---|
| `alg: none` | 实现接受无签名令牌 | 强制校验算法白名单 |
| 弱密钥 | HS256 密钥可爆破（jwt-tools） | 长随机密钥 / RS256 |
| 算法混淆（RS256→HS256） | 用公钥当 HMAC 密钥「签名」 | 库级固定算法，不读 header 的 alg |
| 未校验签名/exp | 实现 bug | 使用成熟库，禁手撸解析 |
| 敏感信息入 payload | JWT 仅 Base64，明文可读 | payload 不放敏感数据 |
| 无法吊销 | 无状态天然缺陷 | 短期 access + 服务端可吊销 refresh token |

- **凭证填充（Credential Stuffing）**：用泄露库批量尝试；防御：限速、MFA、设备指纹。
- **密码重置缺陷**：可预测的 reset token、重置邮件枚举（响应差异暴露邮箱是否注册）、Host 头注入污染重置链接。

---

## 10. 竞态条件（Race Condition）

### 原理
「检查-使用」不原子：余额 100，两笔并发 80 元提现都通过了「余额 ≥ 80」检查。Web 场景还包括：重复使用一次性优惠码、并发超发库存、首次注册奖励。

### 攻击方式（示例）

```bash
# 用 30~50 个并发线程同时发同一请求（靶场演示）
# 工具：Turbo Intruder（PortSwigger）、wrk/hey
# 典型：同一 giftcard 兑换接口并发重放 20 次
```

关键技巧：HTTP/2 单包多请求（single-packet attack）消除发送时序差，使并发请求真正同刻到达。

### 防御
1. 数据库层原子操作：`UPDATE wallets SET balance = balance - 80 WHERE id=? AND balance >= 80`，检查受影响行数。
2. 事务 + 行级锁（`SELECT ... FOR UPDATE`）或唯一约束（一码一用：唯一索引）。
3. 幂等键（idempotency key）防重复提交。
4. 分布式锁谨慎使用，优先数据库约束这种「不可能出错」的机制。

---

## 11. 依赖与供应链攻击（Dependency/Supply Chain Attacks）

- **typosquatting / 投毒包**：`reqeusts`、`cross-env.js`、2024 年 `xz-utils` 后门事件（Social Engineering 投入维护者身份）。
- **install 阶段脚本投毒**：postinstall 执行恶意代码。
- **锁定文件篡改 / 内部镜像投毒**。
- **CI/CD 凭证泄露**：GitHub Actions 的 `GITHUB_TOKEN` 权限过大、自托管 runner 被利用。

防御：锁文件提交 + `npm ci`/`pip install -r`（禁浮动版本）、私有 registry + 代理白名单、`npm audit`/`pip-audit`/OSV-Scanner 进 CI、最小化 install 脚本（`ignore-scripts`）、SBOM（CycloneDX）追踪。

---

## 12. 其他高频后端问题（速查）

- **HTTP 请求走私（Request Smuggling）**：前后端对 `Content-Length`/`Transfer-Encoding` 解析不一致，可绕 WAF、劫持会话；防御：标准化前端配置、禁用两种头共存。
- **Host 头注入**：密码重置邮件/缓存键使用未校验的 Host；防御：白名单虚拟主机。
- **业务逻辑漏洞**：负数数量、整数溢出、订单金额前端计算信任、验证码爆破无限制——没有通用扫描器，靠人工审计。
- **信息泄露**：堆栈报错直出、`/.git/` 目录残留（可整站还原源码，工具 GitHack）、Swagger 暴露于生产。
- **日志注入与不安全反序列化的日志**：日志里写 `\n` 伪造记录；Log4Shell（CVE-2021-44228）即「日志内容触发 JNDI 加载」的经典。

---

## 复习自查

- [ ] 能解释为什么参数化查询能防 SQL 注入（语句结构先编译、数据只当数据）
- [ ] 能说出 SSRF 至少 4 种绕过黑名单的手法
- [ ] 能画出一条 Java 反序列化 RCE 的完整利用链（入口 → gadget → 命令执行）
- [ ] 能演示 IDOR 的测试步骤（双账号 + 标识替换重放）
- [ ] 能列出 JWT 三个经典漏洞及对应修复
- [ ] 能用数据库原子更新修复「余额并发提现」问题并解释为什么有效

## 延伸实验（labs 计划）

1. sqli-labs（Docker）通关 1–10 关（UNION/报错/盲注），再用参数化查询改写修复。
2. DVWA：Command Injection、File Upload、Path Traversal 三个模块 Low→Impossible 对照源码。
3. PortSwigger Academy：SSRF 全模块、Access control 全模块、JWT lab。
4. 自建 demo：Flask + pickle 的「会话记住我」反序列化漏洞 → 复现 → 换 itsdangerous 签名修复。

---

## 深入阅读（详解系列）

- [06-SQL注入详解](06-SQL注入详解.md) —— 参数化本质、UNION/盲注流程、多数据库差异、绕过矩阵
- [07-SSRF详解](07-SSRF详解.md) —— 云元数据、gopher 协议、DNS rebinding、Capital One 案例
- [08-文件操作类漏洞详解](08-文件操作类漏洞详解.md) —— 遍历/上传/LFI 全链、解析漏洞、WebShell 原理
- [09-反序列化与XXE详解](09-反序列化与XXE详解.md) —— Java/PHP/Python gadget、POP 链、盲 XXE
- [10-访问控制与认证详解](10-访问控制与认证详解.md) —— IDOR 双账号测试、JWT 全漏洞表、会话/OAuth
- [11-命令注入竞态与供应链详解](11-命令注入竞态与供应链详解.md) —— 单包攻击、请求走私、xz 后门复盘
