# SSRF 服务端请求伪造详解

- 日期：2026-11-04
- 所属大纲阶段：第 3 阶段 Web 安全
- 参考资料：OWASP SSRF Prevention Cheat Sheet、PortSwigger Academy（SSRF 模块）、AWS 文档（IMDSv2）、Orange Tsai《A New Era of SSRF》(HITCON 2017)、secure Consult SSRF bible
- 前置阅读：[02-Web后端常见漏洞与攻击](02-Web后端常见漏洞与攻击.md)
- 说明：所有 payload 仅限本地靶场与授权测试环境。

---

## 1. 原理深入

### 1.1 为什么 SSRF 危害远超「让服务器访问个网页」

服务器的网络位置决定了它能看到什么：

```
互联网用户视角：      [DMZ: Web 服务器] —— [内网: 数据库/缓存/管理后台/云元数据]
                              ▲ SSRF 让攻击者「借 Web 服务器的眼睛看内网」
```

- Web 服务器通常能直连数据库、Redis、Kubernetes API、Docker API、内部管理面板——这些服务**常无认证**（「内网即安全」的假设）。
- 云环境里每台实例都有一个**元数据服务（Metadata Service）**，只有实例自己能访问，里面是临时 IAM 凭证。
- SSRF 把「网络边界」这个物理隔离变成了逻辑问题：防火墙挡得住攻击者，挡不住攻击者指挥的服务器。

### 1.2 常见入口（攻击面盘点）

| 入口 | 特征 |
|---|---|
| Webhook / 回调 URL 配置 | 「支付成功请通知我的服务器」 |
| 远程资源导入 | 导入头像 URL、抓取链接预览、RSS 订阅 |
| PDF 生成 / HTML 渲染 | wkhtmltopdf / headless Chrome 渲染用户 HTML，内嵌资源请求 |
| 文件解析 | XML（XXE→SSRF）、SVG 图片、Office 文档内的外链 |
| 第三方集成 | OAuth 回调代理、站点健康检查功能 |
| 内部代理/网关 | 「通过我访问」类服务 |

---

## 2. 利用技术详解

### 2.1 基础探测：内网端口扫描

```
?url=http://127.0.0.1:8080/     # 响应特征（状态码/长度/耗时）区分 开放/关闭/过滤
?url=http://192.168.1.0/24/     # 网段遍历（脚本化，观察响应差异）
```
盲 SSRF（无响应差异）用外带探测：指向攻击者控制的服务器，能收到请求即证明可达；端口扫描用响应时间差（连接 refused 快，被防火墙 drop 慢）。

### 2.2 协议利用（协议决定能力上限）

```
http:// / https://    通用探测、访问内网 Web
file:///etc/passwd   本地文件读取（取决于请求库支持的协议）
gopher://            【重武器】可构造任意 TCP 报文：打 Redis 写计划任务/写 WebShell、
                     打 FastCGI、打 SMTP 发邮件、打 MySQL（未授权时）
dict://              探测服务 banner（dict://127.0.0.1:6379/INFO）
ftp:// / sftp://     内网文件服务探测
ldap://              AD 环境
```

gopher 打 Redis 示例（教学简述，靶场复现）：Redis 未授权 + `CONFIG SET dir` 可写 `authorized_keys` 或 crontab。gopher URL 逐字节编码目标协议报文——工具 gopherus 生成。这解释了为什么 SSRF 防御必须**限制协议白名单**。

### 2.3 云元数据：SSRF 的高价值目标

```
# AWS IMDSv1（历史上最经典链路）
http://169.254.169.254/latest/meta-data/iam/security-credentials/<角色名>
→ 返回 AccessKeyId / SecretAccessKey / Token
→ 攻击者直接用该凭证访问 S3 等资源

# GCP
http://metadata.google.internal/computeMetadata/v1/   (需头 Metadata-Flavor: Google)
# Azure
http://169.254.169.254/metadata/instance?api-version=2021-02-01   (需头 Metadata:true)
# 阿里云
http://100.100.100.200/latest/meta-data/
# Kubernetes
https://kubernetes.default.svc    (Pod ServiceAccount token 挂载在文件，配合文件读取)
```

链接地址 169.254.0.0/16 是链路本地（link-local）地址，仅实例内可达——这正是 IMDS 的设计信任：只有实例自己能访问。SSRF 打破了这个假设。

### 2.4 绕过黑名单/白名单校验

```
① IP 表示变形（127.0.0.1 的等价写法）：
   0x7f000001（十六进制）、2130706433（十进制）、017700000001（八进制）、
   127.1（省略零）、0.0.0.0、[::1]（IPv6 回环）、127.000.000.001

② DNS 解析 tricks：
   - 攻击者域名 A 记录指向 127.0.0.1（localtest.me、*.nip.io/127.0.0.1.nip.io）
   - DNS rebinding：第一次解析返回公网 IP（过校验），第二次返回 127.0.0.1（实际连接）。
     原理：校验用一次 DNS 查询，实际请求用另一次查询，TTL=0 使两次结果不同。
     根治必须「校验的就是连接的 IP」（见防御 3.4）

③ 重定向：白名单域返回 302 → Location: http://169.254.169.254/
   （防御：禁跟随重定向，或每跳重新校验）

④ URL 解析差异：
   http://evil@169.254.169.254/        （userinfo 混淆，解析器取 host 不一致）
   http://169.254.169.254#@trusted.com
   http://trusted.com@169.254.169.254/ 与上例相反方向

⑤ 解析器不一致：libcurl / Python urllib / WHATWG URL 对 `\`、`//`、空格处理不同，
   WAF 校验库与后端请求库用不同 parser 时产生 bypass
```

### 2.5 从 SSRF 到 RCE 的常见链条

```
SSRF → Redis 未授权（gopher）→ 写 crontab / authorized_keys / WebShell → RCE
SSRF → IMDS 凭证 → S3 桶读写 / 更多服务 → 数据窃取 / 持久化
SSRF → Kubernetes API（ServiceAccount token）→ 创建特权 Pod → 节点逃逸
SSRF → 内网管理后台（Jenkins、Consul、Docker API）→ 各自的 RCE
```

---

## 3. 真实案例

- **Capital One（2019）**：WAF 配置不当 + SSRF，攻击者从实例元数据（IMDSv1）取得 IAM 凭证，复制 S3 数据，约 1 亿美国用户与 600 万加拿大用户信息泄露。罚款 8000 万美元。直接推动 AWS 全力推进 IMDSv2。教科书级案例：SSRF（初始）+ 过度权限 IAM（放大）。
- **微软 Azure SSRF 系列赏金**：SSRF 是各大厂赏金项目单独列出的高价类目（MSRC Bounty 指南对 SSRF 有专门条款）。

---

## 4. 检测与发现

1. 入口审计：全库搜索发请求 API：`requests.get`、`fetch(`、`curl_exec`、`HttpClient`、`URL()`，追踪 URL 来源是否含用户输入。
2. 参数审计：抓包找出所有 URL 型参数（`url=` `host=` `path=` `callback=` `next=` `domain=`）。
3. 外带验证：Burp Collaborator / 自建 DNS+HTTP 服务器，替换 URL 参数观察是否收到请求（同时记录来源 IP——确认为服务端出口而非浏览器）。
4. 探测内网特征响应：`127.0.0.1:80` 的响应特征（Server 头、默认页）。

---

## 5. 防御详解

### 5.1 分层防御清单

| 层 | 措施 |
|---|---|
| 输入 | 协议白名单（仅 http/https）+ 域名白名单（业务必需的外部域） |
| 解析 | 域名解析成 IP 后校验：拒绝环回/私有/链路本地/保留网段（127/8、10/8、172.16/12、192.168/16、169.254/16、::1、fc00::/7、fe80::/10、0.0.0.0）——用标准库判断而非手写字符串前缀 |
| 连接 | **用解析出的 IP 建连**（防 rebinding）；设置 `Host` 头为原域名（SNI/虚拟主机需求） |
| 重定向 | 禁跟随；必须跟随时每跳重新走全部校验 |
| 网络架构 | 应用服务器 egress 隔离：出网仅经代理白名单；实例安全组禁止访问 IMDS 之外的内网段 |
| 云 | AWS 强制 IMDSv2（PUT+token，跳数限制 `hop limit=1`）；GCP 开启元数据隐藏 |
| 权限 | 实例角色最小权限——即便凭证泄露，可访问面也最小 |

### 5.2 参考实现（Python）

```python
import ipaddress, socket, requests
from urllib.parse import urlparse

PRIVATE = lambda ip: ip.is_private or ip.is_loopback or ip.is_link_local \
                     or ip.is_reserved or ip.is_unspecified

def safe_fetch(url: str):
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        raise ValueError("protocol not allowed")
    if p.hostname is None:
        raise ValueError("no host")
    ip = socket.gethostbyname(p.hostname)          # 解析
    if PRIVATE(ipaddress.ip_address(ip)):
        raise ValueError("internal address blocked")  # 校验
    # 生产级应：用 ip 直连 + 手动设置 Host + 禁重定向；此处演示校验逻辑
    return requests.get(url, allow_redirects=False, timeout=5)
```

注意手写校验的坑：`socket.gethostbyname` 只返回第一个 A 记录（多 A 记录 rebinding 仍可绕），彻底方案是自定义连接器直接绑定已校验 IP。

### 5.3 完全禁止出网的场景

内网工具类服务（内部代理、健康检查）默认 deny，逐个白名单放行目标。宁可业务多提工单，不开放 egress。

---

## 6. 常见误区

- ❌「黑名单拉黑 127.0.0.1 和 169.254.169.254 就够了」→ IP 变形 + DNS rebinding + 内网段遍历（10.x/192.168.x）都在黑名单外。
- ❌「校验时解析过 IP，没问题」→ 校验与连接是两次解析，rebinding 攻击的就是这个间隙。
- ❌「内网服务没有公网暴露，随便部署」→ SSRF/JWT 泄露/内网横向都能到达它们；内网服务的认证不能省。
- ❌「我们的 SSRF 只能拿 GET 且无回显，没危害」→ 盲 SSRF 依然能探测内网端口拓扑；gopher 类协议可能升级为任意报文。

---

## 复习自查

- [ ] 能画出 Capital One 攻击链的完整步骤
- [ ] 能列出至少 6 种 SSRF 绕过手法并各配一个修复
- [ ] 能解释 DNS rebinding 的原理与「校验即连接」的防御思想
- [ ] 能写出 IP 网段校验代码（环回/私有/链路本地/保留）
- [ ] 能说出 IMDSv2 相对 v1 的三个变化（PUT、token、hop limit）

## 延伸实验（labs 计划）

1. PortSwigger Academy SSRF 模块（基础/黑名单绕过/白名单过滤绕过/盲 SSRF/开放重定向链）。
2. 自建靶场：Docker Compose 起一个带 SSRF 的 Flask 应用 + 内网 Redis + 假元数据服务，复现 2.2/2.3 的探测与利用，再按 5.1 修复。
3. gopherus 生成 Redis payload 在本地靶机复现（观察为什么需要未授权 Redis）。
