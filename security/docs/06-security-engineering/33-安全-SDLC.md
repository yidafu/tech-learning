# 安全 SDLC

> 日期：2026-11-04
> 所属大纲阶段：6. 安全工程
> 参考资料：
> - Microsoft Security Development Lifecycle（SDL）实践（`https://www.microsoft.com/en-us/securityengineering/sdl`）
> - OWASP SAMM v2（Software Assurance Maturity Model）（`https://owaspsamm.org/`）
> - OWASP ASVS 4.0（Application Security Verification Standard）（`https://owasp.org/www-project-application-security-verification-standard/`）
> - NIST SP 800-64 Rev.2 Security in System Development Life Cycle
> - GitHub: Security hardening for GitHub Actions（`https://docs.github.com/en/actions/security-for-github-actions`）
> - DevSecOps: CIS Software Supply Chain Security Guide / CNCF 白皮书

---

## 1. SDLC 与安全的关系

**软件开发生命周期（Software Development Life Cycle, SDLC）**描述软件从需求到退役的过程；**安全 SDLC（Secure SDLC / SSDLC）**把安全活动**嵌入**每个阶段，而不是在上线前做一次"安全测试"。

传统模式的问题用一张图就能看懂：

```
传统：需求 → 设计 → 编码 → 测试 → [上线前渗透测试] → 上线
                                    ↑
                     此时发现的漏洞：架构级问题已难改、发版压力大、修复成本最高

安全 SDLC：需求(安全需求) → 设计(威胁建模) → 编码(规范+SAST) → 测试(DAST+安全用例) → 发布(门禁) → 运行(响应)
              ↑每阶段都有"安全输入"与"安全输出"，缺陷在离引入最近的地方被消灭
```

本篇是第 6 阶段"安全工程"的**总纲**：编码规范（30 篇）、供应链（31 篇）、密钥（32 篇）是其中实现阶段的工具箱，应急响应（34 篇）对应运行阶段。

---

## 2. 微软 SDL：七阶段逐条

微软 2004 年起因 Windows 蠕虫时代（Blaster 等）把安全作为全公司流程强制推行，SDL 是这个实践的产物，也是后来所有安全 SDLC 框架的源头。

| # | SDL 阶段 | 核心活动 | 与传统 SDL（无安全版）的差异 |
|---|---------|---------|---------------------------|
| 0 | **培训** | 全员年度安全培训：新员工必修、按角色分层（开发学编码规范、PM 学威胁建模入门） | 传统开发流程无安全培训概念，安全知识默认"安全团队的事" |
| 1 | **需求** | 定义安全需求（合规映射、质量门禁/bug 栏 "bug bar"：如"上线前高危必须清零"）、风险评级 | 传统需求只写功能与非功能性能，安全"上线再说" |
| 2 | **设计** | 威胁建模（attack surface 分析、STRIDE）、安全设计评审 | 传统设计评审只看架构合理性/性能 |
| 3 | **实现** | 安全编码规范、静态分析（SAST）零告警策略、代码评审 | 传统实现只做功能 code review |
| 4 | **验证** | 渗透测试、模糊测试（Fuzzing）、重新评估威胁模型是否仍然成立 | 传统验证只有功能测试与压测 |
| 5 | **发布** | 最终安全评审（FSR）、事件响应计划就绪、签核发布 | 传统发布只看上线检查单（回滚/容量） |
| 6 | **响应** | 安全响应中心（PSIRT）接收漏洞报告、补丁发布、把根因反哺培训与规范 | 传统流程上线即结束，无外部漏洞响应 |

微软最重要的经验数据：**SDL 投入产出比约 1:4–1:8**（后期修复成本远超过程投入；该比例是业界流传的经验说法，并非严格研究的结论），且"bug bar"（明确的量化门槛）比"尽量安全"的口号有效得多。

---

## 3. OWASP SAMM：五业务功能域与成熟度

**软件保障成熟度模型（Software Assurance Maturity Model, SAMM）**是 OWASP 的开源成熟度框架，适合自评与规划改进路线。

### 3.1 五个业务功能域（每个域 3 个安全实践，5 域共 15 项实践 v2）

| 业务功能域 | 安全实践 | 回答的问题 |
|-----------|---------|-----------|
| **治理（Governance）** | 策略与指标、教育与指导、政策与合规 | 组织怎么管理安全？ |
| **设计（Design）** | 威胁评估、安全需求、安全架构 | 方案本身安全吗？ |
| **实现（Implementation）** | 安全构建、安全部署、缺陷管理 | 做出来的东西安全吗？ |
| **验证（Verification）** | 架构评估、需求驱动测试、安全测试 | 验证过确实安全吗？ |
| **运营（Operations）** | 事件管理、运营管理、数据管理 | 跑起来以后守得住吗？ |

### 3.2 成熟度等级模型思想

每个实践按 0–3 打分：

- **0 级**：未实现（无意识/无活动）；
- **1 级**：初识（有非正式、依赖个人的实践）；
- **2 级**：已定义（流程化、有文档、组织内一致）；
- **3 级**：已优化（自动化、持续度量、持续改进）。

### 3.3 如何自评

1. 组建评估小组（安全 + 架构 + 开发负责人）；
2. 对 15 个实践逐项打分（用 SAMM 官方问卷，每题对照证据，不凭感觉）；
3. 画出雷达图，标注"现状 vs 12 个月目标"（目标不需要全是 3 级——**按业务风险定目标**，支付服务与内部工具的要求不同）；
4. 产出 roadmap：每季度提升 1–2 个实践到目标级别。

自评节奏建议每 6–12 个月一次，作为安全预算与人力规划的依据。

---

## 4. DevSecOps 理念

### 4.1 安全左移与右移

- **左移（Shift-Left）**：把安全活动移到生命周期更早处——需求和设计阶段修一处缺陷的成本是生产环境的百分之一；工具形态：IDE 插件、pre-commit、PR 门禁；
- **右移（Shift-Right）**：承认测试永远有遗漏，在生产环境补足——运行时防护（RASP/WAF）、监控告警、混沌与渗透演练、漏洞响应。

左移减少漏洞引入，右移兜住漏网之鱼，二者缺一不可。

### 4.2 安全作为代码（Security as Code）

把安全控制表达为版本库中的代码与配置：门禁规则是 YAML、威胁模型是文档进 git、策略是 OPA/Rego——可评审、可回滚、可复现，而不是某个人的口头约定或 wiki 上的陈旧清单。

### 4.3 开发者体验：不能拖慢交付

DevSecOps 失败的头号原因是**安全门禁拖慢了流水线，开发者想办法绕过它**。设计原则：

1. **反馈要快**：pre-commit 秒级（只扫暂存文件）、PR 阶段分钟级、全量深度扫描放夜间；
2. **告警要准**：误报是安全工具的第一杀手——有可达性分析的 SCA 优于纯版本匹配；
3. **修复要带路**：告警附升级命令/修复 PR（Dependabot 模式），而不是一句"有漏洞"；
4. **例外要有出口**：无法立即修复时走登记-审批-到期复查的豁免流程，而不是逼人绕过门禁。

---

## 5. 需求阶段：让安全"可测试"

### 5.1 需求来源

1. **合规驱动**：等保 2.0（国内信息系统基线，定级备案测评）、PCI DSS（处理卡数据的强制要求）、**《个人信息保护法》（PIPL）**与《数据安全法》（数据分类分级、最小收集、出境评估）——一句话：合规划底线；
2. **业务风险驱动**：资产价值×威胁场景（资金操作要 MFA，公开页面的 XSS 优先级就低）；
3. **标准映射**：用 **OWASP ASVS（Application Security Verification Standard）** 的章节（V2 认证、V3 会话、V4 访问控制……V14 配置）作为需求清单，按业务选择 Level 1–3。

### 5.2 可测试的安全需求：好 vs 坏对比

| 坏需求（不可测试） | 好需求（可验收） |
|------------------|----------------|
| "系统要安全，防注入" | "所有数据库访问必须使用参数化查询；代码评审 checklist 第 2 项打钩 + SAST 规则 p/sql-injection 零告警" |
| "密码要好好存" | "用户口令使用 argon2id（m=64MB,t=3,p=4）哈希存储，登录接口在 5 次失败后锁定 15 分钟（ASVS V2.2/V2.7）" |
| "敏感数据要保护" | "手机号在日志与 API 响应中脱敏为 `138****8000` 格式；全文字段落库加密（KMS 信封加密，见 notes/32）" |
| "要有权限控制" | "所有 `/admin/*` 接口校验服务端会话角色 `role=admin`；越权访问返回 403 并记录 event=ACL_DENY 日志" |

**写法公式**：控制措施（具体技术） + 触发条件/范围 + 可观察的验收标准（工具规则/日志事件/测试用例）。

### 5.3 安全用户故事

```
作为 攻击者（或恶意内部用户），
我想 直接调用订单查询接口遍历他人订单，
以便 窃取用户隐私。
验收：服务端必须校验 order.user_id == session.user_id，
      不匹配返回 403 + 记录 ACL_DENY 日志（含 trace_id）。
```

写法即**滥用故事（Abuser Story）/ 恶意用户故事**：用攻击者视角反推验收条件，作为 backlog 与威胁建模的衔接。

---

## 6. 设计阶段

### 6.1 威胁建模嵌入

在架构评审的固定环节做 30–60 分钟轻量建模（不必每次四小时大会）：画数据流图（DFD）→ 对每个元素过 STRIDE → 产出威胁清单与缓解措施 → 高风险项进 backlog。详细方法见 `07-威胁建模.md`。

### 6.2 安全设计评审（Security Design Review, SDR）流程

1. **触发**：新服务立项、重大架构变更、引入新数据类别（如开始收集身份证）；
2. **输入**：架构图/DFD、数据分类、第三方依赖清单、认证授权方案；
3. **评审会**（安全 + 架构 + 业务 owner）：对照检查要点清单；
4. **输出**：风险清单（分级、owner、deadline）、放行条件（可带条件通过）；
5. **跟踪**：风险项进需求跟踪系统，与代码缺陷同等对待。

**检查要点**（SDR 通用清单）：信任边界划分、最小权限的服务间认证（mTLS/短期 token）、敏感数据流向与加密、审计日志覆盖管理操作、失败模式是否 fail-secure、组件复用（不新造轮子）。

### 6.3 安全架构决策记录

用 **ADR（Architecture Decision Record）** 固化安全决策，模板：

```markdown
# ADR-014：会话 token 采用短期 JWT + refresh token 轮换
日期：2026-11-04  状态：已接受
背景：单体转微服务后，跨服务传递会话身份的需求出现。
决策：访问 token 15 分钟 JWT（RS256，kid 轮换见 notes/32），
      refresh token 每次使用后轮换并检测重放。
后果：+ 无状态验证；- 吊销需黑名单/短 TTL 折中；密钥管理要求提高。
被否方案：共享 session 存储（引入单点）；长期 JWT（无法吊销）。
```

价值：半年后没人记得"为什么这么设计"时，ADR 防止下一个人出于好心把安全设计"优化"掉。

---

## 7. 实现阶段

### 7.1 三层自动化扫描

| 层 | 时机 | 工具（见 30/31/32 篇） | 时长要求 |
|----|------|----------------------|---------|
| L1 pre-commit | 本地 commit 前 | gitleaks（密钥，秒级） | < 5s |
| L2 PR 门禁 | push / PR | SAST（Semgrep）+ SCA（osv-scanner）+ 密钥扫描 | < 5min |
| L3 定期深度 | 每晚/每周 | 全量 CodeQL、镜像扫描、依赖升级全量回归 | 不限 |

**预提交钩子配置示例**（密钥 + 快速 SAST）：

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.3
    hooks:
      - id: gitleaks
        entry: gitleaks protect --staged -v
        language: system
        pass_filenames: false
  - repo: https://github.com/returntocorp/semgrep
    rev: v1.100.0
    hooks:
      - id: semgrep
        args: ["--config", "p/python", "--error"]
```

**IDE 插件**：Semgrep/GitHub Copilot Autofix、SonarLint、IntelliJ 的安全检查——把反馈提前到"写代码的当下"，这是左移的极限位置。

### 7.2 误报治理机制：基线与抑制

误报不治理，门禁三周内就会被"全局豁免"：

1. **抑制必须带元数据**：规则 ID + 理由 + 责任人 + 复审日期（inline `// nosemgrep: xxx 因为仅内网调用，复审 2027-05`）；
2. **抑制文件进版本库评审**：suppression 文件改动必须走 PR，安全团队有否决权；
3. **基线（baseline）**：存量问题生成 baseline 文件，新代码不允许新增，存量按计划消化——比"一次清零"现实；
4. **每月误报复盘**：误报率 > 30% 的规则要么改规则、要么降级为提示。

### 7.3 代码审计抽样

自动化之外，安全团队每月抽查高风险模块（认证、支付、文件上传）的 diff，重点看自动化覆盖不了的**业务逻辑漏洞**（越权、金额篡改、流程绕过）。抽样比全量现实，且形成"会被抽查"的威慑即设计意图。

---

## 8. 验证阶段

### 8.1 DAST：OWASP ZAP CI 模式

**动态应用安全测试（Dynamic Application Security Testing, DAST）**从黑盒视角攻击运行中的应用，能发现 SAST 看不到的配置与运行时问题。

```bash
# 环境：docker。镜像现为 ghcr.io/zaproxy/zaproxy/zap-stable，扫描脚本统一为 zap-scan.py
# （旧名 owasp/zap2docker-stable 与 zap-baseline.py / zap-full-scan.py 已废弃）。
# 基线扫描（CI 冒烟模式，分钟级）：
docker run -t ghcr.io/zaproxy/zaproxy/zap-stable zap-scan.py -t https://staging.corp.example \
  -c zap-rules.conf -J zap.json -m 5
# 全量主动扫描（预发环境，时间较长）：
docker run -t ghcr.io/zaproxy/zaproxy/zap-stable zap-scan.py -t https://staging.corp.example \
  -J zap.json -r zap.html
# 输出解读：zap.json 中 alerts 按风险分级（Risk Code 3=High），
# 常见误报（如 Cookie 缺 Secure 的健康检查域名）在 zap-rules.conf 中 PASS/IGNORE 并写理由
```

**IAST / RASP 一句话区分**：IAST（交互式应用安全测试）在测试流量经过时用插桩看应用内部行为，准但侵入；RASP（运行时应用自保护）跑在生产里检测并阻断攻击，是"右移"的代表。

### 8.2 模糊测试（Fuzzing）思想

向程序喂大量**随机/变异**的输入，观察是否崩溃或断言失败。重点对象：解析器（文件上传解析、协议实现）、复杂正则（ReDoS）。工具：AFL++、libFuzzer（C/C++）、go-fuzz/oss-fuzz（Go）、schemathesis（OpenAPI 接口 fuzz）。思想价值：**不假设攻击者长什么样，只假设输入会出乎意料**。

### 8.3 渗透测试时机

- 大版本发布前（面向公众的 major release）；
- 重大架构变更后（认证方式更换、新增开放 API）；
- 合规要求周期性（等保/PCI）；
- 关键：**渗透测试是验证手段不是开发手段**——把它当唯一安全活动的团队，测出来的都是两个月前就该被 SAST 拦住的问题。

### 8.4 安全测试用例 = 需求回溯

第 5.2 节的每条"好需求"都应有一条对应用例：`越权访问他人订单 → 期望 403 + ACL_DENY 日志`。安全测试与安全需求一一映射，需求覆盖率就成了可度量指标（见第 11 节）。

---

## 9. 发布与运行

### 9.1 发布门禁清单

- [ ] SCA：无未豁免的 HIGH/CRITICAL 已知漏洞（豁免在有效期内）；
- [ ] SAST：基线无新增告警；
- [ ] 密钥扫描：全量通过（含制品层）；
- [ ] 镜像扫描：trivy HIGH+ 为零或有带期限豁免；
- [ ] DAST（涉及 web 变更）：无新增高危告警；
- [ ] 安全需求用例全部通过（需求覆盖率 100%）；
- [ ] 审批记录：变更单 + owner 签核；
- [ ] 制品签名有效且与准入策略一致。

### 9.2 制品签名与准入

镜像用 cosign 签名（见 31 篇 8.4），K8s 用 policy-controller/Kyverno 准入："无有效签名不能部署"。这把"构建出的东西"与"部署的东西"用密码学绑定，封堵分发链调包。

### 9.3 运行时联动

- 运行时防护（WAF/RASP）告警进 SIEM，与日志（见 30 篇日志规范）按 trace_id 关联；
- 漏洞响应流程与应急响应见 `34-应急响应基础.md`；
- **开源组件准入**：见 31 篇第 10 节的 10 项评审清单，新依赖进入台账后才可引入。

---

## 10. 流水线完整参考：GitHub Actions DevSecOps 骨架

```yaml
# .github/workflows/devsecops.yml
name: devsecops-pipeline
on:
  pull_request:
  push:
    branches: [main]

jobs:
  # ── Job 1: SCA 依赖扫描 ──────────────────────────────
  sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@8f4b7f84864484a7bf31766abe9204da3cbe65b3 # v4.1.1
      - uses: actions/setup-go@v5
        with: { go-version: "1.22" }
      - name: osv-scanner（依赖已知漏洞，见 notes/31）
        run: |
          curl -sSfL https://raw.githubusercontent.com/google/osv-scanner/main/install.sh | sh -s -- -b /usr/local/bin
          osv-scanner scan --recursive ./ || echo "SCA 告警，策略层决定是否阻断"   # v2 语法；生产可加 --fail-on
      - name: 生成 SBOM 存档
        run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
          syft dir:. -o cyclonedx-json > sbom.cdx.json
      - uses: actions/upload-artifact@v4
        with: { name: sbom, path: sbom.cdx.json }

  # ── Job 2: SAST 静态扫描 ─────────────────────────────
  sast:
    runs-on: ubuntu-latest
    container: returntocorp/semgrep
    steps:
      - uses: actions/checkout@8f4b7f84864484a7bf31766abe9204da3cbe65b3 # v4.1.1
      - run: semgrep scan --config p/default --error --json --output semgrep.json
      # --error：ERROR 级命中即失败，阻断 PR（见 notes/30 第 11 节）

  # ── Job 3: 密钥扫描 ─────────────────────────────────
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }        # 需要全历史才能扫历史泄露
      - uses: gitleaks/gitleaks-action@ff98106e44fc72f8a3e6d78a4d9c60aa1c2520aa # v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # ── Job 4: 构建镜像 + 扫描 + 签名（依赖前三个 job 通过）────
  build-and-sign:
    needs: [sca, sast, secrets-scan]
    runs-on: ubuntu-latest
    permissions:
      id-token: write       # cosign keyless 用 OIDC（见 notes/31 8.3/8.4）
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: 构建并推送
        run: |
          echo "${{ secrets.REGISTRY_TOKEN }}" | docker login registry.corp.local -u ci --password-stdin
          docker build -t registry.corp.local/myapp:${{ github.sha }} .
          docker push registry.corp.local/myapp:${{ github.sha }}
      - name: trivy 镜像扫描（HIGH+ 阻断）
        run: |
          curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
          trivy image --exit-code 1 --severity HIGH,CRITICAL registry.corp.local/myapp:${{ github.sha }}
      - uses: sigstore/cosign-installer@v3    # ubuntu-latest runner 无 brew，用官方 action 安装 cosign
      - name: cosign 签名（keyless，凭 OIDC 身份）
        run: cosign sign --yes registry.corp.local/myapp:${{ github.sha }}

  # ── Job 5: DAST（仅部署了预发环境后运行）─────────────────
  dast:
    needs: build-and-sign
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: 部署预发（省略）
        run: echo "deploy staging..."
      - name: ZAP 基线扫描
        run: |
          docker run -t ghcr.io/zaproxy/zaproxy/zap-stable zap-scan.py \
            -t https://staging.corp.example -J zap.json || echo "按策略处理告警"
      - uses: actions/upload-artifact@v4
        with: { name: zap-report, path: zap.json }
```

---

## 11. 度量与成熟度

### 11.1 度量指标表

| 指标 | 定义 | 为什么测它 |
|-----|------|-----------|
| **漏洞密度** | 每 KLOC 新增高危告警数 | 衡量编码阶段"引入率"，左移效果的核心信号 |
| **修复 MTTR** | 高危漏洞从发现到修复的中位时长 | 响应能力；Log4shell 式事件的生死线 |
| **门禁通过率** | PR 一次通过安全门禁的比例 | 开发者体验指标——过低说明门禁太吵（误报多）或培训不足 |
| **安全需求覆盖率** | 已有验证用例的安全需求 / 全部安全需求 | 防止"写了需求没人验" |
| 豁免数量与年龄 | 活跃豁免条目数、超期比例 | 门禁退化的前兆指标 |

### 11.2 Goodhart 定律警示

**当指标变成目标，它就不再是好指标（Goodhart's Law）**。漏洞密度定 KPI 后，团队会学会"把代码写长稀释密度"或压低告警级别；MTTR 定 KPI 后会"先降级再慢慢修"。对策：指标只用于**趋势与对话**，不直接绑定个人绩效；组合指标互相制衡（密度×MTTR×豁免数一起看）。

### 11.3 成熟度自评表（简化 SAMM）

| 实践 | 0 未做 | 1 初识 | 2 定义 | 3 优化 |
|-----|-------|-------|-------|-------|
| 安全需求 | 无 | 大版本列清单 | ASVS 映射+每需求有用例 | 需求库自动检查覆盖率 |
| 威胁建模 | 无 | 事故后补 | 关键项目必做 | DFD 随架构仓库存续并自动 diff |
| SAST/SCA | 无 | 手动跑 | PR 门禁+基线 | 可达性降噪+自动修复 PR |
| 密钥管理 | 硬编码 | .env | 机密管理器 | 动态凭据+自动轮换 |
| 门禁与签名 | 无 | 人工检查 | 自动门禁 | 签名+准入+例外闭环 |
| 应急响应 | 无 | 有联系人 | IRP+playbook | 演练+MTTR 度量 |

---

## 12. 试点推广策略

从单服务试点到全面铺开：

1. **选试点**：一个中等复杂度、团队配合度高的服务（不要选最核心的支付，也别选没人管的边缘服务——前者失败代价大，后者没有说服力）；
2. **跑通全流程**：需求→门禁→发布在试点上完整走一遍，记录每个卡点与耗时；
3. **修工具**：把试点暴露的误报、耗时问题修掉（这一步决定推广成败）；
4. **产出模板与冠军**：试点成员成为各团队的"安全冠军（Security Champion）"，模板（workflow YAML、checklist）开箱即用；
5. **分批推广**：按服务风险等级分批，公开每批的漏洞拦截数据（"本月门禁拦下 3 个高危"）比任何宣讲有效；
6. **制度化**：新服务默认带全套门禁（脚手架内置），存量服务限期迁移。

---

## 13. 常见反模式

| 反模式 | 症状 | 矫正 |
|-------|------|------|
| **安全当警察** | 安全团队只提工单不教方法，开发绕着走 | 转当教练：陪审、给修复 PR、Security Champion 计划 |
| **门禁形同虚设** | 告警一万条没人看，或 `continue-on-error: true` 一路绿灯 | 先治理噪音（基线+可达性），再收紧策略；豁免流程化 |
| **一次性大测试** | 上线前两周"安全冲刺"渗透测试，架构问题无解 | 把活动拆回各阶段，渗透只做验证 |
| **合规驱动最小化** | 只做等保测评要求的动作，测评完即废弃 | 用合规当预算理由，用风险决定优先级 |
| **工具堆砌** | 同时跑 5 个 SAST，每个都告警，没人修 | 少而准：一门 SAST+一门 SCA 做深，再谈广 |

---

## 14. 自测问题

1. 微软 SDL 七阶段中，哪一阶段是传统 SDLC 完全没有的？为什么"培训"被列为第 0 阶段？
2. SAMM 五个业务功能域分别回答什么问题？成熟度 1 级与 2 级的本质区别是什么？
3. 左移和右移各自解决什么问题？只做左移会漏掉什么？
4. 把"系统要防 XSS"改写成可测试的安全需求（套用控制措施+范围+验收公式）。
5. 安全用户故事（滥用故事）与普通用户故事的关键差异是什么？
6. 误报治理的四个机制是什么？为什么"全局忽略"是慢性毒药？
7. SAST、SCA、DAST、IAST 各自的输入和视野有什么不同？各自能发现另外三者发现不了的问题的例子？
8. 发布门禁至少应包含哪 8 项？豁免（exception）为什么必须带复审日期？
9. 为什么漏洞密度和 MTTR 要组合看？Goodhart 定律对安全度量设计的具体警示？
10. 描述你所在团队从 0 到 1 落地试点 DevSecOps 的前 90 天计划（提示：第 12 节六步）。

---

（完 · 上一篇：`32-密钥管理.md` ｜ 下一篇：`34-应急响应基础.md`）
