# GC 算法实验室

`docs/10-GC算法专题` 六册的可运行底座：**每个讲到的算法都有对应实现，每条论断都有对应断言**。
纯 TypeScript + vitest，无任何运行时依赖；"堆"是对象数组、"地址"是数组下标——算法本体与真实回收器同构。

## 快速开始

```bash
cd labs/gc
npm install --registry=https://registry.npmmirror.com
npx vitest run      # 46 项断言全绿
npx tsc --noEmit    # 类型零错误
```

## 模块 ↔ 文档 ↔ 测试 映射表

| 实现文件 | 算法 | 对应文档 | 测试文件（断言数） |
|---|---|---|---|
| `src/mark-sweep.ts` | 整体式三色标记-清除（epoch 黑白翻转、自适应阈值） | 专题 06 册"上一代"、六阶段 04 册 | `mark-sweep.test.ts`（7） |
| `src/copying.ts` | Cheney 半空间复制（转发指针去重、to-space 即队列、50% 税） | 追踪路线第三形态（Scavenge 原型） | `copying.test.ts`（5） |
| `src/mark-compact.ts` | Lisp v2 两指滑动整理（标记→定址→改指针→滑动） | 专题 04 册"old 整理" | `mark-compact.test.ts`（4） |
| `src/refcount.ts` | 朴素 / 延迟(Deutsch–Bobrow) / 合并(Hughes) / 试删(Bacon–Rajan) | 专题 02 册全部四节"进化" | `refcount.test.ts`（9） |
| `src/generational.ts` | 分代 + remembered set + 写屏障（minor/major） | 专题 04 册 V8 节、02 册对偶定理 | `generational.test.ts`（6） |
| `src/incremental.ts` | 增量三色 + 四屏障可插拔 + 黑分配 + 不变式校验 | 专题 03 册全部族谱、06 册实践 | `incremental.test.ts`（11） |
| `src/arena.ts` | bump 分配 + 整代 reset + region 栈（免 GC 路线） | 专题 05 册 arena 节 | `arena.test.ts`（4） |
| `src/core.ts` | Collector 统一接口、悬垂检测器、确定性 mutator(churn) | ——公共底座 | —— |

## 三个"必须亲眼看"的实验

1. **事故回放 × 屏障族谱**（`incremental.test.ts`）：03 册那张事故表（A 黑 / B 白 / C 灰，mutator 两步合谋）逐屏障回放——
   `none` 必丢 B、`dijkstra`/`steele`/`yuasa`/`hybrid` 各自用不同机制保住 B。
2. **同负载屏障存在性证明**（seed 13 × 2000 次随机变异）：`hybrid` 全程零黑指白零悬垂；
   换成 `none`，同一份负载 15 次不变式违规 + 悬垂指针——**删屏障必红、装回必绿**，否则测试什么都没证明。
3. **朴素 RC 环泄漏 vs 试删法回收**（`refcount.test.ts`）：同一组环对象，两种结局。

## 教学取舍（与真实回收器的差异，全部有意识）

- **Addr = 数组下标**：真实堆按字节编址、size class 分配——教学堆以"对象"为地址单位，算法完全同构；
- **晋升不搬运**：分代实验室的晋升只换所属集合（真实收集器在此复制对象）——聚焦"扫描集合"逻辑，
  minor GC 便宜的全部秘密（**老年代本体一步都不碰**）反而看得更清楚；
- **根重扫兜底**：栈/根槽位写入不打屏障（"栈引用免管"），正确性由收尾根重扫保证——
  对应 Go 混合屏障买回"免栈重扫"之前各工业回收器的 STW 根重扫；
- **试删法候选集取全堆**：Python 用"容器类型"启发式过滤候选，实验室取最简（显式传参即是论文原意）；
- **黑分配保真**：标记期新对象生而为黑（V8 老生代同款）——这是压测里"新写入字段的无根对象"
  不会被无屏障误收的原因，漏标窗口只属于"周期开始前就存在的白对象"。

## 与 mini VM 的关系

六阶段实践册与 06 册叙述的 `packages/vm`（带字节码解释器的 mini 语言）在本仓库尚未落地；
本实验室在**对象图层**实现了同一套算法——VM 里的 `SET_GLOBAL`/数组 `SET` 对应这里的
`writeRef`，求值栈/全局表对应 `roots`，`--stress-gc` 对应 `stepBudget=1; markEvery=1`。
概念一一对应，读文档时拿实验室跑数即可。
