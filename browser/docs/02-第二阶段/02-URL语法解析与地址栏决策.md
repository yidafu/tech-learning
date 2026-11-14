# URL 语法解析与地址栏决策

> [← 第二阶段导览](01-导览.md) · 时间线 ①。这一册回答两个问题：地址栏里那串字符如何被结构化成一个 URL；浏览器凭什么判断「这是地址还是搜索词」。这是整条链路的起点——URL 解析错了，后面所有阶段都不会发生（或发生在错误的目标上）。

## 1. URL 不是字符串，是结构

用户眼里 URL 是一串字符；浏览器眼里 URL 是一组**字段**。解析的产物大致是：

```text
https://user:pass@example.com:8443/a/b/index.html?lang=zh&page=2#top
\___/   \________/ \_________/ \_/\_______________/ \__________/ \__/
scheme   userinfo     host      port     path         query    fragment
```

规范层面有两套文本：IETF 的 RFC 3986（URI 通用语法）与 WHATWG 的 [URL Standard](https://url.spec.whatwg.org/)。**浏览器实现以 WHATWG 为准**（WHATWG 把「合法但罕见」的写法大量标准化成了确定性行为），后端库（如 `new URL()` 的各语言实现）也陆续向它看齐。前端要记住的结论：**URL 解析在不同环境里应当有唯一答案**——这不是理所当然，而是规范演进的成果。

解析行为可以直接验证（每一行都值得在 Console 里亲手跑一遍）：

```js
const u = new URL('HTTPS://Example.COM:443/a/../b?q=中文#top');
u.protocol; // 'https:'       —— scheme 小写化
u.host;     // 'example.com'   —— host 小写化、默认端口被吸收
u.pathname; // '/a/../b'       —— 注意！WHATWG 的 URL API 不做点号消解到「最简形态」，
            //                    路径点号在「发送请求行」时才规范化（见下）
u.search;   // '?q=中文'        —— search 属性里仍是原文，序列化时才百分号编码
u.hash;     // '#top'
u.origin;   // 'https://example.com' —— scheme+host+port 三元组
```

> 上面注释里的「点号消解」是真实的坑：`pathname` 保留 `/a/../b`，而实际发出的请求行是规范化后的 `/b`。「API 视图」与「网络视图」的差异来自规范对不同环节的要求不同——别在 `pathname` 上做路径安全判断（防目录穿越要用专门逻辑）。

URL 相关的浏览器 API 速查：

| API | 用途 | 备注 |
|---|---|---|
| `new URL(str, base)` | 解析/相对补全 | 第二参数是 base，替代手拼 |
| `url.searchParams` | query 读写（URLSearchParams） | 按 `x-www-form-urlencoded` 约定，`+` 当空格 |
| `location.*` | 当前文档 URL 的各段视图 | 改 `location.hash` 触发同文档导航 |
| `URL.createObjectURL` | blob → URL | origin 绑定（见 §6） |

### 1.5 WHATWG 解析算法的五步骨架

不用背算法，但要建立「解析是有序状态机、不是正则」的心智模型。WHATWG URL parser 的主干：

```text
① trim 前后空白与控制字符      ← 用户输入带空格回车也照收
② scheme 状态                  ← 读到 ':' 前的部分定 scheme；读不到按「相对」处理
③ 权限（authority）状态        ← @ 分割 userinfo，: 分割端口，'/' 结束
④ host 状态                    ← 域名逐段校验/IDN 处理/IP 解析；special scheme 严格、其余宽松
⑤ path/query/fragment 状态     ← 逐字符进各自的编码状态机
```

两个「怪行为」都能从骨架里找到解释：

- **`url:8080` 里端口没解析出来**——`url:` 不是 special scheme，走宽松路径，很多步骤跳过；
- **输入里的制表符/换行被静默剥掉**——第 ① 步就做了（这是「URL 里藏着 `\n` 还能正常访问」的原因，也是安全审查要警惕的）。

## 2. 逐段语法走读

### 2.1 scheme

- 语法：`ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )` 后跟 `:`。不区分大小写（`HTTP:` ≡ `http:`）。
- 浏览器内置 scheme 一大串：`http/https/file/blob/data/about/javascript/view-source…`；还有操作系统注册的外部协议（`mailto:`、`tel:`、`itms-apps:`…），点击后浏览器把控制权交给系统。
- **非特殊 scheme 与特殊 scheme 的待遇天差地别**：WHATWG 把 `http(s)/ws(s)/file/ftp` 列为 special——它们有默认端口、host 必须是域名或 IP、解析规则完整；自定义 scheme（比如 `myapp:`）的解析宽松得多，很多校验直接跳过。这解释了「为什么 `myapp://` 什么都能塞」。

### 2.2 userinfo

`user:pass@host` 里的凭证段。**现代浏览器在地址栏会隐藏它**（显示层防钓鱼），但请求行为上仍然会把它发给服务器（http 基本认证的历史通道）。安全上它是老朋友：

```text
https://example.com@evil.com/
        └─ 真正的 host 是 evil.com，example.com 是 userinfo
```

钓鱼链接的经典手法——浏览器安全团队多年的显示策略升级都围绕这类混淆。

### 2.3 host 与端口

- 域名逐段 ≤63 字符、总长 ≤253；允许的字符是有限集（字母数字连字符），其他字符进 IDN 流程（见 §4）；
- 端口省略 = scheme 默认端口（http 80 / https 443）。「显式写默认端口」在解析时被吸收：`:443` 不影响最终 origin；
- **origin 的定义就锚在这一段**：`scheme + host + port`。第七阶段之后所有同源策略讨论里的「同源」，源头就是这里解析出的三元组。

### 2.4 path

- 以 `/` 分段的层级结构；每段内允许字符集比用户想象的小，其余字符百分号编码；
- 路径点号（`./`、`../`）的消解规则在 RFC 3986 §5.2 与 WHATWG 里都有逐步算法——重点不是背算法，而是知道**消解发生在「相对 URL 解析」与「请求行生成」两个时机**（见 §5）。

### 2.5 query

- `?` 到 `#` 之间的原文。**query 不参与 origin**，但参与缓存键（第五阶段 CDN 一册会看到它如何影响命中率）；
- 空格、`&`、`=`、中文……默认编码行为依发送方而异。`URLSearchParams` 按 `application/x-www-form-urlencoded` 约定把空格编码为 `+`，而 `encodeURIComponent` 编码为 `%20`——两种「空格」在严格的服务器上语义不同。参数边界被破坏的案例：用 `encodeURI` 编整条 URL 时 query 里的 `&` 不会被编码（它属于「保留字符」），`?a=1&b=2` 的参数边界因此被吃掉。

### 2.6 fragment

- `#` 之后的部分。**fragment 不发送给服务器**——它只在客户端生效（锚点定位、SPA 路由的 hash 模式）；
- 改变 fragment 不触发导航（同文档导航）——这正是 hash 路由能不刷新页面换「地址」的机制基础，也是第二阶段 04 册「同文档导航」概念的第一现场。

### 2.7 location 对象：当前文档的 URL 视图

页面 JS 里拿到的 `location`，就是本册解析结果的一个只读+部分可写视图：

| 属性 | 值（对 `https://a.com:8443/p/q?x=1#f`） | 可写？写了会怎样 |
|---|---|---|
| `href` | 完整 URL | 可写 → 触发导航（跨文档） |
| `protocol` | `https:` | 可写 → 导航 |
| `host` | `a.com:8443` | 可写 → 导航 |
| `hostname` / `port` | `a.com` / `8443` | 同上 |
| `pathname` | `/p/q` | 同上 |
| `search` | `?x=1` | 同上 |
| `hash` | `#f` | 可写 → **同文档导航**（不刷新） |
| `origin` | `https://a.com:8443` | 只读 |
| `assign()/replace()` | — | 导航（replace 不留历史） |

注意 `hash` 是唯一的「写它不刷新」的例外——它落在同文档导航分支（第二阶段 04 册的 §4）。SPA 路由无论 hash 模式还是 history 模式，本质都是操纵这张表里「不触发完整导航」的那几个入口。

### 2.8 一条 URL 的两副面孔：显示层 / API 层 / 网络层

同一条 URL 在三层各呈不同形态——排障时先确认自己在跟哪一副面孔打交道：

```text
用户输入   : HTTPS://例子.测试:443/a/../b?q=中文#top
地址栏显示 : https://例子.测试/b?q=中文#top      ← 防钓鱼脱敏 + IDN 还原 + 省略默认端口
new URL()  : pathname 仍是 /a/../b（点号保留）   ← API 视图，§1 的坑
请求行发出 : GET /b?q=%E4%B8%AD%E6%96%87         ← 百分号编码 + 点号消解 + 无 fragment
服务端日志 : /b?q=%E4%B8%AD%E6%96%87             ← fragment 从不出现（§2.6）
```

谁动了哪一段：显示层动 scheme/userinfo/IDN/端口；API 层几乎原样保留（含路径点号）；网络层做编码、点号消解并剥掉 fragment。「用户发誓地址没错但服务端 404」的对账法——显示层 → `new URL()` → 请求行逐层比对——就是排障起手式，三层对不上的那一层就是事故层。

## 3. 百分号编码（percent-encoding）

编码规则三句话：字节 → `%XY`（XY 为两位十六进制）；**哪些字节需要编码**由所在段的「安全字符集」决定；解码发生在消费端。

```text
「中」 → UTF-8 字节 E4 B8 AD → %E4%B8%AD
空格   → %20（通用）或 +（仅表单约定）
「&」  → %26（在参数值里必须编码，否则是参数边界）
```

必须搞清的三层：

| 层 | 编码对象 | 例子 |
|---|---|---|
| 必须编码 | 非安全字符（空格、中文、控制字符…） | `q=中文` → `q=%E4%B8%AD%E6%96%87` |
| 可选编码 | 安全字符也可以被编码而不改变语义 | `%68ttp` ≡ `http`（path 里） |
| 双重编码（事故） | 已编码序列再次编码 | `%25E4%25B8%25AD`——服务器解一层还是乱码 |

**双重编码的典型事故链**：前端手动 `encodeURIComponent` → 框架/路由又编一次 → 服务器解一层 → 下一层拿到的还是 `%E4%B8%AD...`。规矩只有一条：**编解码责任归属明确，每层只编一次**。

两个编码函数的分工（事故高发区，背下表）：

| 函数 | 保留不编的字符 | 正确用途 |
|---|---|---|
| `encodeURI` | `:/?#[]@!$&'()*+,;=` 等结构字符 | 极少用；编「整条已知合法」的 URL |
| `encodeURIComponent` | 仅 `-_.!~*'()` | **编单个参数值**（最常用） |

**整条 URL 用 `encodeURI` 是常见误用**（query 里的 `&` 不会被编，参数边界被破坏）；正确姿势是逐段拼接：`new URL()` + `searchParams.set`。

### 3.5 注入位置速查：URL 各段注入会发生什么

「URL 拼接」类安全审查的定位表（本站讲位置，攻防细节归 security 站）：

| 注入位置 | 塞进去什么 | 后果 |
|---|---|---|
| path | `../` 点号穿越 | 逃出预期目录 |
| query 参数值 | 未编码的 `&`/`=` | 参数边界被破坏（§3 的 encodeURI 误用同款） |
| query 参数值 | 未编码引号（进 HTML 时） | 反射型 XSS 的经典入口 |
| fragment | `javascript:` 片段（历史） | 现代浏览器已封死，旧代码残留仍会踩 |
| host（跳转白名单） | `@` 混淆、`evil.com#` | 开放重定向到钓鱼站 |

记忆锚点：**每个注入事故都是「该编码的段没编码」或「该校验的段没校验」**——与 §3 的编码表、§1.5 的解析骨架一一对应。

## 4. IDN 与 Punycode：中文域名怎么上网

DNS 协议层只认 ASCII。中文域名（国际化域名，IDN）的落地链路：

```text
用户输入 「例子.测试」
  → 浏览器按 IDNA/UTS#46 处理（大小写折叠、规范化）
  → 每段 Punycode 编码 + xn-- 前缀
  → 例子.测试 → xn--fsqu00a.xn--0zwm56d   ← 这串才是发给 DNS 的
```

浏览器地址栏**显示**时又把 `xn--...` 解回 Unicode（否则用户根本认不出自己的域名）。这个「显示还原」正是攻击面：**同形异义字攻击（homograph attack）**——注册一个长得像 `apple.com` 的域名（用西里尔/希腊字母里形状相同的字符），浏览器还原显示后肉眼看不出差别。

浏览器的防御是显示策略的组合：只对「可信等级高」的 IDN 显示 Unicode（该域名的注册语言与浏览器 UI 语言匹配等），否则**直接显示 punycode 原文**。你可以自测：访问任一 `xn--` 域名，看地址栏是显示中文还是 `xn--`——这取决于浏览器对它注册语言的判定。

## 5. 相对 URL 与 base URL

页面里写 `<a href="./b.html">`、`url(../img/x.png)`、`fetch('api/list')`——相对 URL 靠 **base URL** 补全：

1. base = 文档自身 URL（或 `<base href>` 显式指定）；
2. 合并算法按 RFC 3986 §5.3：路径点号消解就在这里发生。

四种组合的结果（事故高发区，背下来）：

| base | 相对路径 | 结果 | 原因 |
|---|---|---|---|
| `https://a.com/x/y/` | `z.html` | `https://a.com/x/y/z.html` | base 以 `/` 结尾，`y` 是目录 |
| `https://a.com/x/y` | `z.html` | `https://a.com/x/z.html` | `y` 被视为「文件」被替换 |
| `https://a.com/x/y/` | `../z.html` | `https://a.com/x/z.html` | `..` 弹一层 |
| `https://a.com/x/y` | `/z.html` | `https://a.com/z.html` | 以 `/` 开头 = 根绝对路径 |

**尾斜杠语义**是相对路径事故的头号来源。前端构建工具生成的资源路径（`/assets/` vs `assets/`）出问题，九成可以先查 base 与尾斜杠。Docusaurus 的 `baseUrl` 配置要求尾斜杠，就是这条规则的工程化体现——本仓库每个站的配置里都能看到。

## 6. 特殊 scheme 清单（浏览器内行为差异）

| scheme | 行为 | 备注 |
|---|---|---|
| `about:blank` | 空白文档，常作为 iframe/窗口的初始 about 腔 | 继承 opener 的 origin（`document.write` 时代的坑源） |
| `about:srcdoc` | iframe srcdoc 文档的标识 | 继承父 iframe 的 origin |
| `blob:` | 二进制对象引用，`blob:https://origin/uuid` | **绑定 origin**——别的站点访问不了你的 blob URL |
| `data:` | 自包含数据 URL | 导航到顶层 `data:` URL 被现代浏览器禁止（钓鱼/下载滥用历史）；`<img src="data:...">` 仍合法 |
| `file:` | 本地文件 | 独立的同源策略（每个文件近乎独立 origin）；页面无法 fetch 其他 file: 路径 |
| `javascript:` | 代码执行 URL | 作为 href 时执行并把返回值当文档；现代实践已弃用（CSP 可整体禁掉） |
| `view-source:` | 查看源码 | 与其他 scheme 的组合有严格限制 |

`blob:` 的 origin 绑定值得展开一句：`URL.createObjectURL(blob)` 生成的 URL 形如 `blob:https://a.com/uuid`——它「属于」a.com。这就是为什么把 blob URL 传给另一个站点打开会失效（不是格式不认识，是 origin 校验不过）。文件下载与 `<img>` 本地预览的基础设施就是它。

## 7. 地址栏判定：这串字符是 URL 还是搜索词

回车瞬间，UI 线程先做**分类**（不是解析！先判断要不要按 URL 解析）：

```mermaid
flowchart TD
  A[用户输入 + 回车] --> B{有合法 scheme?}
  B -- 是 --> U[按 URL 处理]
  B -- 否 --> C{含空格?}
  C -- 是 --> S[搜索词]
  C -- 否 --> D{含点号/冒号端口<br>或形似域名?}
  D -- 是 --> U2[按 URL 处理<br>补 scheme]
  D -- 否 --> S2[默认搜索引擎]
```

通用启发式（各家实现细节不同，方向一致）：

- `a.b` 会被当域名（补全 scheme 后解析），`a.b.c` 同理——哪怕它不是合法 TLD，解析失败后才降级为搜索；
- **键盘修饰切换**：Chrome 里 Shift+Enter 用另一个默认搜索引擎、Ctrl+Enter 自动补 `www.` 与 `.com`（中文版行为可配置）；
- 内网主机名（`myserver`，无点号）默认进搜索——这是无数「内网服务打不开」咨询的答案：要么写全 `http://myserver.local`，要么改浏览器/系统搜索策略；
- 非法字符（空格后跟 URL 片段之类）在分类阶段就被拦下，**根本不会产生 DNS 查询**——排查「为什么没发请求」时，第一步是确认分类结果（地址栏下拉里第一项是「搜索」还是 URL）。

## 8. 地址栏建议体系：还没回车就有网络请求

输入过程中，地址栏下拉已经在干活：

| 建议来源 | 是否联网 | 说明 |
|---|---|---|
| 历史/书签/打开的标签 | 否 | 本地索引即时匹配 |
| 搜索引擎建议 | **是** | 每次输入变化都发请求（打字驱动的请求风暴，节流与取消逻辑在浏览器内部） |
| URL 自动补全 | 否 | 基于 host 历史 |

对性能学习的意义：**第一笔网络流量出现在 ① 之前**。用 Wireshark 抓「打开浏览器、敲几个字、还没回车」的过程，就能看到搜索建议请求。它们与你的导航请求**共享连接池与 DNS 缓存**——这有时是好事（建议请求已把 DNS 查了），有时是干扰（分析 waterfall 时出现「莫名的搜索域名请求」）。

### 8.5 打字驱动的请求流：取消与节流

搜索建议请求有三个容易被忽略的工程细节（它们是所有「输入即请求」场景的通用范式）：

| 细节 | 浏览器的做法 | 你写代码时的对应物 |
|---|---|---|
| **节流** | 输入不是每键必发——间隔合并 | debounce（防抖） |
| **取消** | 新输入到来时丢弃/取消上一个未完成请求 | AbortController |
| **乱序保护** | 网络不保证先发先至，旧响应不能盖新响应 | 序号/时间戳比对 |

「建议下拉闪旧词」就是三条里丢了某条的 bug 形态。抓包实验（实验 6）里可以观察到：快速输入五个字符，实际发出的请求数远小于五——节流参数就在包间隔里。

## 9. 实验

1. **解析差异实验**：在 Console 里跑 `new URL()` 十连（含 `HTTPS://EXAMPLE.com:443`、`/a/../b`、`%68ttp`、中文 query、`blob:`、`data:`、无 scheme 的 `a.b`），逐个对照 §2/§3/§6 的预期。
2. **相对路径尾斜杠实验**：写两个目录页面（一个 base 带尾斜杠一个不带），里面放 `href="sub/page.html"`，点击对比最终地址栏。
3. **分类实验**：地址栏分别输入 `localhost`、`localhost:3000`、`a.b`、`hello world`、`1+1`、`999`，观察哪些被当 URL、哪些被当搜索，对照 §7 启发式。
4. **IDN 实验**：访问一个 `xn--` 域名（可用 dig 把任意中文域名转出 punycode），观察地址栏显示形态；再用 `new URL('https://例子.测试/')` 看 `host` 属性是 Unicode 还是 `xn--`。
5. **编码实验**：`new URLSearchParams({q: 'a b&c=中文'}).toString()` 与 `encodeURIComponent('a b&c=中文')` 对比输出——`+` 约定与 `%26` 的差异一目了然。
6. **建议流量抓包**：Wireshark 过滤搜索引擎域名，输入三个字符，数一下建议请求有几个、间隔多少（输入节流的真实参数）。

## 10. 常见误区

1. **「URL 就是字符串，拼一下就行」**：字符串拼接是注入与编码事故的头号来源。结构化拼接（`new URL(path, base)` + `searchParams.set`）永远优于手拼。
2. **`pathname` 可用于安全判断**：点号消解不在 API 视图里（§1），目录穿越防护请用显式规范化逻辑。
3. **「中文域名传输时就是中文」**：线上传输的是 punycode；乱码排查时先确认问题出在 IDN 层还是普通的百分号编码层。
4. **「fragment 会发给服务器」**：不会。服务端日志里永远看不到 `#` 后的内容——这也是为什么 SPA hash 路由的页面统计需要前端上报。
5. **「浏览器地址栏显示的就是真实 URL」**：显示层有防钓鱼处理（隐藏 userinfo、IDN 显示策略、脱敏）。排查问题要看「复制链接地址」或 Network 面板，而不是肉眼读地址栏。
6. **「`+` 和 `%20` 都代表空格所以随便用」**：`+` 只是表单约定；非表单场景（如 path、RESTful URL）里 `+` 是字面加号——混用会出现「 sometimes 解出来的空格变加号」的诡异 bug。

## 11. 自测题

1. 写出 URL 七个组成部分，并指出哪三段参与 origin 的构成。
2. `encodeURI` 和 `encodeURIComponent` 各自保留哪些字符？为什么「整条 URL」不该用 `encodeURIComponent`？
3. 双重编码事故的完整成因链是什么？给出一条团队规约来根治它。
4. `https://example.com@evil.com/` 的真实 host 是谁？浏览器显示层如何缓解这类混淆？
5. 中文域名「例子.测试」发给 DNS 的字符串长什么样？浏览器显示它时遵循什么策略？
6. `https://a.com/x/y` 与 `https://a.com/x/y/` 各自加上相对路径 `z.html`，结果分别是什么？
7. `blob:` URL 为什么跨站点打不开？它的 origin 绑定机制是什么？
8. 输入 `myserver:8080` 和 `myserver` 在地址栏的待遇为什么不同？内网主机名打不开的标准解法是什么？
9. 为什么改 fragment 不触发网络导航？这个机制被 SPA 的哪种路由利用？
10. 还没按回车，什么请求已经发出去了？它对正式导航的 ③（DNS）可能产生什么影响？
11. `URLSearchParams` 编码空格为 `+`，`encodeURIComponent` 编码为 `%20`——什么场景下这个差异会炸？（提示：非表单解析的服务端。）
12. （提示题）`location.hash` 与 `location.search` 同为可写，为什么只有写 hash 不触发刷新？——用「同文档导航」的判定条件作答。
13. WHY 解析骨架的哪一步保证了「URL 里藏 `\n` 还能访问」？这个行为对安全审查意味着什么？（提示：§1.5 的第 ① 步。）

## 12. 延伸

- 下一册：[03-导航决策链-HSTS-ServiceWorker-缓存与BFCache](03-导航决策链-HSTS-ServiceWorker-缓存与BFCache.md)——分类完成、确认是导航，浏览器开始查「能不能不发请求」。
- origin 与同源策略的攻防面（postMessage、document.domain 历史、COOP/COEP）详见 `security/` 站；本站只负责「origin 从哪来」。
