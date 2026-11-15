---
sources:
  - 02-第二阶段
---

# 07. Gradle 构建：version catalog 与多模块

> [← 第二阶段导览](01-导览.md) · 构建脚本是团队里最少人读、却影响每个人每天十分钟的代码。这一册把四件事钉死：版本只写一处、模块边界靠 `api`/`implementation` 表达、构建缓存命中要有前提、规约用 ktlint + detekt 固化进 CI 而不是靠 review。

## 1. `libs.versions.toml` 与 Boot BOM 的分工

两者管的是不同的事，混起来就会到处写版本：

- **version catalog**（`gradle/libs.versions.toml`）管「坐标别名 + 版本号 + 插件版本」，是**仓库级的依赖清单**；
- **BOM**（`spring-boot-dependencies`）管「一组已经互相验证过的版本」，是**版本约束**，本身不引入依赖。

```toml
# gradle/libs.versions.toml
[versions]
kotlin = "2.2.20"
boot = "4.1.0"
testcontainers = "1.21.0"

[libraries]
boot-dependencies = { module = "org.springframework.boot:spring-boot-dependencies", version.ref = "boot" }
boot-webmvc = { module = "org.springframework.boot:spring-boot-starter-webmvc" }
boot-data-jpa = { module = "org.springframework.boot:spring-boot-starter-data-jpa" }
jackson-kotlin = { module = "tools.jackson.module:jackson-module-kotlin" }
testcontainers-bom = { module = "org.testcontainers:testcontainers-bom", version.ref = "testcontainers" }

[plugins]
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
kotlin-spring = { id = "org.jetbrains.kotlin.plugin.spring", version.ref = "kotlin" }
kotlin-jpa = { id = "org.jetbrains.kotlin.plugin.jpa", version.ref = "kotlin" }
boot = { id = "org.springframework.boot", version.ref = "boot" }
```

```kotlin
// build.gradle.kts
dependencies {
    implementation(platform(libs.boot.dependencies))
    implementation(libs.boot.webmvc)
    implementation(libs.boot.data.jpa)
    implementation(libs.jackson.kotlin)      // Jackson 3 的 Kotlin 模块，版本同样由 Boot BOM 管

    testImplementation(platform(libs.testcontainers.bom))
    testImplementation("org.testcontainers:postgresql")
}
```

**哪些不必写版本**：只要在 BOM 的 `dependencyManagement` 里，`spring-boot-starter-*`、Jackson、Hibernate、Flyway、Lettuce、Kafka 客户端、JUnit 都可以不写。**哪些要你自己管版本**：BOM 之外的第三方库（Testcontainers 要额外导入它自己的 BOM、AWS SDK 直接写版本、内部二方库）、Gradle 插件（插件不在 BOM 管辖内）、平台本身。

| 东西 | 谁管版本 | 写法 |
|---|---|---|
| Boot starter | Boot BOM | `implementation(libs.boot.webmvc)` |
| Jackson / Hibernate | Boot BOM | 不写版本 |
| Testcontainers | 自己的 BOM | `platform(libs.testcontainers.bom)` |
| ktlint / detekt | catalog `[versions]` | 插件或依赖上 `version.ref` |
| Kotlin 编译器插件 | catalog `[plugins]` | 与 `kotlin-jvm` 同版本，必须一起升 |

三条纪律：

1. **`kotlin("jvm")`、`plugin.spring`、`plugin.jpa` 必须是同一个版本**，分开写早晚会漂移。用同一个 `version.ref = "kotlin"`；
2. **`platform()` 与 `enforcedPlatform()` 不一样**。前者是「建议版本」，你的显式版本可以覆盖；后者强制，用于你确实要钉死整套版本的场景（比如安全修复）。多数项目用 `platform()`；
3. **catalog 的别名是给人读的**。`libs.boot.webmvc` 比 `libs.spring.boot.starter.webmvc` 好读，但别名一旦发布就不要重命名——它是构建脚本的公共 API。

## 2. 多模块：`api` 与 `implementation` 决定编译期可见性

```kotlin
// :domain/build.gradle.kts
plugins {
    `java-library`
    kotlin("jvm")
}
dependencies {
    api(project(":shared-kernel"))          // Money、AccountId 出现在公开签名里
    implementation(libs.kotlinx.coroutines) // 只在内部用
}

// :order-service/build.gradle.kts
dependencies {
    implementation(project(":domain"))
}
```

| 配置 | 本模块编译类路径 | 消费者编译类路径 | 消费者运行类路径 | 语义 |
|---|---|---|---|---|
| `api` | 有 | **有** | 有 | 公开 API 的一部分 |
| `implementation` | 有 | 无 | 有 | 内部实现细节 |
| `compileOnly` | 有 | 无 | 无 | 编译期注解、provided 依赖 |
| `runtimeOnly` | 无 | 无 | 有 | JDBC 驱动、日志实现 |

**为什么这不是风格问题**：`api` 的依赖会进入消费者的编译类路径，意味着

- 消费者可以直接 `import` 它——你的实现细节变成了事实上的契约；
- 它一变，所有消费者都要重新编译（构建缓存与增量编译的传播范围变大）；
- 你换掉它（比如从 Jackson 2 换 3）就是破坏性变更。

所以默认用 `implementation`，只有**类型出现在 public 签名里**时才升级为 `api`。判断方法很简单：消费者能不能在不加依赖的情况下编译通过？不能，就该 `api`。

两个坑：

- **`kotlin("jvm")` 默认没有 `api` 配置**，需要同时应用 `java-library`。只加 Kotlin 插件时写 `api(...)` 会报「找不到配置」；
- **`internal` 不是模块边界**。Kotlin 的 `internal` 是「同一编译模块内可见」，多模块项目里它确实能挡住跨模块访问，但字节码层面仍是 `public`，反射和 Java 调用都能绕过。真正的边界是模块依赖图。

模块划分的经验值：**按变更频率和团队边界分，不要按技术分层分**。`controller/service/repository` 三个模块会让每次改一个接口都要动三个仓库目录，编译期收益为零；`domain / persistence / web` 或按业务能力分（`order / payment / inventory`）才有隔离价值。

## 3. `buildSrc` vs convention plugin

多个模块要写同样的 `plugins { kotlin("jvm"); kotlin("plugin.spring") ... }`、同样的 `jvmToolchain(25)`、同样的测试配置。复制粘贴的终点是两个方案：

**`buildSrc`**：一个特殊目录，Gradle 自动编译并加入构建脚本的类路径。上手最快，但它有硬伤：

- 改一行 `buildSrc` 里的代码，**整个构建的脚本类路径变化，所有任务缓存失效**；
- 不能发布、不能版本化，多个仓库无法共享；
- 它自己是一个独立的构建，IDE 同步经常慢半拍。

**convention plugin**（`build-logic` included build）：把约定写成预编译脚本插件，可以版本化、发布到内部仓库、被多个项目引用。

```kotlin
// settings.gradle.kts
pluginManagement {
    includeBuild("build-logic")
    repositories { gradlePluginPortal(); mavenCentral() }
}
```

```kotlin
// build-logic/convention/build.gradle.kts
plugins { `kotlin-dsl` }

dependencies {
    // 与主构建的 Kotlin 版本保持一致（included build 读不到主构建的 catalog，
    // 要么在这里同步，要么给 build-logic 配自己的 libs.versions.toml）
    implementation("org.jetbrains.kotlin:kotlin-gradle-plugin:2.2.20")
}
```

```kotlin
// build-logic/convention/src/main/kotlin/backend.service-conventions.gradle.kts
plugins {
    id("org.jetbrains.kotlin.jvm")
    id("org.jetbrains.kotlin.plugin.spring")
    `java-library`
}

kotlin { jvmToolchain(25) }

dependencies {
    // 不写版本：由消费方导入的 Boot BOM 提供（插件本身只管约定，不管版本）
    testImplementation("org.junit.jupiter:junit-jupiter")
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
    maxParallelForks = (Runtime.getRuntime().availableProcessors() / 2).coerceAtLeast(1)
}
```

消费方只剩一行：`plugins { id("backend.service-conventions") }`。文件名（去掉 `.gradle.kts`）就是插件 id，这是预编译脚本插件的约定。

| 维度 | `buildSrc` | convention plugin |
|---|---|---|
| 上手成本 | 低 | 中（多一个 included build） |
| 改动对缓存的影响 | 全量失效 | 只影响依赖该插件的项目 |
| 能否发布/复用 | 不能 | 能 |
| IDE 支持 | 一般 | 好 |
| 适合 | 单仓库、1~3 个模块、临时脚本 | 多模块、多仓库、需要版本化 |

**建议**：模块数超过 5 个就上 convention plugin；`buildSrc` 只留「生成代码」这类真正需要编译期执行的逻辑。注意 convention plugin 里引用版本目录要额外配置（included build 有自己的 settings），不要在插件里硬编码版本——把版本作为插件参数或统一在 `build-logic` 的 catalog 里。

## 4. 构建缓存的三个前提

Gradle 的构建缓存（build cache）按「任务输入哈希 → 输出」存取。要命中，三个前提缺一不可：

1. **输入可声明**：任务用 `@Input`/`@InputFiles`/`@OutputDirectory` 声明了所有影响结果的东西。自定义任务只写 `doLast` 而不声明输入，缓存永远不命中（Gradle 会标 `not cacheable` 或每次视为变化）；
2. **输出可复现**：同样的输入产生**逐字节相同**的输出。JAR 里的时间戳、文件遍历顺序、绝对路径、`build-info.properties` 里的构建时间都会破坏它；
3. **不读隐式状态**：环境变量、`LocalDateTime.now()`、随机数、`git rev-parse`、网络请求，只要影响输出又没声明为输入，就会「输入没变但输出变了」，缓存要么错命中、要么永不命中。

```kotlin
tasks.withType<Jar>().configureEach {
    isPreserveFileTimestamps = false   // 去掉时间戳
    isReproducibleFileOrder = true     // 固定文件顺序
}

tasks.withType<AbstractArchiveTask>().configureEach {
    isPreserveFileTimestamps = false
    isReproducibleFileOrder = true
}
```

命中率低的排查顺序（从最常见到最少见）：

| 排查项 | 症状 | 处理 |
|---|---|---|
| CI 没有恢复 `~/.gradle/caches` | 每次都全量编译 | 用 `gradle/actions/setup-gradle` 或显式 cache |
| 没加 `--build-cache` | 本地也不命中 | `org.gradle.caching=true` 写进 `gradle.properties` |
| 代码里读了 `now()`/随机数/环境变量 | 输入哈希每次都变 | 抽成 `@Input` 属性，或在 CI 里固定 |
| JAR 时间戳/顺序 | 输出哈希每次都变 | 上面两行配置 |
| 绝对路径进入输出 | 换机器就 miss | 用相对路径；用 `-Dorg.gradle.caching.debug=true` 查缓存键里的路径 |
| 动态版本（`1.2.+`、`SNAPSHOT`） | 依赖解析结果变 | 用固定版本 + 依赖锁定 |
| Gradle/JDK 版本不一致 | 跨机器 miss | CI 与本地统一 toolchain |

验证手段：`./gradlew assemble --scan` 看 build cache 命中率；`-Dorg.gradle.caching.debug=true` 打印每个任务的缓存键；本地缓存在 `~/.gradle/caches/build-cache-1`。**先量再改**——凭感觉调缓存参数，通常只是把 miss 换了个地方。

## 5. 把测试拆成 `test` 与 `integrationTest`

单元测试要快（秒级反馈），集成测试要真（数据库、消息、容器）。放在同一个 task 里，结果必然是「集成测试拖慢所有人，最后被注释掉」。

```kotlin
// build.gradle.kts
testing {
    suites {
        val test by getting(JvmTestSuite::class) {
            useJUnitJupiter()
        }
        val integrationTest by registering(JvmTestSuite::class) {
            dependencies {
                implementation(project())
                implementation("org.testcontainers:postgresql")
            }
            targets.all {
                testTask.configure {
                    shouldRunAfter(test)
                    maxParallelForks = 1          // 共享一个 PG 容器时别并行
                    systemProperty("spring.profiles.active", "integration")
                }
            }
        }
    }
}

tasks.named("check") { dependsOn(testing.suites.named("integrationTest")) }
```

三个收益：

- **反馈速度**：日常 `./gradlew test` 只跑纯单测；
- **资源隔离**：集成测试独占容器与连接池，不和单测抢；
- **CI 分层**：push 跑单测，PR 跑集成，nightly 跑全量——这是第十阶段测试金字塔的执行侧。

不用 `testing.suites` 的传统写法是自建 `sourceSets` + `Test` 任务，效果一样，只是多写二十行。另外一个轻量替代是**用 JUnit Tag 分组**（`@Tag("integration")` + `tasks.test { useJUnitPlatform { excludeTags("integration") } }`），适合测试不多、不想拆 source set 的项目；缺点是同一个编译单元，集成测试的依赖仍会进主测试类路径。

## 6. ktlint + detekt：格式与语义分开管

两者的分工不要混：

| 工具 | 管什么 | 典型规则 | 能自动修吗 |
|---|---|---|---|
| ktlint | 格式 | 缩进、import 顺序、通配 import、尾逗号、换行 | 能（`ktlintFormat`） |
| detekt | 语义与坏味道 | 复杂度、长函数、`!!`、吞异常、魔法数、命名 | 部分（`--auto-correct` 有限） |

```kotlin
// build.gradle.kts
plugins {
    alias(libs.plugins.ktlint)   // 版本写在 libs.versions.toml 的 [plugins] 里
    alias(libs.plugins.detekt)   // detekt 2.x 与 Gradle 9 的对应关系按官方兼容矩阵选
}

detekt {
    buildUponDefaultConfig = true
    config.setFrom(files("config/detekt/detekt.yml"))
    baseline = file("config/detekt/baseline.xml")
}

tasks.named("check") {
    dependsOn("ktlintCheck", "detekt")
}
```

（`ktlint`、`detekt` 两个别名同样登记在 catalog 的 `[plugins]` 里，这里只展示引用方式。）

**baseline 的策略比配置更重要**。`detektBaseline` 会把现有问题记进 `baseline.xml` 并让它们不再失败——这是给遗留项目的一条生路，但很容易变成「永久豁免」：

- baseline 只允许**缩小**，PR 里如果 baseline 行数增加，直接拒绝；
- 每季度清一次，清出来的问题要么修、要么在 `detekt.yml` 里显式关掉并写明理由；
- baseline 文件进代码评审，它是一份技术债账本，不是构建产物。

**一条自定义规则**，比一百行 review 指南有效。下面按 detekt 1.23 的 API 写（2.x 对 `Rule`/`Config` 有调整，迁移时以官方规则模板为准）：

```kotlin
class NoDoubleBang(config: Config) : Rule(config) {
    override val issue = Issue(
        id = "NoDoubleBang",
        severity = Severity.Defect,
        description = "禁止 !!：用 requireNotNull/orThrow 保留上下文",
        debt = Debt.FIVE_MINS,
    )

    override fun visitPostfixExpression(expression: KtPostfixExpression) {
        super.visitPostfixExpression(expression)
        if (expression.operationToken == KtTokens.EXCLEXCL) {
            report(CodeSmell(issue, Entity.from(expression), "用 requireNotNull(x) { \"...\" } 替代"))
        }
    }
}

class TeamRuleSetProvider : RuleSetProvider {
    override val ruleSetId = RuleSet.Id("team")
    override fun instance(config: Config) = RuleSet(ruleSetId, listOf(NoDoubleBang(config)))
}
```

再在 `src/main/resources/META-INF/services/io.gitlab.arturbosch.detekt.api.RuleSetProvider` 里写一行类名，规则就生效。**自定义规则的价值在于「可执行」**：review 会漏、新人不知道、老代码慢慢回潮，而规则每次提交都跑，且能用 `compileAndLint` 写测试。

两条落地经验：规则先从「零误报」的开始（`!!`、`println`、`GlobalScope`），别一上来就开复杂度阈值；detekt 的 `MaxLineLength` 与 ktlint 的缩进规则别重复配置，两边打架时以 ktlint 为准。

## 7. CI 里的缓存与 `--build-cache`

```yaml
# .github/workflows/ci.yml（片段）
- uses: gradle/actions/setup-gradle@v4
  with:
    cache-read-only: ${{ github.ref != 'refs/heads/main' }}
    # 只读缓存给 PR，主分支负责写，避免缓存被 PR 污染

- run: ./gradlew build --build-cache --parallel --configuration-cache
```

四个参数各自解决一件事：

- `--build-cache`：开启任务级缓存（`gradle.properties` 里也可以写 `org.gradle.caching=true`）；
- `--parallel`：多模块并行（显式写出来，别依赖默认值）；
- `--configuration-cache`：缓存配置阶段，省掉每次几十秒的脚本求值；对 convention plugin 写得不规范的项目会报错，这反而是好事——它逼你把「配置期读环境变量」改掉；
- 缓存目录：`~/.gradle/caches`（依赖 + 构建缓存）+ `~/.gradle/wrapper`（发行版）。`setup-gradle` 已经处理好 key 的构成（Gradle 版本、JDK、依赖文件哈希）。

三个常见错误：

1. **PR 也写缓存**：PR 分支的缓存 key 与主分支不同，写了也命中不了，还挤占配额。设置 `cache-read-only` 只在主分支写；
2. **缓存了 `build/` 目录**：绝对不要。构建输出由缓存机制管理，手工缓存 `build/` 会把过期产物带进新构建；
3. **跨大版本复用缓存**：Gradle 9 升级后旧缓存 key 会变，别手工拼 key 绕过——脏缓存的故障极难排查。

远程构建缓存（Develocity 或自建 HTTP cache）在多机器 CI 上收益最大：一台机器编译过的模块，另一台直接下载输出。前提还是第 4 节那三条——**输出不可复现时，远程缓存只会把「本地能跑」变成「随机挂」**。

## 8. 自测

1. `spring-boot-starter-webmvc` 不写版本，是谁提供的版本？如果你要覆盖其中一个库的版本，`platform()` 和 `enforcedPlatform()` 的行为差别是什么？
2. `:domain` 的 public 方法返回 `Money`，`Money` 在 `:shared-kernel` 里。`:domain` 对 `:shared-kernel` 该用 `api` 还是 `implementation`？如果 `order-service` 只依赖 `:domain`，它能直接 `import Money` 吗？
3. 为什么 `buildSrc` 改一行会让整个构建的缓存失效？convention plugin 为什么不会？
4. 一个自定义任务只在 `doLast` 里复制文件，标了 `@CacheableTask` 却从不命中；另一个项目每次打出的 JAR 哈希都不同。这两件事分别违反构建缓存的哪条前提？各自怎么修？
5. 集成测试为什么不能和单测共用一个 task？用 `testing.suites` 拆分后，`check` 怎么保证两个都跑？
6. detekt 的 baseline 为什么会变成技术债黑洞？给出两条防止它膨胀的策略。

## 9. 延伸

- 上一册：[06-Kotlin与Spring的接缝-allopen-noarg与DSL配置](06-Kotlin与Spring的接缝-allopen-noarg与DSL配置.md)——`kotlin("plugin.spring")` 的版本统一是 catalog 的第一课。
- 构建产物的交付（分层镜像、探针、优雅停机）见[第十阶段导览](../10-第十阶段/01-导览.md)；多模块拆成多服务后的构建与联调见[第十一阶段导览](../11-第十一阶段/01-导览.md)。
- 回到阶段入口：[01-导览](01-导览.md)，把本阶段的四份规约（值对象、密封错误、协程边界、构建约定）落成团队 checklist。
