/**
 * 大纲章节：阶段 1 里程碑（深拷贝 + WeakMap 处理循环引用）
 * 主题：手写 deepClone——覆盖 Date/RegExp/Map/Set/TypedArray/稀疏数组/原型/Symbol 键/循环引用，
 *       并与 HTML Standard 的 structured clone 算法逐项对照
 * 测试：npx vitest run exercises/milestone/deep-clone.test.ts
 * 运行：npx tsx exercises/milestone/deep-clone.ts
 */

/**
 * 手写深拷贝。算法对照：HTML Standard §2.7.5 StructuredSerializeInternal（structured clone）
 *   - 原始值 / Date / RegExp / Map / Set / TypedArray：structuredClone 支持，本实现支持
 *   - 普通对象：structuredClone 丢失原型（只克隆 own enumerable 属性，产出 plain object）；
 *     本实现用 Object.create(Object.getPrototypeOf(...)) 额外保留原型 → class 实例可克隆
 *   - 函数：structuredClone 直接抛 DataCloneError；本实现返回原引用（闭包无法枚举重建）
 *   - #private 私有字段：存于实例内部槽 [[PrivateElements]]，不在 own keys 里，
 *     两种实现都无法克隆（structuredClone 对带私有字段的 class 实例同样丢失）
 *   - Symbol 键：structured clone 序列化时丢弃；本实现用 Reflect.ownKeys 保留
 *   - 循环引用：structured clone 通过 SerializationState 记忆化支持；本实现用 WeakMap
 *
 * @param seen 记忆化表：源对象 → 克隆对象。命中说明是循环引用，直接返回已克隆的引用
 */
export function deepClone<T>(value: T, seen: WeakMap<object, unknown> = new WeakMap()): T {
  // 1. null 与原始值：直接返回（structured clone 第 1 步：primitive input → 原样返回）
  //    注意 null 要先判：typeof null === 'object' 的历史包袱
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return value;
  }

  // 2. 函数：返回原引用（浅拷贝语义）。
  //    为什么不克隆：函数 = 代码体 + [[Environment]] 闭包环境，闭包引用的外部变量
  //    是引擎内部绑定，JS 层无法枚举，也就无法重建等价闭包；structured clone 对函数
  //    直接抛 DataCloneError（'Functions cannot be cloned'）
  if (typeof value === 'function') {
    return value;
  }

  const input = value as unknown as object;

  // 3. 循环引用：WeakMap 命中 → 返回已克隆的引用，避免无限递归爆栈。
  //    WeakMap 的键是弱引用：克隆表不延长源对象的生命周期（不造成内存泄漏）
  if (seen.has(input)) {
    return seen.get(input) as T;
  }

  // 4. Date：structured clone 保留时间值（按毫秒重建）
  if (input instanceof Date) {
    return new Date(input.getTime()) as T;
  }

  // 5. RegExp：source + flags 重建。lastIndex 是可写的实例属性（带 g/y 标志时
  //    记录下次匹配起点），有状态语义，一并同步
  if (input instanceof RegExp) {
    const cloned = new RegExp(input.source, input.flags);
    cloned.lastIndex = input.lastIndex;
    return cloned as T;
  }

  // 6. Map：键与值都要递归（键可能是对象/甚至 Map 自己——循环引用由 seen 兜底）。
  //    注意先 seen.set 再递归填内容：Map 值引用 Map 自身时才能命中记忆表
  if (input instanceof Map) {
    const clonedMap = new Map<unknown, unknown>();
    seen.set(input, clonedMap);
    input.forEach((v, k) => {
      clonedMap.set(deepClone(k, seen), deepClone(v, seen));
    });
    return clonedMap as T;
  }

  // 7. Set：成员递归
  if (input instanceof Set) {
    const clonedSet = new Set<unknown>();
    seen.set(input, clonedSet);
    input.forEach((v) => {
      clonedSet.add(deepClone(v, seen));
    });
    return clonedSet as T;
  }

  // 8. TypedArray / DataView（ArrayBuffer.isView）：
  //    新建同类型视图 + set 逐项拷贝 → 不与源共享底层 buffer
  if (ArrayBuffer.isView(input)) {
    if (input instanceof DataView) {
      const view = input as unknown as DataView;
      return new DataView(
        view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength),
      ) as unknown as T;
    }
    const ta = input as unknown as Uint8Array<ArrayBufferLike>;
    const TypedArrayCtor = (input as unknown as object).constructor as new (
      length: number,
    ) => Uint8Array<ArrayBufferLike>;
    const clonedTA = new TypedArrayCtor(ta.length);
    clonedTA.set(ta);
    return clonedTA as unknown as T;
  }

  // 9. Array：Reflect.ownKeys 只列出真实存在的索引（升序）+ length，
  //    中间的 hole 不复制属性 → 稀疏数组克隆后仍是稀疏的（hole 不是 undefined 属性）
  if (Array.isArray(input)) {
    const clonedArray: unknown[] = [];
    seen.set(input, clonedArray);
    const srcRecord = input as unknown as Record<PropertyKey, unknown>;
    const outRecord = clonedArray as unknown as Record<PropertyKey, unknown>;
    for (const key of Reflect.ownKeys(input)) {
      outRecord[key] = deepClone(srcRecord[key], seen);
    }
    return clonedArray as T;
  }

  // 10. 普通对象（含 class 实例）：Object.create 保留原型（class 实例克隆后 instanceof 仍成立）。
  //     structuredClone 走的是「plain object」分支，原型信息被丢弃——这是两个实现的重要差异。
  //     先登记 seen 再复制属性：属性指回自身时命中记忆表
  const cloned = Object.create(Object.getPrototypeOf(input)) as Record<PropertyKey, unknown>;
  seen.set(input, cloned);
  for (const key of Reflect.ownKeys(input)) {
    // Reflect.ownKeys = getOwnPropertyNames（含不可枚举、含 Symbol）+ getOwnPropertySymbols
    const desc = Object.getOwnPropertyDescriptor(input, key)!;
    if ('value' in desc) {
      // 数据属性：深拷贝值，保留 enumerable/writable/configurable
      Object.defineProperty(cloned, key, {
        ...desc,
        value: deepClone(desc.value, seen),
      });
    } else {
      // 访问器属性：getter/setter 是函数 → 共享原引用（与函数不克隆的理由相同）
      Object.defineProperty(cloned, key, desc);
    }
  }
  return cloned as T;
}

export default deepClone;

// —————————————————— demo（tsx 冒烟）——————————————————

/** 供 npx tsx 直接运行的冒烟演示；测试文件不依赖它 */
export function demo(): void {
  console.log('--- deepClone demo ---');

  // 循环引用
  const node: Record<string, unknown> = { name: 'root' };
  node.self = node;
  const cloned = deepClone(node);
  console.log('  循环引用:', cloned.name, '| clone.self === clone:', cloned.self === cloned);

  // Map/Set 嵌套
  const basket = new Map<string, Set<number>>([['odds', new Set([1, 3, 5])]]);
  const basketCloned = deepClone(basket);
  console.log('  Map/Set:', (basketCloned.get('odds') as Set<number>).has(3));

  // 原型保留：class 实例
  class Label {
    constructor(public text: string) {}
    shout(): string {
      return this.text.toUpperCase();
    }
  }
  const labelCloned = deepClone(new Label('hi'));
  console.log('  原型保留:', labelCloned instanceof Label, '|', labelCloned.shout());

  // 函数：返回原引用（structuredClone 会抛 DataCloneError）
  const fn = (): number => 42;
  console.log('  函数返回原引用:', deepClone(fn) === fn);

  // 与 structuredClone 对照：普通数据结果一致
  const data = { list: [1, { ok: true }], when: new Date(0) };
  console.log('  与 structuredClone 一致:', JSON.stringify(deepClone(data)) === JSON.stringify(structuredClone(data)));
}

demo();
