---
sources:
  - 05-第五阶段
---

# 07. Schema 演进与零停机迁移

> [← 第五阶段导览](01-导览.md) · 零停机迁移的唯一判据是「**任意时刻，新旧两版代码都能跑在同一张表上**」；不满足这条的迁移，本质上是「停机窗口」的伪装。

## 1. Flyway 的三条纪律

Flyway 管的事很简单：按版本号顺序执行 SQL 脚本、把执行记录写进 `flyway_schema_history`、下次启动时跳过已成功的。难的是纪律。

**纪律一：已合入主干的脚本永不修改。** Flyway 对每个脚本算 CRC32 校验和存在历史表里，改了内容再启动就会：

```text
Migration checksum mismatch for migration version 20261115.1
-> Applied to database : -1785321221
-> Resolved locally    : 2055193497
```

`flyway repair` 能把历史表里的校验和改成新值，但它只改记录、不改事实——环境之间已经产生漂移，`repair` 只是把警报器关掉。正确做法永远是新增一个脚本。

**纪律二：版本号全局唯一且单调。** 多人同时开发时最容易撞号。用时间戳式版本号（`V20261115103000__...`）比自增序号（`V17__`）更能避免冲突，代价是名字长。分支开发加上 `outOfOrder=true` 能让晚提交的脚本补跑，但它会让「数据库最终状态」依赖于执行顺序，生产环境建议关掉。

**纪律三：每个脚本是一个原子单元。** PG 支持事务 DDL，Flyway 默认把整个脚本包在一个事务里，失败自动回滚，历史表记录 `success=false`。**MySQL 的 DDL 是隐式提交的**，一个脚本里三条 `ALTER` 失败在第二条，前一条已经生效且无法回滚——所以 MySQL 上要一个脚本只做一件事，并把脚本写成幂等可重跑的形态。

| 脚本类型 | 前缀 | 用途 | 特点 |
|---|---|---|---|
| 版本化 | `V{version}__{desc}.sql` | 建表、加列、改索引 | 只执行一次，校验和固定 |
| 可重复 | `R__{desc}.sql` | 视图、函数、触发器 | 校验和变了就重跑，永远在版本化脚本之后 |
| 基线 | `baseline` + 配置 | 接管已有库 | 只写一条基线记录，不执行 SQL |

接管一个已经存在的库，配置是 `baseline-on-migrate=true` + `baseline-version=1`，Flyway 会在历史表插一条 `type=BASELINE` 的记录，然后把 `V1` 之后的脚本全部执行。**别忘了先把现有结构 dump 成 `V1__init.sql`**，否则新环境从零建库时会缺表。

## 2. 零停机迁移的五步法

这套流程的名字叫 expand-contract（扩展-收缩）：先让新旧结构**并存**，再让数据从旧结构流向新结构，最后删除旧结构。核心不是步骤本身，是每一步都要问「此刻回滚，旧版本代码还能不能跑」。

```mermaid
flowchart LR
  A["1 加列<br>可空、无默认"] --> B["2 双写<br>写新旧两列，读旧列"]
  B --> C["3 回填<br>分批刷历史行"]
  C --> D["4 切读<br>读新列，仍双写"]
  D --> E["5 停双写<br>删旧列"]
  E --> F["完成"]
  style A fill:#e8f4ff
  style E fill:#ffe8e8
```

以一个真实需求为例：`orders.status` 是 `varchar`，现在要改成更强的约束与新的枚举值集合。直接 `ALTER TYPE` 会锁表重写，所以走五步。

**第 1 步：加列。** 新列必须可空、且不带易变默认值：

```sql
ALTER TABLE orders ADD COLUMN status_v2 varchar(16);
```

旧代码的 `INSERT` 不含这一列，新列为 `NULL`，完全正常。这一步的 DDL 在 PG 11+ 是元数据操作，毫秒级完成——**前提是没有 `DEFAULT`，或有常量 `DEFAULT`**。写 `DEFAULT 'NEW'` 在 PG 11+ 同样是元数据操作（用 missing value 存储），但写 `DEFAULT now()` 或任何 volatile 函数会重写全表。

**第 2 步：双写。** 新版本代码在同一个事务里写两列，但**读仍然读旧列**。为什么读旧列？因为历史数据还没回填，新列大部分是 `NULL`，读新列会拿到空值。这一步的部署是纯增量：新代码兼容旧数据，旧代码兼容新表结构，任意时刻两个版本混跑都没问题。

**第 3 步：回填。** 把历史行的 `status_v2` 从 `status` 刷过来。必须分批、限速、可中断（§4）。

**第 4 步：切读。** 新代码开始读 `status_v2`，但仍然双写。这一步是**唯一需要开关的步骤**：加一个配置项 `app.migration.read-v2=true`，出问题一秒切回。切换前必须确认回填 100% 完成，且双写没有漏（§5 的对账 SQL）。

**第 5 步：停双写、删旧列。** 先把双写关掉，观察一个发布周期（确保没有旧版本实例还在跑），再删列。删列前用 `pg_stat_statements` 搜一遍有没有查询还在引用旧列——跨服务共享库时，这一步经常抓到「另一个团队的服务还在读」。

```sql
ALTER TABLE orders DROP COLUMN status;
```

### 每一步「旧代码能否存活」

这张矩阵是整套流程的验收标准，任何一格为「否」都意味着那一步存在停机窗口：

| 步骤 | 旧代码（v1） | 新代码（v2） | 回滚动作 | 可逆性 |
|---|---|---|---|---|
| 1 加列 | 能（不写不读） | 能 | `DROP COLUMN` | 完全可逆 |
| 2 双写、读旧列 | 能（写时新列为 NULL） | 能（读的还是旧列） | 关开关，回滚发布 | 完全可逆 |
| 3 回填 | 能 | 能 | 停任务、清空新列 | 可重跑 |
| 4 切读新列 | 能（旧列仍在双写） | 能 | 配置切回旧列 | 秒级可逆 |
| 5a 停双写 | **不能**：旧代码不再写新列，新代码读到过期值 | 能 | 重新打开双写 | **有条件** |
| 5b 删旧列 | **崩**：`SELECT` 引用不存在的列 | 能 | 加回列 + 重新回填 | **不可逆** |

第 5a 步的风险最容易被低估：它不报错，只是**悄悄读到过期数据**。所以停双写要和「下掉所有旧版本实例」严格同序——先确认 `kubectl get pods` 里全是新版本，再关双写。

## 3. 大表 DDL 的锁风险

PG 的 DDL 需要 `ACCESS EXCLUSIVE` 锁，它与**所有**其他锁冲突。危险的不是「拿锁慢」，而是**锁队列**：一个等锁的 `ALTER` 会排在所有后续查询前面，即使那些查询只需要 `ACCESS SHARE`——于是整个表在这段时间内全面阻塞。

防御手段是给 DDL 加超时，失败就重试，而不是让它一直等：

```sql
SET lock_timeout = '3s';
SET statement_timeout = '30s';
ALTER TABLE orders ADD COLUMN status_v2 varchar(16);
```

几类操作的真实代价：

| 操作 | PG 17 | MySQL 8.0 |
|---|---|---|
| `ADD COLUMN`（可空 / 常量默认） | 元数据操作，毫秒级 | `ALGORITHM=INSTANT`（8.0.12+ 加在末尾，8.0.29+ 任意位置） |
| `ADD COLUMN ... DEFAULT now()` | **重写全表** | 视版本，通常 `INPLACE` 重建 |
| `ALTER COLUMN TYPE` | 多数重写（`varchar(50)→varchar(100)` 是例外） | 多数 `COPY`，锁写 |
| `SET NOT NULL` | PG 12+ 可借助已验证的 `CHECK` 跳过全表扫描 | `INPLACE`，仍要扫 |
| `CREATE INDEX` | 阻塞写 | `INPLACE`，阻塞写 |
| `CREATE INDEX CONCURRENTLY` | 不阻塞读写，但更慢、可能失败留 INVALID 索引 | MySQL 无等价物，用 `ALGORITHM=INPLACE, LOCK=NONE` |
| `DROP COLUMN` | 元数据操作（但要先处理依赖的视图/索引） | `INSTANT`（8.0.29+） |

三个高频坑：

**`CREATE INDEX CONCURRENTLY` 不能在事务块里跑。** 而 Flyway 默认把脚本包在事务里，所以必须显式声明：

```sql
/* flyway:executeInTransaction=false */
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_v2 ON orders (status_v2);
```

它还有个特性：失败后会留下一个 `INVALID` 的索引，`\d orders` 里能看到但查询用不了，必须 `DROP INDEX CONCURRENTLY` 后重建。所以生产上要配「建索引后检查 `pg_index.indisvalid`」的验证脚本。

**MySQL 的 `ALGORITHM=INSTANT` 有额度限制。** 8.0.12~8.0.28 只支持在表末尾加列，且一张表累计 64 次 instant 操作后必须重建一次；不满足条件时 MySQL 会**静默降级**到 `INPLACE` 或 `COPY`——所以生产上要显式写 `ALGORITHM=INSTANT, LOCK=NONE`，让它失败而不是降级：

```sql
ALTER TABLE orders ADD COLUMN status_v2 varchar(16), ALGORITHM=INSTANT, LOCK=NONE;
```

**删列会连带删除依赖对象。** PG 的 `DROP COLUMN` 会级联删掉包含该列的索引、约束、统计信息；如果有视图引用它，会直接报错。删之前查一遍依赖：

```sql
SELECT dependent.relname AS view_name
FROM pg_depend d
JOIN pg_rewrite r ON r.oid = d.objid
JOIN pg_class dependent ON dependent.oid = r.ev_class
JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
WHERE d.refobjid = 'orders'::regclass AND a.attname = 'status';
```

## 4. 回填：分批、限速、可中断

回填的本质是「一条会写几百万行的大事务」，直接 `UPDATE orders SET status_v2 = status` 会：长时间持锁、生成海量 WAL、撑爆 autovacuum、把主从延迟拉到分钟级。

正确形态是**键集分页 + 小批量 + 主动限速**：

```kotlin
@Component
class StatusBackfill(
    private val jdbc: JdbcClient,
    private val props: BackfillProps,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /** 返回本次回填的行数；0 表示已刷完 */
    fun runBatch(afterId: Long): BackfillResult {
        val ids = jdbc.sql(
            """
            UPDATE orders SET status_v2 = status
            WHERE id IN (
                SELECT id FROM orders
                WHERE id > :after AND status_v2 IS NULL
                ORDER BY id
                LIMIT :lim
            )
            RETURNING id
            """.trimIndent(),
        )
            .param("after", afterId)
            .param("lim", props.batchSize)
            .query(Long::class.java)
            .list()

        return BackfillResult(nextCursor = ids.maxOrNull() ?: afterId, rows = ids.size)
    }

    /** 由调度器驱动，循环到刷完或收到停止信号 */
    fun runToEnd() {
        var cursor = props.startFrom
        while (!Thread.currentThread().isInterrupted) {
            val r = runBatch(cursor)
            if (r.rows == 0) break
            cursor = r.nextCursor
            log.info("backfill: +{} rows, cursor={}", r.rows, cursor)
            Thread.sleep(props.pauseMillis)   // 主动让出 IO，给正常业务留余量
        }
    }
}

@ConfigurationProperties("app.backfill")
data class BackfillProps(
    val batchSize: Int = 1000,
    val pauseMillis: Long = 50,
    val startFrom: Long = 0,
)
```

五个必须有的设计点：

1. **用 `id > :after` 而不是 `OFFSET`。** 键集分页的代价与页码无关，`OFFSET 900000` 要扫掉前 90 万行。
2. **用 `status_v2 IS NULL` 作为待办条件**，天然幂等：中断后重跑会自动跳过已完成的行，不需要记断点（`startFrom` 只是加速）。
3. **最小化锁持有时间**：`UPDATE ... WHERE id IN (SELECT ... LIMIT 1000)` 只锁 1000 行，事务极短。注意别写成 `UPDATE ... FROM (SELECT ...)` 再带复杂 join，那会把锁范围放大。
4. **限速看的是数据库的余量，不是固定的 sleep。** 每批之后采样主从延迟与 `pg_stat_activity` 的活跃会话数，连续两批超过阈值就退避到 500ms。
5. **回填期间不要加索引。** 两个重 IO 操作叠加会让主从延迟失控；索引等回填完再 `CONCURRENTLY` 建。

主从延迟的采样（只读库上执行）：

```sql
SELECT pg_last_wal_replay_lsn() AS replay_lsn,
       pg_last_xact_replay_timestamp() AS last_replay,
       now() - pg_last_xact_replay_timestamp() AS lag;
```

延迟超过 5 秒就暂停回填——这个阈值比任何「每秒回填多少行」的经验值都可靠，因为它直接度量了你在伤害谁。

## 5. 数据校验：切读之前必须跑的三条 SQL

回填「跑完了」不等于「对了」。切读之前，用差异查询证明新旧两列在**每一行**上都一致：

```sql
-- ① 总量对账：多少行不一致、多少行漏刷
SELECT count(*)                                        AS total,
       count(*) FILTER (WHERE status_v2 IS NULL)       AS missing,
       count(*) FILTER (WHERE status_v2 IS DISTINCT FROM status) AS mismatch
FROM orders;

-- ② 抽样看差异长什么样（mismatch > 0 时必看）
SELECT id, status, status_v2
FROM orders
WHERE status_v2 IS DISTINCT FROM status
ORDER BY id
LIMIT 100;

-- ③ 分布式对账：按状态分组比数量，能发现「整段偏移」这类系统性错误
SELECT status, status_v2, count(*)
FROM orders
GROUP BY status, status_v2
ORDER BY count(*) DESC;
```

为什么用 `IS DISTINCT FROM` 而不是 `<>`：后者遇到 `NULL` 返回 `NULL`（既不真也不假），漏刷的行会被静默跳过——而这正是最需要抓的那批行。

第 ③ 条是很多人会跳过的，但它能抓到 ①② 抓不到的问题：如果回填把某个枚举值映射错了（`PAID` 写成 `SHIPPED`），`missing` 是 0、`mismatch` 也是 0（因为两列一致），但分组对比会显示 `status=PAID, status_v2=SHIPPED` 有 20 万行。**对账要同时对「一致性」和「正确性」**，前者比两列，后者比业务规则。

## 6. 双写过渡期的代码

双写的关键是「两列在同一个事务里写」，否则会出现「旧列写了、新列没写」的空窗。由于新列在过渡期**不映射进实体**，所以用一条原生 SQL 补写：

```kotlin
@Service
class OrderStatusWriter(
    private val orderRepository: OrderRepository,
    private val jdbc: JdbcClient,
    private val migration: MigrationFlags,
) {
    @Transactional
    fun changeStatus(orderId: Long, next: OrderStatus) {
        val order = orderRepository.findById(orderId)
            .orElseThrow { NoSuchElementException("order $orderId") }

        order.status = next          // 旧列：由脏检查在 flush 时写入

        if (migration.dualWriteStatus) {
            // 新列：实体里没有这个字段，所以必须走原生 SQL；
            // 同一事务、同一连接，与上面的事务提交原子
            jdbc.sql("UPDATE orders SET status_v2 = :s WHERE id = :id")
                .param("s", next.name)
                .param("id", orderId)
                .update()
        }
    }
}
```

三个细节决定这段代码对不对：

**新列绝不能映射进实体。** 一旦映射，Hibernate 的 `UPDATE` 会带上所有列（默认不是 `@DynamicUpdate`），用一个可能过期的值覆盖掉别人写的 `status_v2`。让它在过渡期「对 ORM 不可见」，是最省心的隔离手段。

**顺序有讲究。** 原生 `UPDATE` 先执行、JPA 的 flush 在提交前才执行——两条语句写的是不同的列，互不覆盖，所以顺序无所谓。但如果原生 SQL 需要读 JPA 刚改的值，就必须先 `em.flush()`。

**开关要能关。** `MigrationFlags` 绑到配置中心，出问题时不用发版。开关的粒度是「一个迁移一个开关」，不要做一个全局的 `dualWrite=true`——多个迁移并行时，你无法只关掉出问题的那个。

## 7. 一次完整的迁移脚本

把上面的纪律落成三个脚本（Flyway 按版本号顺序执行）：

```sql
-- V2026111501__add_orders_status_v2.sql
SET lock_timeout = '3s';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_v2 varchar(16);

COMMENT ON COLUMN orders.status_v2 IS
  'migration 2026-11: status 的新列；双写期由应用写入，回填完成后切读';
```

```sql
-- V2026111502__backfill_marker.sql
-- 回填由应用侧任务执行（见 §4），这里只建一个索引加速 IS NULL 扫描
/* flyway:executeInTransaction=false */
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_v2_null
  ON orders (id) WHERE status_v2 IS NULL;
```

```sql
-- V2026112001__drop_orders_status.sql
SET lock_timeout = '3s';

-- 前置断言：确认已无 NULL（有则整个脚本失败，不会误删）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM orders WHERE status_v2 IS NULL) THEN
        RAISE EXCEPTION 'backfill not finished: status_v2 still has NULL rows';
    END IF;
END $$;

ALTER TABLE orders DROP COLUMN status;
```

注意第三个脚本里的 `DO $$` 断言：**把「不能删」的条件写成数据库层的硬约束**，比写在发布文档里可靠得多。Flyway 在事务里执行它，断言失败则整个脚本回滚，旧列安然无恙。

## 8. 自测

1. 为什么加了 `DEFAULT 'NEW'` 的 `ADD COLUMN` 在 PG 11+ 是元数据操作，而 `DEFAULT now()` 会重写全表？判据是什么？
2. 五步法里哪一步「不报错但会静默读到过期数据」？为什么它比删列更危险？
3. 回填为什么用 `id > :after` 而不是 `OFFSET`？为什么用 `status_v2 IS NULL` 做条件就能天然幂等？
4. 对账 SQL 为什么必须用 `IS DISTINCT FROM`？举一个用 `<>` 会漏掉的场景。
5. `CREATE INDEX CONCURRENTLY` 在 Flyway 里为什么必须关掉事务？失败后留下的 `INVALID` 索引怎么处理？
6. MySQL 上 `ALGORITHM=INSTANT` 为什么会静默降级？显式写 `ALGORITHM=INSTANT, LOCK=NONE` 的好处是什么？

## 9. 延伸

- 上一册：[07-JPA实战-映射-脏检查-N+1与批量](07-JPA实战-映射-脏检查-N+1与批量.md)——实体与表的映射变了，迁移才成为必要。
- 回到阶段入口：[01-第五阶段导览](01-导览.md)——三个必做实验里有两个可以直接复用本册的数据。
- 迁移脚本的测试与灰度发布在[第十阶段导览](../10-第十阶段/01-导览.md)与[第十一阶段导览](../11-第十一阶段/01-导览.md)。
- 多实例下的迁移互斥（Flyway 的锁表机制）与配置分层，见[第十阶段导览](../10-第十阶段/01-导览.md)。
- 大表 DDL 期间的锁等待，用[05 册](05-事务与隔离级别的实证.md) §5 的 `log_lock_waits` 观察。
