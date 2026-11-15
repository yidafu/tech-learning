import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import SiteHero from '@site/src/components/site/SiteHero';
import FeatureCardGrid from '@site/src/components/site/FeatureCardGrid';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

const stages = [
  {
    title: '后端全景与工程地基',
    dir: '第一阶段',
    desc: '一次请求的十五站主时间线与耗时账本、JDK 25 / Kotlin 2.2 / Boot 4.1 技术基线、工程骨架与分层约定、JFR 与 JMH 度量地基',
    tag: '打地基',
  },
  {
    title: 'Kotlin 服务端工程化',
    dir: '第二阶段',
    desc: '用类型表达约束（value class / sealed）、扩展与委托的边界、协程基础、Kotlin 与 Spring 的接缝、Gradle 多模块与 version catalog',
    tag: '打地基',
  },
  {
    title: 'Spring 容器与启动原理',
    dir: '第三阶段',
    desc: 'BeanDefinition 注册、Bean 生命周期与扩展点、AOP 代理与自调用真相、自动配置与条件装配、refresh() 启动流程，最后手写一个迷你容器',
    tag: '打地基',
  },
  {
    title: 'Web 层与接口契约',
    dir: '第四阶段',
    desc: 'Tomcat 线程模型、Filter/Interceptor/AOP 执行顺序、参数解析扩展点、校验、ProblemDetail 错误模型、Jackson 3 序列化与 REST 契约',
    tag: '核心链路',
  },
  {
    title: '数据层：SQL / 池 / 持久化',
    dir: '第五阶段',
    desc: 'HikariCP 池大小推导、执行计划与索引失效、隔离级别实证、JPA 脏检查与 N+1、Flyway 零停机迁移',
    tag: '核心链路',
  },
  {
    title: '事务、锁与一致性',
    dir: '第六阶段',
    desc: '@Transactional 六种失效现场、事务边界设计、乐观锁与悲观锁、幂等键与状态机、Outbox / Saga / TCC 与分布式锁',
    tag: '核心链路',
  },
  {
    title: '缓存与异步消息',
    dir: '第七阶段',
    desc: 'Redis 结构与原子性、缓存模式与一致性取舍、穿透击穿雪崩与多级缓存、Kafka 与 RabbitMQ 模型、幂等消费与积压治理',
    tag: '性能与安全',
  },
  {
    title: '并发模型深潜',
    dir: '第八阶段',
    desc: '线程池参数与池隔离、虚拟线程与 pinning、协程 suspend 边界、Reactor 背压与 WebFlux 取舍、超时重试熔断限流、三模型压测对比',
    tag: '性能与安全',
  },
  {
    title: '安全与鉴权',
    dir: '第九阶段',
    desc: 'Security 过滤器链与认证授权时序、会话 vs JWT、OAuth2/OIDC、越权与多租户隔离、Spring 侧攻击面防线、密钥管理与审计',
    tag: '性能与安全',
  },
  {
    title: '质量、可观测性与生产化',
    dir: '第十阶段',
    desc: '切片测试与 Testcontainers、契约与并发测试、Micrometer 指标、OTel 链路贯穿异步、分层镜像与探针、压测与调优方法论',
    tag: '生产与规模',
  },
  {
    title: '微服务与大型应用',
    dir: '第十一阶段',
    desc: '该不该拆的判据、DDD 限界上下文与数据所有权、同步与异步通信、网关与 BFF、发现与配置中心、Saga 编排、多服务可观测性与灰度容量',
    tag: '生产与规模',
  },
  {
    title: '毕业项目：单体到微服务',
    dir: '第十二阶段',
    desc: '三个候选选题、模块化单体与压测基线、拆出两个服务与数据迁移、生产化收尾与故障演练、可交接的复盘报告',
    tag: '实战毕业',
  },
];

const readingOrder = [
  { step: '1', label: '打地基', text: '第一到第三阶段：建立十五站时间线与账本，钉死技术基线，把 Kotlin 与 Spring 容器的原理补齐——后面所有实验都建立在它们上面。' },
  { step: '2', label: '核心链路', text: '第四到第六阶段：沿一次请求往下钻——Web 层与契约 → 数据层与 SQL → 事务、锁与一致性，先把「功能正确 + 数据正确」做扎实。' },
  { step: '3', label: '性能与安全', text: '第七到第九阶段：缓存与消息、并发模型、安全鉴权——决定这套系统能不能扛住流量与攻击，也是线上事故最常见的三个方向。' },
  { step: '4', label: '生产与规模', text: '第十到第十二阶段：测试与可观测性让你敢上线，微服务与大型应用让你能扩张，最后用一个毕业项目把全部知识组装一次。' },
];

const tagAccent = {
  打地基: 'primary',
  核心链路: 'cyan',
  性能与安全: 'purple',
  生产与规模: 'green',
  实战毕业: 'rose',
};

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="首页" description={siteConfig.tagline}>
      <SiteHero
        primary={{ to: '/docs/后端开发学习大纲', label: '从学习大纲开始 →' }}
        secondary={{ to: '/docs/第一阶段/导览', label: '直达十五站时间线' }}
      />
      <main>
        <section className="container home-section">
          <Heading as="h2">建议阅读顺序</Heading>
          <ol className="reading-order">
            {readingOrder.map((item) => (
              <li key={item.step} className="reading-order__item">
                <span className="reading-order__step">{item.step}</span>
                <span className="reading-order__label">{item.label}</span>
                <span className="reading-order__text">{item.text}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="container home-section--last">
          <Heading as="h2">十二个阶段</Heading>
          <FeatureCardGrid
            cards={stages.map((stage) => ({
              title: stage.title,
              desc: stage.desc,
              tag: stage.tag,
              accent: tagAccent[stage.tag] ?? 'primary',
              to: `/docs/${stage.dir}/导览`,
              path: `${stage.dir}/`,
            }))}
          />
        </section>
      </main>
    </Layout>
  );
}
