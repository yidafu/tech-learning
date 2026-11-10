---
sidebar_position: 5
---

# Grafana 可视化

> Prometheus 存数据，Grafana 让数据"可读"。本篇讲：数据源配置、dashboard/panel/variable 三层模型、
> 面板类型选型（什么数据配什么图）、阈值与单位、dashboard as code（provisioning + JSON）与查询优化。
> （本篇是"怎么画好面板"；配置体系、认证权限、Explore、Transformations、告警 as code 见续篇
> [grafana-deep-dive.md](grafana-deep-dive.md)。）

## 1. 数据源（Data Source）配置

### 1.1 添加 Prometheus 数据源

Grafana 支持几十种数据源；本阶段只关心 Prometheus。手工配置路径：**Connections → Data sources → Add data source → Prometheus**。

| 配置项 | 建议值 | 说明 |
| --- | --- | --- |
| URL | `http://prometheus:9090` | Grafana 容器内可达地址（容器网络服务名） |
| Access | Server | 由 Grafana 后端代理请求（Browser 模式已废弃，且要求用户浏览器能直连数据源） |
| Scrape interval | `15s` | 与 Prometheus 全局抓取间隔一致，影响 `$__rate_interval` 的下限 |
| Query editor | 自动补全/指标浏览 | 默认即可 |
| Manage alerts via Alerting | 按需 | Grafana 自有告警（本阶段用 Prometheus 告警，可不勾） |

### 1.2 `$__rate_interval`（重要）

Grafana 内置变量 `rate(x[$__rate_interval])`：自动取 `max(4 × scrape interval, 每个step的1/4)`，**保证窗口内至少有 4 个样本**，避免 `rate(x[1m])` 在面板放大到 1h（step 变大/变小）时空洞或过采样。**面板里 rate 窗口一律用 `$__rate_interval`**，取代手写 `[5m]`（告警规则里没有这个变量，仍手写窗口）。

参考：<https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/>（访问日期：2026-11-04）

## 2. 三层模型：Dashboard → Panel → Query

```mermaid
flowchart TD
    D["Dashboard（仪表盘）"] --> V["templating.variables<br/>模板变量：job、instance、path …（顶部下拉框）"]
    D --> P1["Panel 1（面板）<br/>一块图"]
    D --> P2["Panel 2 …"]
    D --> R["Row<br/>分组行，可折叠"]
    P1 --> QA["Query A<br/>PromQL，可引用变量"]
    P1 --> QB["Query B<br/>可多查询叠加（比较、双轴）"]
    P1 --> T["Transformations<br/>查询结果再加工（join/重命名/过滤）"]
    P1 --> FO["Field/Panel options<br/>单位、阈值、图例、覆盖"]
```

- **Panel 是最小可视单元**，每个 Query 返回一个 frame（多列多行）；`Format: Time series` / `Table` / `Heatmap` 决定 Prometheus 响应如何映射。
- Dashboard JSON 就是这棵树的序列化（`schemaVersion`、`panels[]`、`templating.list[]`），可以导出/导入/版本管理。

## 3. 模板变量（Templating）：一板多用

### 3.1 变量类型

| 类型 | 用途 | 例子 |
| --- | --- | --- |
| `query` | 从数据源动态取值 | job / instance / path 下拉框 |
| `custom` | 手写枚举 | env: prod, staging |
| `interval` | 时间粒度 | `1m,5m,10m`（配合 `__interval` 变量） |
| `datasource` | 切换数据源 | 多环境多 Prometheus |
| `constant` / `textbox` | 固定值/用户输入 | 阈值输入框 |
| `adhoc` | 临时标签过滤 | 用户自由拼 `{status=~"5.."}` |

### 3.2 变量定义示例（lab01 实际使用）

```json
{
  "name": "job",
  "type": "query",
  "query": { "query": "label_values(up, job)", "refId": "PrometheusVariableQueryEditor-1" },
  "includeAll": true,
  "multi": true,
  "current": { "text": "All", "value": "$__all" }
}
```

- `label_values(up, job)`：返回 up 指标上出现过的全部 job 值（也可 `label_values(http_requests_total, path)`）。
- 变量在 PromQL 中用 `$job` / `${job}` 引用；开 multi 后，Grafana 会把多选展开成正则 `job=~"a|b"`。

### 3.3 变量联动（级联）

第二个变量查询里引用第一个变量，实现"选了服务再选该服务的实例"：

```text
变量1 job:     label_values(up, job)
变量2 instance: label_values(up{job=~"$job"}, instance)
```

面板查询再引用 `$job`、`$instance`，一块面板即可覆盖全部服务/实例组合——这就是"模板变量联动"，是仪表盘数量不失控的关键。

### 3.4 内置变量速查

| 变量 | 含义 |
| --- | --- |
| `$__rate_interval` | 安全的 rate 窗口（见 1.2） |
| `$__interval` | 面板 step |
| `$__range` | 面板选择的整个时间范围 |
| `$__from` / `$__to` | 范围起止 epoch ms |
| `$__all` / `$__all-variable` | All 选项值 |
| `$__dashboard` / `$__org` | 面板/组织名 |

## 4. 面板类型选型

**核心原则：图的形状要匹配数据的语义**（趋势→折线，当前值→大数字，分布→热力图，比例→gauge）。

| 面板类型 | 适合的数据 | 典型场景 | 反面案例 |
| --- | --- | --- | --- |
| **Time series** | 随时间变化的多序列 | QPS、延迟、内存曲线 | 一条"当前值"序列画折线浪费（用 Stat） |
| **Stat** | 单个当前值（+sparkline） | 当前错误率、总实例数 | 多维多序列全塞进来（数字爆炸） |
| **Gauge** | 有上下界的单值（0~100%） | CPU/内存使用率、SLO 达成率 | 无界值（QPS）画仪表盘没有意义 |
| **Bar gauge** | 多个有界值排行 | 每盘使用率、每服务错误率 | 无界值 |
| **Heatmap** | 随时间变化的**分布** | 直方图桶按时间堆叠（延迟热力图） | 非 histogram 数据 |
| **Table** | 多列结构化 | TopK 排行、序列清单 | 单序列趋势 |
| **Bar chart** | 分类对比 | 各 path 请求量对比 | 时间序列用柱状（密度低） |
| **State timeline / Status history** | 离散状态随时间 | up 探活、告警历史 | 连续值 |
| **Logs / Traces** | 日志/链路 | 阶段 2/3 使用 | — |

**延迟热力图（Heatmap）配法**：Query 返回 `le` 桶的 rate，`Format: Heatmap` + 面板开启 `Calculate`（或直接用 `histogram` 格式）——颜色越亮表示落在该延迟区间的请求速率越高。它比单条 p99 折线信息量大得多：能看到"双峰分布"（一部分请求快、一部分慢）这类 p99 掩盖的现象。

## 5. 阈值（Thresholds）与单位（Unit）

### 5.1 单位

- 在 Field/Panel options → Unit 选择：`requests/sec`（reqps）、`seconds`（Grafana 自动显示 ms/s）、`percentunit`（0~1 小数显示为 %）、`bytes(IEC)`（自动 KiB/MiB）。
- **PromQL 返回 0~1 比率时选 percentunit，不要自己在查询里 ×100**——保持数据干净，展示层换算。
- 延迟查询保持秒，Unit 选 seconds 后 Grafana 按量级自动换算显示（0.042 → 42ms）。

### 5.2 阈值

```json
"thresholds": {
  "mode": "absolute",
  "steps": [
    {"color": "green", "value": null},
    {"color": "yellow", "value": 0.05},
    {"color": "red", "value": 0.10}
  ]
}
```

- 三段式（绿/黄/红）最常用；阈值应与**告警阈值一致**（面板黄 = 告警黄），让人眼与系统同一标准。
- Time series 面板阈值默认只影响图例色与背景区带；Stat/Gauge 会直接变色。
- 进阶：`Thresholds style` 开 "Line" 画参考线（如 SLA 线）。

## 6. Dashboard as Code：Provisioning + JSON

手工点出来的 dashboard 属于"雪花配置"——不可复现、不可 review。Grafana 原生支持文件化装配。

### 6.1 Provisioning 目录结构

```
/etc/grafana/provisioning/
├── datasources/
│   └── prometheus.yml        # 数据源声明
└── dashboards/
    └── dashboards.yml        # dashboard provider：从哪加载 JSON
/opt/grafana/dashboards/      # JSON 放这里（provider 指向的路径）
└── lab01-overview.json
```
<!-- 保留原图：provisioning 目录结构清单，非概念示意图，Mermaid 无原生文件树类型 -->

### 6.2 数据源 provisioning 文件

```yaml
# datasources/prometheus.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090   # 容器网络内服务名
    isDefault: true
    jsonData:
      timeInterval: "15s"         # 告知抓取间隔，供 $__rate_interval 计算
```

### 6.3 Dashboard provider 文件

```yaml
# dashboards/dashboards.yml
apiVersion: 1
providers:
  - name: lab01
    folder: Lab01                # 界面上归入哪个文件夹
    type: file
    updateIntervalSeconds: 10    # 磁盘 JSON 变化后自动重载
    options:
      path: /opt/grafana/dashboards
      foldersFromFilesStructure: false
```

### 6.4 Dashboard JSON 骨架（最小完整结构）

```json
{
  "annotations": {"list": []},
  "editable": true,
  "graphTooltip": 1,
  "refresh": "30s",
  "schemaVersion": 39,
  "tags": ["lab01", "metrics"],
  "time": {"from": "now-1h", "to": "now"},
  "timezone": "browser",
  "title": "Lab01 · 服务总览",
  "uid": "lab01-overview",
  "version": 1,
  "templating": {"list": [ /* 变量 */ ]},
  "panels": [ /* 面板 */ ]
}
```

关键点：**`uid` 必须固定**（导入/更新按 uid 幂等）；`schemaVersion` 声明 JSON 结构代数；面板 JSON 中 `datasource` 用 `{"type":"prometheus","uid":"${DS_PROMETHEUS}}"` 或 provisioning 数据源名。

### 6.5 工作流建议

1. 在 UI 里画 → **Share → Export → Save JSON**（勾 "Export for sharing externally" 会把数据源换成变量）。
2. JSON 入库（随 lab 目录走），由 provisioning 加载。
3. CI 可用 `grafana-dashboard-validator` 或至少 `jq` 校验 JSON 结构。
4. 大规模管理再考虑 grafanafoundationsdk / Terraform provider / Grizzly，本阶段 JSON + provisioning 足够。

文档：<https://grafana.com/docs/grafana/latest/administration/provisioning/>（访问日期：2026-11-04）

## 7. 面板查询优化

1. **面板数量克制**：一个 dashboard 10~20 块面板为宜；每个 range query 都是打向 Prometheus 的真实查询，30s 自动刷新 × 20 面板 ≈ 每分钟 40 次查询（不到 1 QPS，但全部落在同一台 Prometheus 上，叠加多用户就会吃紧）。
2. **复用 recording rules**：多面板共用的复杂聚合先固化为 rule（见 PromQL 笔记 §7）。
3. **`$__rate_interval` 替代固定窗口**：缩放时间范围时自动适配，避免窗口 < step 的锯齿。
4. **Legend 用 `{{label}}` 模板**：`{{path}} · {{status}}`，比默认序列全串可读；`legend_format: {{job}}/{{instance}}`。
5. **Min step / interval override**：数据 15s 一个点时把面板 min step 设为 `15s`，防止过度查询。
6. **TopK 面板加刷新**：热点路径随时间变化，`topk(5, ...)` 面板保持 30s~1m 刷新。
7. **避免 subquery 大范围**：`[1h:15s]` 在 30 天视图上是灾难；改 recording rule。
8. **查询数合并**：`sum by (status)(rate(...))` 一次返回多条序列，优于写 5 个独立 status 查询。
9. **数据源代理缓存**：Grafana 会做瞬时去重（同查询同时间窗），但不要依赖它。
10. **面板链路排障**：Query inspector → Refresher/Query 统计耗时；>2s 的面板优先优化。

## 8. 一块面板的 JSON 解剖

以 lab01 的「QPS 按路径」面板为例，理解面板 JSON 的最小完整结构（dashboard as code 的基础）：

```json
{
  "datasource": {"type": "prometheus", "uid": "prometheus"},   // 固定 uid，不依赖名称
  "gridPos": {"h": 8, "w": 12, "x": 0, "y": 5},               // 24 列栅格布局
  "id": 6,                                                     // dashboard 内唯一
  "type": "timeseries",                                        // 面板插件类型
  "title": "QPS 按路径（Rate 分解）",
  "targets": [{                                                // 查询列表（可多条叠加）
    "datasource": {"type": "prometheus", "uid": "prometheus"},
    "expr": "sum by (path) (rate(http_requests_total{job=~\"$job\"}[$__rate_interval]))",
    "legendFormat": "{{path}}",                                // 图例模板：用标签渲染
    "refId": "A"
  }],
  "fieldConfig": {                                             // 字段级配置：单位/阈值/颜色
    "defaults": {"unit": "reqps", "custom": {"fillOpacity": 10, "drawStyle": "line"}},
    "overrides": []                                            // 按序列名/正则覆盖（如 p99 专用红色）
  },
  "options": {                                                 // 面板级配置：图例/提示框
    "legend": {"displayMode": "table", "calcs": ["lastNotNull", "max"]},
    "tooltip": {"mode": "multi", "sort": "desc"}
  }
}
```

三层配置的分工记法：**options 管交互（图例/提示框）、fieldConfig 管数据呈现（单位/阈值/坐标轴）、
overrides 管特例（把某条序列单独染色）**。改任何面板，用 UI 改完再导出 diff，是学习 JSON 结构最快的方式。

## 9. Grafana Alerting 与 Prometheus 告警的关系

两者都能"表达式 + 阈值 → 通知"，但定位不同（lab01 采用 Prometheus 侧告警）：

| 维度 | Prometheus alerting rules + Alertmanager | Grafana Alerting |
| --- | --- | --- |
| 评估引擎 | Prometheus（每 evaluation_interval） | Grafana 后端（统一告警子系统） |
| 数据源 | 只能 Prometheus | 跨数据源（Prometheus + Loki + 云 + 日志衍生指标可同规则组合） |
| 路由能力 | Alertmanager：分组/抑制/静默成熟 | 内置路由树 + 对外可转发 Alertmanager |
| 生态兼容 | 云原生事实标准，规则纯 YAML 可 review | UI 为主，规则存 Grafana DB（也可 provisioning） |
| 适用 | 已有 Prometheus 栈、K8s 场景 | 多源混合告警、Grafana OnCall/Cloud 体系 |

选择建议：指标告警用 Prometheus + Alertmanager（本阶段与大多数生产实践）；只有当告警需要
跨数据源（如"日志错误关键词突增"）时再引入 Grafana Alerting，避免两套告警并行导致认知混乱。

## 10. 常见坑（FAQ）

1. **面板报 "Too many data points"**：step 远小于数据点密度。用 `$__interval`（自动）而非手动 `1s`。
2. **变量显示 `$__all` 而非内容**：忘了 `includeAll: true` 或 current.value 未设 `$__all`。
3. **多选变量传进正则查询没生效**：`job=~"$job"` 在多选时 Grafana 自动展开为 `job=~"a|b"`；若写成 `job="$job"` 则多选无效（=不支持正则）。
4. **导出 JSON 导回去数据源丢了**：导出没勾 externals / 导入时没映射数据源变量。provisioning 数据源用固定 `uid` 可彻底规避。
5. **percentunit 与 percent 混淆**：查询返回 0~1 却选了 percent(0-100) → 显示 3%（实际 3%当 0.03 用）；比率统一 percentunit。
6. **Heatmap 乱码/空图**：未把查询 Format 设为 Heatmap、或没对 bucket 做 rate——热力图需要的是"每时间片的桶计数速率"。
7. **refresh 5s 打爆 Prometheus**：页面挂着几十块面板 × 5s 刷新；默认 30s，排障时临时调快。
8. **时区错乱**：dashboard `timezone: browser` vs UTC。团队跨时区时显式固定 `timezone: utc` 更稳。

## 11. 面试题小结

1. **Q：Grafana 的 Access: Server 与 Browser 模式区别？**
   A：Server 由 Grafana 后端向数据源发请求（可藏凭据、不暴露数据源给浏览器）；Browser 由用户浏览器直连（已废弃）。生产一律 Server。
2. **Q：`$__rate_interval` 是什么？为什么推荐它？**
   A：Grafana 计算的安全 rate 窗口 = max(4×抓取间隔, step/4 的合理值)，保证窗口内至少 4 个样本；随面板缩放自适应，避免固定窗口在缩放后的过采样/锯齿。
3. **Q：Stat / Gauge / Time series / Heatmap 分别适合什么数据？**
   A：单值看 Stat；有界比率看 Gauge/Bar gauge；多序列趋势看 Time series；分布随时间演变看 Heatmap（直方图桶）。
4. **Q：模板变量如何实现级联过滤？**
   A：后一个变量的查询引用前一个变量（`label_values(up{job=~"$job"}, instance)`），形成依赖链。
5. **Q：dashboard as code 有哪些方式？provisioning 如何工作？**
   A：JSON + provisioning（文件目录自动装配）、Terraform provider、Grizzly、SDK。provisioning 扫描 `/etc/grafana/provisioning/{datasources,dashboards}`，datasources 即时生效，dashboards provider 按 updateIntervalSeconds 周期重载 JSON。
6. **Q：为什么比率查询返回 0~1 而不是直接算百分比？**
   A：保持数据标准化（无单位），由展示层 unit(percentunit) 换算；跨面板/告警复用同一查询时不需要各自 ×100。

## 12. 参考资料

- Grafana 文档首页：<https://grafana.com/docs/grafana/latest/>（访问日期：2026-11-04）
- Prometheus 数据源配置：<https://grafana.com/docs/grafana/latest/datasources/prometheus/>（访问日期：2026-11-04）
- 模板变量：<https://grafana.com/docs/grafana/latest/dashboards/variables/>（访问日期：2026-11-04）
- Provisioning：<https://grafana.com/docs/grafana/latest/administration/provisioning/>（访问日期：2026-11-04）
- 面板可视化：<https://grafana.com/docs/grafana/latest/panels-visualizations/>（访问日期：2026-11-04）

## 附：ASCII 图替换清单

| 原 ASCII 图位置（章节标题） | 原图内容简述 | 替换结果 |
| --- | --- | --- |
| 2. 三层模型：Dashboard → Panel → Query | Dashboard/Panel/Query/Row 的三层包含关系树 | flowchart TD |

### 保留说明

| 位置 | 内容 | 保留原因 |
| --- | --- | --- |
| 6.1 Provisioning 目录结构 | provisioning 与 dashboard JSON 的目录树 | 目录/文件树清单，Mermaid 无原生文件树类型 |
