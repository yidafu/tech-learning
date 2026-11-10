/**
 * 大纲章节：阶段 1 里程碑
 * 主题：deepClone 测试——原始值/循环引用/Map/Set/Date/RegExp/class/私有字段边界/Symbol 键/structuredClone 对照
 * 运行：npx vitest run exercises/milestone/deep-clone.test.ts
 */
import { describe, it, expect } from 'vitest';
import { deepClone } from './deep-clone';

describe('deepClone', () => {
  it('原始值与嵌套对象：结构深比较、每层引用独立', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('str')).toBe('str');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(undefined)).toBe(undefined);
    const sym = Symbol('sym');
    expect(deepClone(sym)).toBe(sym);

    const source = { a: 1, b: { c: [1, 2, { d: true }] } };
    const cloned = deepClone(source);
    expect(cloned).toEqual(source); // 深比较相等
    expect(cloned).not.toBe(source);
    expect(cloned.b).not.toBe(source.b);
    expect(cloned.b.c).not.toBe(source.b.c);
    expect(cloned.b.c[2]).not.toBe(source.b.c[2]);
  });

  it('循环引用：不爆栈，克隆体内引用结构与原对象一致', () => {
    const original: Record<string, unknown> = { name: 'a' };
    original.self = original; // 自引用
    (original as any).peer = { back: original }; // 交叉引用

    const cloned = deepClone(original);
    expect(cloned.name).toBe('a');
    expect(cloned.self).toBe(cloned); // 指向克隆体自身，而非原对象
    expect((cloned as any).peer.back).toBe(cloned);
    expect(cloned.self).not.toBe(original);
  });

  it('Map：键值递归克隆；嵌套 Map/Set 正确；自引用 Map 不爆栈', () => {
    const inner = { deep: true };
    const objKey = { id: 1 };
    const src = new Map<unknown, unknown>([
      ['plain', inner],
      [objKey, 'byObjKey'],
      ['nested', new Set([1, inner])],
    ]);
    const cloned = deepClone(src);
    expect(cloned).not.toBe(src);
    expect(cloned.get('plain')).not.toBe(inner); // 值被克隆
    expect(cloned.get('plain')).toEqual({ deep: true });
    expect(cloned.get(objKey)).toBeUndefined(); // 原对象键不在新 Map 中（键被克隆了）
    expect([...cloned.keys()].filter((k) => typeof k === 'object')).toHaveLength(1);
    const nestedSet = cloned.get('nested') as Set<unknown>;
    expect(nestedSet.has(1)).toBe(true);
    expect([...nestedSet][1]).not.toBe(inner); // Set 成员也被克隆

    // Map 值引用 Map 自身：循环由 seen 兜底
    const loopMap = new Map<string, unknown>();
    loopMap.set('me', loopMap);
    const loopCloned = deepClone(loopMap);
    expect(loopCloned.get('me')).toBe(loopCloned);
  });

  it('Set：成员递归克隆', () => {
    const member = { m: 1 };
    const src = new Set([{ m: 0 }, member]);
    const cloned = deepClone(src);
    expect(cloned).not.toBe(src);
    expect(cloned.has(member)).toBe(false); // 成员是新对象
    const members = [...cloned] as Array<{ m: number }>;
    expect(members.map((x) => x.m)).toEqual([0, 1]);
  });

  it('Date/RegExp：时间值与 source/flags/lastIndex 一致', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    const dateCloned = deepClone(date);
    expect(dateCloned).not.toBe(date);
    expect(dateCloned.getTime()).toBe(date.getTime());

    const re = /ab+/gi;
    re.lastIndex = 3; // 带状态的RegExp
    const reCloned = deepClone(re);
    expect(reCloned).not.toBe(re);
    expect(reCloned.source).toBe(re.source);
    expect(reCloned.flags).toBe(re.flags);
    expect(reCloned.lastIndex).toBe(3); // 状态也同步
  });

  it('class 实例：原型保留（instanceof 成立）；#private 私有字段无法克隆（边界）', () => {
    class Point {
      #secret = 'hidden'; // 私有字段存在实例的 [[PrivateElements]] 内部槽，不在 own keys 中
      constructor(
        public x: number,
        public y: number,
      ) {}
      reveal(): string {
        return this.#secret; // 克隆体没有 #secret → 抛 TypeError
      }
    }
    const p = new Point(1, 2);
    const pc = deepClone(p);
    expect(pc).not.toBe(p);
    expect(pc).toBeInstanceOf(Point); // Object.create(原型) 保留原型链
    expect(pc.x).toBe(1);
    expect(pc.y).toBe(2);
    expect(p.reveal()).toBe('hidden'); // 原对象正常
    // 边界说明：deepClone（与 structuredClone 一样）无法复制私有字段，
    // 克隆体上访问私有成员会抛 TypeError
    expect(() => pc.reveal()).toThrow(TypeError);
  });

  it('克隆后修改互不影响（深独立）', () => {
    const src = { list: [1, 2], meta: { ok: true }, map: new Map([['k', { v: 1 }]]) };
    const cloned = deepClone(src);
    (cloned as typeof src).list.push(3);
    (cloned as typeof src).meta.ok = false;
    (cloned as typeof src).map.get('k')!.v = 99;
    expect(src.list).toEqual([1, 2]);
    expect(src.meta.ok).toBe(true);
    expect(src.map.get('k')!.v).toBe(1);
  });

  it('Symbol 键也被复制（Reflect.ownKeys）', () => {
    const key = Symbol('id');
    const src = { [key]: 'sym-value', normal: 'n' };
    const cloned = deepClone(src);
    expect((cloned as Record<symbol, unknown>)[key]).toBe('sym-value');
    expect(Object.getOwnPropertySymbols(cloned)).toEqual([key]);
    expect(Object.keys(cloned)).toEqual(['normal']);
  });

  it('与 structuredClone 对照：普通数据结果一致；函数 deepClone 返回原引用、structuredClone 抛 DataCloneError', () => {
    const data = { arr: [1, { b: 2 }], d: new Date(0), m: new Map([['x', 1]]) };
    expect(structuredClone(data)).toEqual(deepClone(data)); // 支持范围内结果一致

    const fn = (): string => 'hi';
    expect(deepClone(fn)).toBe(fn); // deepClone：共享原引用（浅语义）
    let structuredErr: unknown;
    try {
      structuredClone(fn);
    } catch (e) {
      structuredErr = e; // Node 环境为 DOMException，name 为 DataCloneError
    }
    expect(structuredErr).toBeInstanceOf(Error);
    expect((structuredErr as Error).name).toBe('DataCloneError');
  });

  it('数组：稀疏性保持（hole 不被填成 undefined 属性）；TypedArray 不共享 buffer', () => {
    const sparse: number[] = [];
    sparse[0] = 1;
    sparse[3] = 4; // 1、2 号位是 hole
    const clonedSparse = deepClone(sparse);
    expect(clonedSparse.length).toBe(4);
    expect(0 in clonedSparse).toBe(true);
    expect(1 in clonedSparse).toBe(false); // hole 保持为 hole
    expect(2 in clonedSparse).toBe(false);

    const ta = new Uint8Array([1, 2, 3]);
    const taCloned = deepClone(ta);
    expect(taCloned).not.toBe(ta);
    expect(Array.from(taCloned)).toEqual([1, 2, 3]);
    (taCloned as unknown as Uint8Array)[0] = 99;
    expect(ta[0]).toBe(1); // 不共享底层 buffer
  });
});
