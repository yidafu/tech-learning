# 后端开发学习站（文档站）

Kotlin + Spring Boot 的服务端工程实践：一次 HTTP 请求进入 Spring Boot 后的十五站链路 → 数据层与事务 → 缓存与消息 → 并发模型 → 安全 → 生产化 → 微服务与大型应用。十二个阶段共 86 篇（大纲 + 12 篇阶段导览 + 73 篇分册正文）全部上线，终点是「把模块化单体拆成微服务并交付一份可交接的复盘报告」的毕业项目。使用 **Docusaurus 3** 构建。

## 本地运行

```bash
npm install    # 首次安装依赖
npm run dev    # 开发模式，http://localhost:3010
npm run build  # 构建静态站点到 build/
npm run serve  # 本地预览构建产物
```

> 本站不谈架构方法论（归 `architecture/` 站）、不重复可观测性原理（归 `observability/` 站）、不做攻防演练（归 `security/` 站）：站的定位是「这些东西在 Spring Boot 里到底怎么写、怎么测、怎么量」。

## 技术基线

| 层次 | 选型 |
|---|---|
| 语言 / 运行时 | Kotlin 2.2+ / JDK 25 LTS（最低 17） |
| 构建 | Gradle 9（最低 8.14），version catalog |
| 框架 | Spring Boot 4.1 / Spring Framework 7 / Jakarta EE 11 / Jackson 3 |
| 数据 | PostgreSQL 17 + HikariCP + Flyway |
| 中间件 | Redis 8、Kafka 4 / RabbitMQ 4 |
| 微服务 | Spring Cloud 2025.1（Oakwood）· Gateway 5 · Config · Consul/Eureka |

## 目录结构

| 路径 | 说明 |
|------|------|
| `docusaurus.config.js` | 站点配置（标题 / 十二阶段导航 / 站群互链） |
| `sidebars.js` | 侧边栏顶层显式声明（大纲 → 十二阶段），阶段内部按目录自动生成 |
| `docs/` | 学习大纲 + 十二个阶段（每阶段 `01-导览.md` 为入口，笔记保持无 frontmatter） |
| `src/pages/index.js` | 站群统一模板首页（阅读顺序 + 阶段卡片） |
| `src/css/custom.css`、`src/components/site/`、`static/img/` | 站群统一主题（由 `shared/sync-theme.mjs` 同步，勿手改） |
| `patches/docusaurus-graph+2.0.0.patch` | 子路径部署补丁（fetch 路径 + 节点 id 修复，见仓库根 README） |

> 本站不提供可运行的示例工程：所有代码都是**正文内嵌的 Kotlin 片段**，紧贴它要说明的那个结论（一个失效现场、一条 SQL、一次压测配置）。动手练习落在你自己的骨架工程里做。

## 十二个阶段

| # | 阶段 | 定位 | 站内路径 |
|---|------|------|----------|
| 1 | 后端全景与工程地基 | 十五站时间线与账本、技术基线、骨架与度量工具 | `/docs/第一阶段/导览` |
| 2 | Kotlin 服务端工程化 | 类型系统、语法糖边界、协程、Spring 接缝、Gradle | `/docs/第二阶段/导览` |
| 3 | Spring 容器与启动原理 | IoC、生命周期、AOP、自动配置、refresh()、迷你容器 | `/docs/第三阶段/导览` |
| 4 | Web 层与接口契约 | 线程模型、三类拦截、参数解析、校验、错误模型、序列化 | `/docs/第四阶段/导览` |
| 5 | 数据层 | 连接池、执行计划、隔离级别、持久化选型、迁移 | `/docs/第五阶段/导览` |
| 6 | 事务、锁与一致性 | 传播与失效现场、事务边界、锁与幂等、Outbox/Saga | `/docs/第六阶段/导览` |
| 7 | 缓存与异步消息 | Redis、缓存模式与三件套、Kafka/RabbitMQ、消费治理 | `/docs/第七阶段/导览` |
| 8 | 并发模型深潜 | 线程池、虚拟线程、协程、WebFlux、弹性、压测对比 | `/docs/第八阶段/导览` |
| 9 | 安全与鉴权 | 过滤器链、会话 vs JWT、OIDC、越权隔离、密钥 | `/docs/第九阶段/导览` |
| 10 | 质量、可观测性与生产化 | 测试、Testcontainers、指标日志链路、交付、调优 | `/docs/第十阶段/导览` |
| 11 | 微服务与大型应用 | 拆分判据、边界与数据、通信、网关、Saga、灰度容量 | `/docs/第十一阶段/导览` |
| 12 | 毕业项目：单体到微服务 | 选题、单体基线、拆两个服务、故障演练、复盘报告 | `/docs/第十二阶段/导览` |

学习方式：每一册都挂在「一次请求的十五站主时间线」的某几站上，第一阶段先建总账本（各段耗时量级），之后每个阶段回来核账；每阶段末尾有自测题，第十二阶段以毕业项目收束。
