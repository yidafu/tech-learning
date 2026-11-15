---
sources:
  - 07-第七阶段
---

# 02. Redis 数据模型与原子性

> [← 第七阶段导览](01-导览.md) · Redis 的快来自「单线程 + 简单结构 + 不回滚」这三件事，而它所有的事故也来自这三件事。

Redis 被当成「一个大的 Map」用，是绝大多数缓存事故的起点。它其实是一个带五种数据结构、一套过期与淘汰策略、一个单线程执行内核的远程服务：你在客户端写的每一行调用，都要跨一次网络、排一次队、在别人的主线程上执行完才返回。这一册先把「结构选型」和「原子性边界」这两件事钉死，后面两册的缓存模式才有地基。

## 1. 五种结构：判据是访问模式，不是「像什么」

选型的正确问法不是「这个对象像不像一个 Hash」，而是「我最频繁的那次操作，读写的是整体还是局部、要不要排序、要不要去重、要不要确认」。这四个问题分别对应 String、ZSet、Set、Stream，剩下的默认落 Hash 或 String。

| 结构 | 典型编码 | 关键操作复杂度 | 访问模式 | 典型用途 | 常见误用 |
|---|---|---|---|---|---|
| String | int / embstr / raw | GET、SET 为 O(1)；APPEND、SETRANGE 为 O(N) | 整块读写、计数、位操作 | 会话、计数器、分布式锁、位图签到 | 把十万字段的对象序列化成一个 String，每次改一个字段都要全量读改写 |
| Hash | listpack / hashtable | HSET、HGET 为 O(1)；HGETALL 为 O(N) | 字段级读写 | 对象属性、购物车、配置项 | 当小数据库用，无限加字段，最后 `HGETALL` 拖死主线程 |
| Set | intset / listpack / hashtable | SADD、SISMEMBER 为 O(1)；SINTER 为 O(N*M) | 去重、集合运算 | 标签、UV 统计、共同关注 | 用 `SMEMBERS` 取十万成员再在应用层分页 |
| ZSet | listpack / skiplist | ZADD 为 O(log N)；ZRANGE 为 O(log N + M) | 按分数排序、范围查询 | 排行榜、延迟队列、滑动窗口限流 | 用 `ZRANGE 0 -1` 取全量做「取 Top N」 |
| Stream | rax | XADD 为 O(1)；XRANGE 为 O(N) | 追加日志 + 消费组 + ack | 轻量队列、事件流、待办列表 | 把它当 Kafka 用，忘了它受 `maxmemory` 约束 |

四条快速判据：

1. **只改一部分字段** → Hash。对象有二十个字段、每次只改状态和更新时间，用 Hash 就只发一次 `HSET`，用 String 则要先读回整个 JSON、改完再写回，读改写之间还有并发覆盖窗口。
2. **要按分数取范围** → ZSet。排行榜、延迟队列（score 存到期时间戳）、滑动窗口（score 存请求时间）都是它的主场，`ZRANGEBYSCORE ... LIMIT` 天然带分页。
3. **要去重或做集合运算** → Set。`SADD` 的返回值就是「这次是否新增」，可以直接当幂等判据。
4. **要「多消费者 + 确认 + 重投」** → Stream，这条下一节展开。

Hash 有一个容易忽略的能力边界：字段级 TTL 直到 Redis 7.4 才有（`HEXPIRE key seconds FIELDS n field [field ...]`）。在此之前，「对象里某个字段单独过期」只能拆成独立 key，或者整对象一起过期。String 也不是「低级选择」：整体读多、字段少、需要原子替换快照时，一次 GET 比 Hash 的多次查找更省往返。真正的错误是「用 String 存一个大对象，却频繁做局部更新」。

## 2. 为什么不用 List 做队列

`LPUSH` + `BRPOP` 能跑通一个 demo，所以它一直在生产里出现。但一个队列要成立，需要的不是「先进先出」，而是五件事：消费确认、失败重投、多消费者、堆积观测、历史重放。List 只有第一件。

| 能力 | List + BRPOP | Stream + 消费组 | Pub/Sub |
|---|---|---|---|
| 消息持久化 | 有（在内存里） | 有（在内存里） | 无，断线即丢 |
| 多消费者竞争 | 有，但弹出即消失 | 有，`XREADGROUP` 按组分配 | 无，所有人收到同一份 |
| 消费确认 | 无 | `XACK` | 无 |
| 失败重投 | 要自己用 `LMOVE` 做备份队列 + 启动补偿 | `XPENDING` + `XAUTOCLAIM` 按空闲时间转移 | 不可能 |
| 堆积观测 | 只有一个 `LLEN` | `XINFO GROUPS` 给出 lag、pending 数、每个消费者的 pending | 无 |
| 历史重放 | 要自己保留另一份 | 按消息 ID `XRANGE` 重读 | 无 |
| 阻塞读 | `BLPOP` / `BRPOP` | `XREAD BLOCK` | 推送 |

`BRPOPLPUSH`（现在用 `BLMOVE source destination RIGHT LEFT timeout`）确实能做出「可靠队列」的雏形：弹出时同时写一份到处理中队列，进程重启后把处理中队列搬回去。但这套补偿逻辑的所有权在你手里——谁来判断「处理中的消息已经超时」、搬运时如何避免和正常消费者抢、重试次数记在哪、搬运本身失败怎么办。这些问题 Stream 都用原语解决了：`XPENDING` 能按 idle time 列出「被取走但没 ack 的消息」，`XAUTOCLAIM` 能把这些消息原子地转给另一个消费者，投递次数记在 pending 条目里。

还有一个物理层面的原因：List 的 `LREM`、`LINSERT`、`LRANGE` 大范围读取都是 O(N)，一个几十万元素的 List 在任何一次运维操作上都会阻塞主线程。Stream 的 `XRANGE` 按 ID 区间读，成本与读取条数成正比，不是与总长度成正比。

那 List 还剩什么场景？**只需要「最近 N 条」的定长结构**：`LPUSH` + `LTRIM 0 99` 做最近一百条动态，或者当栈用。判断标准很简单：**如果你需要问「这条消息处理成功了吗」，就不该用 List。**

## 3. 单线程：快的来源就是堵的原因

Redis 6 之后有了 IO 多线程，但那只分担 socket 读写和协议解析（`io-threads 4`、`io-threads-do-reads yes`），**命令执行仍然在主线程串行**。所以「单线程」这个说法在 2026 年依然成立，只是它不再等于「网络 IO 也单线程」。

它快的原因很朴素：没有锁竞争、没有线程上下文切换、数据结构紧凑（listpack、intset、rax 都为内存占用优化过）、协议是极简的 RESP、事件循环用 epoll 一次取一批就绪连接。这些优势全部建立在「一次只做一件事」上。

代价同样直接：

```mermaid
flowchart LR
  A[一条 O N 命令<br>例如 KEYS *] --> B[主线程被占 100ms]
  B --> C[其他连接的命令全部排队]
  C --> D[客户端读超时]
  D --> E[客户端重试或用户刷新]
  E --> F[队列更长，延迟更高]
  F --> B
```

按 1 万 QPS 估算，主线程每毫秒要处理 10 个命令。一条 100ms 的命令意味着它身后排了约 1000 个请求，这些请求的 P99 会直接从亚毫秒抬到百毫秒级；更糟的是超时触发的重试会把 QPS 放大，形成正反馈。

慢命令清单与替代写法：

| 慢命令 | 复杂度 | 替代 |
|---|---|---|
| `KEYS pattern` | O(N)，N 是全库 key 数 | `SCAN cursor MATCH pattern COUNT 500` 分批 |
| `HGETALL` 大 Hash | O(N)，N 是字段数 | `HMGET` 取需要的字段，或 `HSCAN` |
| `SMEMBERS` 大 Set | O(N) | `SISMEMBER` 判断、`SSCAN` 遍历 |
| `LRANGE 0 -1` | O(N) | 分页 `LRANGE start stop` |
| `ZRANGE 0 -1` | O(log N + M) | `ZRANGE ... LIMIT offset count` |
| `DEL` 大 key | O(N)，且同步释放内存 | `UNLINK`（后台线程释放） |
| `FLUSHDB` / `FLUSHALL` | O(N) | `FLUSHDB ASYNC` |
| `SORT` | O(N log N) | 应用层排序，或预建 ZSet |
| Lua 里遍历大集合 | 取决于循环 | 拆成多次脚本，或改用单条命令 |
| `MEMORY USAGE` | O(N)，默认采样 5 个 | 只用于离线巡检，不在请求路径 |

定位手段不是猜，是三条命令：`SLOWLOG GET 10` 看最近十条超过 `slowlog-log-slower-than`（默认 10000 微秒）的命令；`LATENCY LATEST` 与 `LATENCY DOCTOR` 看事件级延迟尖刺；`INFO commandstats` 看哪类命令的 `usec_per_call` 异常。线上实例还应打开 `--latency` 模式持续采样，它能在你还没收到告警时先看到毛刺。

这里有个常被忽略的取舍：慢命令不是「禁用」，而是「不许在主库的请求路径上出现」。`KEYS` 在离线巡检、`FLUSHDB` 在测试环境都无害；写进每秒调用十次的接口里才是事故。

## 4. Lua：原子性的边界在哪

Redis 的脚本原子性只有一层含义：**脚本执行期间不会插入其他客户端的命令**。它是隔离性，不是事务的「全成功或全失败」。Redis 没有回滚，脚本中途报错时，报错之前执行的写操作会保留；即使两个 key 同槽、写在同一个脚本里，也不存在「A 写了、B 报错就一起撤销」这回事。

三类错误的行为完全不同：

| 错误类型 | 例子 | 已执行的写 | 客户端看到 |
|---|---|---|---|
| 编译/语法错误 | 少一个 `end` | 一条都没执行 | `ERR Error compiling script` |
| 运行时报错 | 对 String 执行 `LPUSH`，或 `tonumber` 得到 nil | 之前的写保留，之后的停止 | 错误信息 + 部分副作用 |
| 执行超时 | 脚本跑超过 `busy-reply-threshold`（默认 5 秒） | 仍在跑，其他客户端收到 `BUSY` | 只能 `SCRIPT KILL`（未写过）或 `SHUTDOWN NOSAVE` |

所以脚本必须满足四个约束：

1. **只操作 `KEYS` 里声明的 key**。单机模式不校验，集群模式会校验：访问未声明的 key 直接报错，跨槽的 key 报 `CROSSSLOT`。
2. **不在脚本里做 O(N) 遍历**。`for i = 1, redis.call('LLEN', KEYS[1]) do ... end` 是把主线程按秒级占住的写法。脚本应该只做「几次 O(1) 读写 + 一点算术」。
3. **不用不确定的函数**。Redis 5 之后用效果复制（effects replication），`TIME`、`SRANDMEMBER` 这类命令的副作用会被复制，不再有旧版本的主从不一致问题；但 `os.time`、`os.clock` 仍然是不确定的，不要用。
4. **脚本要能被安全重试**。原子性保证「不会执行一半被别人插进来」，不保证「客户端超时后重发不会执行第二次」。所有会被重试的脚本，逻辑上必须幂等。

`EVAL` 与 `EVALSHA` 的区别只是传输成本：`SCRIPT LOAD` 把脚本存进服务端并返回 SHA1，之后用 `EVALSHA sha1 numkeys key... arg...` 调用，省掉每次几十 KB 的脚本正文；服务端重启或 `SCRIPT FLUSH` 后会返回 `NOSCRIPT`，客户端要能回退到 `EVAL`。Spring 的 `DefaultRedisScript` 默认就是这个策略（先 `EVALSHA`，失败再 `EVAL`），不需要自己写。

集群下的 key 同槽问题值得单独记：所有 key 必须落在同一个哈希槽。做法是 hash tag——`{user:42}:profile` 和 `{user:42}:sessions` 里的 `{user:42}` 会被用来计算槽位，两个 key 必然同槽。反例是 `user:42:profile` 与 `session:42`，它们的槽位由整串计算，几乎不可能相同。

下面是一个令牌桶限流脚本。选它而不是 `INCR` + `EXPIRE` 的固定窗口，是因为固定窗口在窗口边界会放过两倍流量；令牌桶能平滑放行，代价是需要存「上次补充时间」。

```lua
-- KEYS[1] = 限流桶 key
-- ARGV[1] = 容量 capacity
-- ARGV[2] = 每秒补充令牌数 rate
-- ARGV[3] = 本次请求的令牌数 permits
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local permits = tonumber(ARGV[3])

-- 用 Redis 服务端时间，避免多实例时钟漂移
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000000 + tonumber(t[2])

local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(bucket[1])
local ts = tonumber(bucket[2])
if tokens == nil then
  tokens = capacity
  ts = now
end

local delta = math.max(0, now - ts)
tokens = math.min(capacity, tokens + delta / 1000000 * rate)

local allowed = 0
if tokens >= permits then
  tokens = tokens - permits
  allowed = 1
end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
-- 桶从空到满需要 capacity / rate 秒，TTL 取两倍，避免空闲 key 常驻
redis.call('PEXPIRE', KEYS[1], math.ceil(capacity / rate * 2000))
return { allowed, math.floor(tokens) }
```

几个刻意的选择：状态存在一个 Hash 的两个字段里，而不是两个 String，因为集群下脚本只能碰同槽 key，单 key 最省心；时间取 `TIME` 而不是客户端传入，因为十个应用实例的时钟可能差几十毫秒，令牌补充速率会随实例漂移；返回值用整数，因为 RESP2 会把浮点数截断，返回 `tokens` 的浮点值会让客户端读到错误精度。

Kotlin 侧：

```kotlin
@Configuration
class RateLimitConfig {
    @Bean
    fun tokenBucketScript() = DefaultRedisScript<List<*>>(
        ClassPathResource("lua/token_bucket.lua"),
        List::class.java,
    )
}

@Component
class TokenBucketLimiter(
    private val redis: StringRedisTemplate,
    private val script: DefaultRedisScript<List<*>>,
) {
    fun tryAcquire(key: String, capacity: Int, ratePerSec: Int, permits: Int = 1): Boolean {
        val result = redis.execute(
            script,
            listOf("rl:$key"),
            capacity.toString(),
            ratePerSec.toString(),
            permits.toString(),
        ) ?: return false
        return (result[0] as Number).toInt() == 1
    }
}
```

调用方要决定的是「拿不到令牌怎么办」，而不是「怎么限流」：返回 429 加 `Retry-After`（第八阶段 06 册会讲它和熔断、舱壁的分工），或者降级到本地令牌桶。还有一个必须提前定的策略：**Redis 不可用时是放行还是拒绝**。限流是保护下游的，Redis 挂了就全量放行等于撤掉保护；全量拒绝则把一次缓存故障放大成一次业务不可用。常见折中是退化成进程内限流（每实例按 `总配额 / 实例数` 放行），精度差但不至于全崩。

## 5. Pipeline、MULTI 与集群同槽

一次 Redis 调用的耗时可以拆成「网络往返 + 服务端执行」。执行通常是微秒级，往返才是大头：

| 链路 | 单次 RTT | 1000 次 GET 逐条发 | 1000 次 GET 走 Pipeline |
|---|---|---|---|
| 同机 | 0.05ms | 约 50ms + 执行 | 约 0.1ms + 执行 |
| 同可用区 | 0.3ms | 约 300ms | 约 1ms |
| 跨可用区 | 1.5ms | 约 1.5s | 约 5ms |
| 跨地域 | 30ms | 约 30s | 约 60ms |

Pipeline 的做法是客户端把一批命令缓存在发送缓冲区，一次写出去，再按顺序读回响应。它省的是往返，**不提供任何原子性**：这批命令在服务端仍然是一条条执行的，中间可以插入其他客户端的命令。Spring Data Redis 里用 `redisTemplate.executePipelined { connection -> ... }`，回调里只做命令调用、不读结果，结果在返回的 `List` 里按序取。

`MULTI` / `EXEC` 是另一回事：服务端把命令排队，`EXEC` 时一次性连续执行，执行期间不插入别人。但它有两个限制让它很少用于「读-判断-写」：一是同样没有回滚，运行时错误只影响那一条；二是排队阶段拿不到中间结果，你没法根据 `GET` 的值决定要不要 `SET`。所以「先读再判断再写」的原子操作要用 Lua，而不是事务。

集群下三者的边界：

| 机制 | 能否跨槽 | 原子性 | 适用 |
|---|---|---|---|
| Pipeline | 能（客户端按槽拆到多个节点） | 无 | 批量读、批量写、预热 |
| `MULTI` / `EXEC` | 不能，必须同槽 | 有（无回滚） | 少量命令的连续执行 |
| Lua | 不能，必须同槽 | 有（无回滚） | 读-判断-写、限流、锁续期 |

批量大小要克制：每批 500 到 1000 条，太大触发 `client-output-buffer-limit` 会直接断连接；也不要按用户输入决定批量，那等于把内存上限交给了调用方。

## 6. 过期与淘汰：两套机制，两种事故

这两件事经常被混为一谈，但它们解决的问题相反：`EXPIRE` 决定「这个 key 什么时候该消失」，`maxmemory-policy` 决定「内存满了该牺牲谁」。

| 机制 | 触发条件 | 作用对象 | 配置 |
|---|---|---|---|
| 过期 | 到达 TTL | 单个 key | `EXPIRE` / `PEXPIRE` / `EXPIREAT`，或 `SET ... EX` |
| 淘汰 | `used_memory` 超过 `maxmemory` | 按策略选出的 key | `maxmemory`、`maxmemory-policy`、`maxmemory-samples` |

过期不是定时器。Redis 用「惰性删除 + 定期采样」：访问一个 key 时发现过期就删；同时每 100ms 做一轮主动采样，随机取 20 个带 TTL 的 key，如果过期比例超过 25% 就重复这一轮，直到比例降下来或达到单轮时间上限。带来的后果是：大量 key 在同一秒过期时，内存不会立刻释放，主线程还要集中做几轮清理，表现为延迟毛刺；从库则要等主库的 `DEL` 传播过来才真正释放。

淘汰策略是八种，按「淘汰范围 × 选择依据」组合：

| 策略 | 范围 | 依据 | 适用 | 事故形态 |
|---|---|---|---|---|
| `noeviction` | 不淘汰 | — | 不允许丢数据的实例 | 内存满后写命令返回 OOM，读仍正常 |
| `allkeys-lru` | 所有 key | 近似最近最少使用 | 纯缓存 | 没设 TTL 的 key 也会被淘汰 |
| `allkeys-lfu` | 所有 key | 近似最不经常使用 | 热点差异大的纯缓存 | 新 key 可能被立刻淘汰（冷启动） |
| `allkeys-random` | 所有 key | 随机 | 访问分布均匀 | 命中率不可预测 |
| `volatile-lru` | 仅带 TTL 的 key | 近似 LRU | 缓存与持久 key 混放 | 没有可淘汰 key 时退化成 `noeviction` |
| `volatile-lfu` | 仅带 TTL 的 key | 近似 LFU | 同上，热点差异大 | 同上 |
| `volatile-random` | 仅带 TTL 的 key | 随机 | 少见 | 同上 |
| `volatile-ttl` | 仅带 TTL 的 key | 剩余 TTL 最短优先 | 希望快过期的先走 | 同上 |

`allkeys-lru` 的坑值得单独说：它按名字看是「淘汰最久未使用的」，实际是「淘汰所有 key 里最久未使用的」，**包括你根本没设过期时间的那些**。如果同一个实例里既放缓存，又放分布式锁（`lock:order:42`）、幂等去重键（`idem:pay:xxx`）、Stream 队列，那么内存压力一上来，锁会被淘汰——两个实例同时拿到锁，互斥失效；去重键被淘汰——重复消息被当成新消息处理。这类事故的排查难度极高，因为「锁偶尔失效」不会留下任何日志。

所以第一条部署纪律是：**缓存实例和「把 Redis 当数据结构用」的实例分开**，或者至少让后者用 `volatile-*` 并保证所有缓存 key 都带 TTL。但 `volatile-*` 也有退化路径：当实例里一个带 TTL 的 key 都没有时，它的行为和 `noeviction` 一样，写命令直接报 `OOM command not allowed when used memory > 'maxmemory'`。

## 7. 大 key 与热 key：检测与治理

这是两个不同的问题，经常被同一个「慢」字掩盖：大 key 是**单个 key 太大**，一次操作就阻塞；热 key 是**单个 key 被访问太频繁**，把一个分片打满。前者是空间问题，后者是流量问题。

先给可执行的阈值（团队内部要统一，否则每次评审都要吵）：

| 类型 | 大 key 阈值 | 判定方法 |
|---|---|---|
| String | value > 10KB（保守）/ 1MB（危险） | `STRLEN`、`MEMORY USAGE` |
| Hash / List / Set / ZSet | 元素数 > 5000，或总内存 > 1MB | `HLEN` / `LLEN` / `SCARD` / `ZCARD` |
| Stream | 长度 > 10000，或 `XINFO STREAM` 的内存 > 10MB | `XLEN`、`XINFO STREAM` |

大 key 的危害是一条完整的因果链：单次操作 O(N) 占住主线程 → 返回的数据把网卡打满（1MB 的 value 乘 1000 QPS 就是 1GB/s）→ 删除时同步释放内存造成秒级停顿 → 持久化和主从全量同步变慢 → 集群里一个槽装了几十 GB，无法迁移。最后一条最致命：集群的槽迁移以 key 为单位，一个 5GB 的 Hash 会让整个 resharding 卡死。

检测手段分在线和离线：

- `redis-cli --bigkeys`：基于 `SCAN` + `TYPE`，对每种类型统计最大的 key。它轻量、可以在线上跑，但只报「每种类型最大的一个」，且大小是元素数不是字节数。
- `redis-cli --memkeys`：按 `MEMORY USAGE` 采样排序，能看到字节数，代价更高。
- `MEMORY USAGE key SAMPLES 0`：精确值，O(N)，只对怀疑对象单独执行。
- 离线分析 RDB：用 `rdb` 类工具扫全量，最准，但要拷贝文件。
- 自建巡检：`SCAN` 分批 + 按类型取长度，可以定时跑、可以落成指标，下面给代码。

热 key 的检测更麻烦，因为「热」是相对流量分布的：`redis-cli --hotkeys` 依赖 LFU 的访问计数，要求 `maxmemory-policy` 是 `allkeys-lfu` 或 `volatile-lfu`；`MONITOR` 能看到全量命令但会显著拖慢实例，只能开几秒；生产上更靠谱的是在客户端或代理层按 key 前缀统计 QPS。Spring 侧可以给 `RedisTemplate` 包一层 Micrometer 计数器，精度不高但足够发现「某个商品详情占了 30% 流量」。

治理手段对照：

| 问题 | 手段 | 代价 |
|---|---|---|
| 大 String | 压缩（gzip/zstd）、拆成多个 key、改用 Hash 字段访问 | 压缩/解压耗 CPU；拆分后要改读路径 |
| 大 Hash | 按字段前缀分桶（`cart:{uid % 16}`），或按业务维度拆 | 聚合查询要在应用层做 |
| 大 List / Set / ZSet | 分页、分片、只保留 Top N | 全量语义丢失 |
| 删除大 key | `UNLINK` 替代 `DEL`；Hash 用 `HSCAN` + `HDEL` 分批 | 删除变成异步，内存释放有延迟 |
| 热 key | 本地缓存（L1）、key 加副本随机读（`hot:1` 到 `hot:16`）、读写分离、请求合并 | L1 一致性、副本写扩散、架构复杂度 |

下面是巡检用的 `SCAN` 代码。注意它只用 `SCAN`，不用 `KEYS`：

```kotlin
@Component
class BigKeyScanner(private val redis: StringRedisTemplate) {

    data class BigKey(val key: String, val type: String, val size: Long)

    fun scan(maxElements: Long = 5_000, batch: Long = 500): List<BigKey> {
        val found = mutableListOf<BigKey>()
        redis.execute { conn ->
            val options = ScanOptions.scanOptions().match("*").count(batch).build()
            conn.keyCommands().scan(options).use { cursor ->
                while (cursor.hasNext()) {
                    val raw = cursor.next()
                    val key = String(raw, Charsets.UTF_8)
                    val size = when (conn.keyCommands().type(raw)) {
                        KeyType.STRING -> conn.stringCommands().strLen(raw) ?: 0
                        KeyType.HASH -> conn.hashCommands().hLen(raw) ?: 0
                        KeyType.LIST -> conn.listCommands().lLen(raw) ?: 0
                        KeyType.SET -> conn.setCommands().sCard(raw) ?: 0
                        KeyType.ZSET -> conn.zSetCommands().zCard(raw) ?: 0
                        KeyType.STREAM -> conn.streamCommands().xLen(raw) ?: 0
                        else -> 0
                    }
                    if (size >= maxElements) {
                        found += BigKey(key, conn.keyCommands().type(raw).name, size)
                    }
                }
            }
        }
        return found.sortedByDescending { it.size }
    }
}
```

这段代码有三个必须知道的语义：`SCAN` 的 `COUNT` 只是提示，服务端可能一次返回 0 条或远超 500 条；遍历期间一直存在的 key 保证至少返回一次，但可能重复，所以结果要去重；扩容缩容或 rehash 期间，重复和漏报都可能出现。**它适合巡检，不适合精确统计**。另外，`type` 和取长度是两次往返，几百万 key 的实例会跑很久，所以要限速（每批之间 sleep 几毫秒），并且只在从库或低峰期跑。

## 8. 自测

1. 一个对象有 30 个字段、每次只改 `status`，用 String 存 JSON 和用 Hash 存字段，各要几次往返、各自的并发风险是什么？
2. Lua 的「原子」为什么不等于「回滚」？构造一个脚本，让它在报错前已经写入一个 key，说明客户端会看到什么状态。
3. 集群下 `EVAL` 报 `CROSSSLOT`，你会怎么改 key 设计？hash tag 里的内容参与槽位计算吗？
4. 同一个实例里既有缓存 key 又有分布式锁 key，`allkeys-lru` 和 `volatile-lru` 分别可能造成什么事故？
5. 一个 500 万元素的 Set，`SMEMBERS` 为什么会拖垮整个实例？给出两种不改变业务语义的替代方案。
6. 如何在不影响线上 P99 的前提下，每天巡检一次大 key？说出你的限速手段和结果可信度。

## 9. 延伸

- 下一册：[03-缓存模式与一致性取舍](03-缓存模式与一致性取舍.md)——结构选好了，接下来决定「什么时候读缓存、什么时候删缓存」。
- 分布式锁的完整语义（锁过期、续期、Redlock 争议）在[第六阶段 06 册](../06-第六阶段/06-跨服务一致性-Outbox-Saga-TCC与分布式锁.md)；用 Redis 做幂等去重的细节在[第六阶段 05 册](../06-第六阶段/05-幂等-幂等键-去重表与状态机.md)。
- 限流与熔断的工具选型见[第八阶段 06 册](../08-第八阶段/06-弹性-超时-重试-熔断-舱壁与限流.md)；Redis 指标怎么接 Micrometer 见[第十阶段 05 册](../10-第十阶段/05-可观测性落地-指标-日志与链路.md)。
