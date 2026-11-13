// GC 算法实验室 · 公共底座
//
// 教学模型：Addr = 堆数组下标（"地址即下标"——教学堆的全部秘密）。
// 所有回收器实现同一个 Collector 接口，差异只在 writeRef 的屏障与
// collect 的算法本体——mutator（测试/压力驱动）代码完全不用改。
// 对应文档：compiler/docs/10-GC算法专题/ 与 06-第六阶段/04-实践。

export type Addr = number;

export interface Node {
  /** 稳定身份：搬运/整理后不变，测试与 trace 用它比对 identity */
  id: number;
  label: string;
  /** 对象大小（真实堆按字节算地址；实验室按"对象数"算地址，算法完全同构） */
  size: number;
  /** 引用字段数组化：null = 空槽。所有算法统一只看这一条出边列表 */
  children: (Addr | null)[];
  // —— 各回收器挂载的元数据（互不干扰，缺省不占用）——
  next?: Addr | null;                        // 侵入式堆链表（mark-sweep / incremental）
  markEpoch?: number;                        // 黑白翻转（mark-sweep / incremental / generational）
  marked?: boolean;                          // mark-compact 的本轮标记位
  forwarded?: Addr | null;                   // 转发指针（copying / mark-compact）
  rc?: number;                               // 引用计数（refcount）
  cycleColor?: 'gray' | 'black' | 'white';   // 试删法三相着色
  generation?: 'young' | 'old';              // 分代
}

export interface CollectReport {
  reason: string;
  /** 本轮回收的对象数 */
  reclaimed: number;
  /** 回收后存活对象数 */
  survivors: number;
  /** 抽象工作单位：标记/清扫/搬运次数（教学堆没有真实毫秒可测） */
  work: number;
}

export interface Collector {
  readonly name: string;
  /** 根槽位 = 求值栈 + 全局表的教学替身；槽位写入不打屏障（"栈引用免管"） */
  readonly roots: (Addr | null)[];
  /** 开一个根槽位，返回下标 */
  addRoot(): number;
  /** 分配：返回新地址（尚未被任何根持有，谁要活谁挂根） */
  alloc(label: string, size: number, fields: number): Addr;
  /** 引用写唯一入口——所有屏障都拦在这一个函数里 */
  writeRef(host: Addr, field: number, value: Addr | null): void;
  /** 触发回收 */
  collect(reason?: string): CollectReport;
  /** 调试视图：地址是否仍在堆上（悬垂检测的基石） */
  isLive(addr: Addr | null): boolean;
  liveAddrs(): Iterable<Addr>;
  node(addr: Addr): Node;
  /** trace 日志（对照文档 --trace-gc 的输出格式） */
  readonly events: string[];
}

// ---------- 调试校验器 ----------

/** 全堆悬垂检测：任何存活对象不得指向已回收地址（事故表第 4 步的常驻化） */
export function assertNoDangling(heap: Collector): void {
  for (const a of heap.liveAddrs()) {
    const n = heap.node(a);
    for (let f = 0; f < n.children.length; f++) {
      const c = n.children[f];
      if (c !== null && !heap.isLive(c)) {
        throw new Error(`悬垂指针：${n.label}#${n.id}.field${f} → 已回收地址 #${c}`);
      }
    }
  }
}

// ---------- 确定性 mutator 驱动器 ----------

/** mulberry32：种子化 PRNG——压力测试完全可复现 */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ChurnStats {
  allocs: number;
  writes: number;
  drops: number;
}

export interface ChurnOptions {
  /** 每次变异后的回调（增量 GC 在这里 gcTick；不变式断言也在这里常驻） */
  tick?: () => void;
  /** 每个对象的引用字段数 */
  fields?: number;
  /** 对象大小（记账用） */
  size?: number;
}

/**
 * churn：让 mutator 以随机方式分配 / 改边 / 断根。
 * 这是"真实程序在 GC 眼里长什么样"的最小替身——压力测试全靠它。
 */
export function churn(
  heap: Collector,
  rng: () => number,
  ops: number,
  opts: ChurnOptions = {},
): ChurnStats {
  const stats: ChurnStats = { allocs: 0, writes: 0, drops: 0 };
  const fields = opts.fields ?? 3;
  const size = opts.size ?? 16;
  const recent: Addr[] = []; // 近期对象池：模拟"缓存旧对象再挂回来"（复活模式）
  const pickRoot = (): number | null => {
    for (let tries = 0; tries < 4; tries++) {
      const i = Math.floor(rng() * heap.roots.length);
      if (heap.roots[i] !== null && heap.roots[i] !== undefined) return i;
    }
    return null;
  };
  const pickRecent = (): Addr | null => {
    // 只从还活着的池成员里挑（真实代码拿不到已回收对象的引用）
    const live = recent.filter((a) => heap.isLive(a));
    if (!live.length) return null;
    return live[Math.floor(rng() * live.length)];
  };
  for (let i = 0; i < ops; i++) {
    const roll = rng();
    if (roll < 0.45 || pickRoot() === null) {
      // 分配：八成挂根，两成直接变垃圾（朝生暮死——分代假说的燃料）
      const a = heap.alloc(`n${i}`, size, fields);
      stats.allocs++;
      recent.push(a);
      if (recent.length > 8) recent.shift();
      if (rng() < 0.8) heap.roots[Math.floor(rng() * heap.roots.length)] = a;
    } else if (roll < 0.85) {
      // 改边：随机根上的对象，随机字段 ← 无根新对象 / 近期对象 / null
      const hostSlot = pickRoot();
      if (hostSlot === null) continue;
      const host = heap.roots[hostSlot]!;
      const f = Math.floor(rng() * fields);
      const roll2 = rng();
      let target: Addr | null;
      if (roll2 < 0.25) {
        // 经典事故入口一：把"刚分配、尚未挂根"的对象直接写进字段（a[0] = make(...)）
        // 标记期新对象会被黑分配保住——对应真实回收器"宁可浮动、绝不误收"的取舍
        target = heap.alloc(`fresh${i}`, size, fields);
        stats.allocs++;
        recent.push(target);
        if (recent.length > 8) recent.shift();
      } else if (roll2 < 0.65) {
        // 经典事故入口二：把近期（多半已断根、还是白色）的旧对象挂回来（p.f = cached）
        target = pickRecent();
      } else {
        const tSlot = pickRoot();
        target = tSlot === null ? null : heap.roots[tSlot];
      }
      heap.writeRef(host, f, target ?? null);
      stats.writes++;
    } else {
      // 断根：制造垃圾
      const slot = pickRoot();
      if (slot === null) continue;
      heap.roots[slot] = null;
      stats.drops++;
    }
    opts.tick?.();
  }
  return stats;
}
