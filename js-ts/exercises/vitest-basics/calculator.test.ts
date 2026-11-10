/**
 * 大纲章节：阶段 4 工程化
 * 主题：Vitest 基础——describe 嵌套、toBe/toEqual/toStrictEqual 三兄弟差异、toThrow、resolves/rejects
 * 运行：npx vitest run exercises/vitest-basics/
 * 预期输出：（vitest 摘要；时间数字随机器变化，结构与条数固定）
 *   ✓ exercises/vitest-basics/calculator.test.ts (10 tests)
 *   ✓ exercises/vitest-basics/userService.test.ts (8 tests)
 *   ✓ exercises/vitest-basics/debounce.test.ts (3 tests)
 *   Test Files  3 passed (3)
 *        Tests  21 passed (21)
 */
import { describe, it, expect } from 'vitest';
import { add, div, compose, double, addOne } from './calculator';

// 用一个自定义类构造「类信息」差异：Money 实例与普通对象结构完全相同，但原型不同
class Money {
  constructor(
    public amount: number,
    public currency: string = 'CNY',
  ) {}
}

describe('calculator 纯函数', () => {
  it('add 返回两数之和；toBe 底层是 Object.is，不做隐式转换', () => {
    expect(add(1, 2)).toBe(3);
    expect(add(1, 2)).not.toBe('3'); // Object.is(3, '3') === false
  });

  it('NaN 逃不过 ===，但逃得过不了 Object.is（toBe 能抓住 NaN）', () => {
    expect(Number.NaN).toBe(Number.NaN); // Object.is(NaN, NaN) === true
    expect(div(Number.NaN, 1)).toBeNaN();
  });

  describe('嵌套 describe：三个相等匹配器的差异', () => {
    it('toBe：引用/值恒等（Object.is），两个结构相同的对象不是同一个引用', () => {
      expect({ a: 1 }).not.toBe({ a: 1 });
      const obj = { a: 1 };
      expect(obj).toBe(obj); // 同一引用
    });

    it('toEqual：递归结构相等；忽略 undefined 键，也不比较类（原型）信息', () => {
      const money = new Money(100);
      // 结构相同即相等——toEqual 不在乎一边是类实例、一边是普通对象
      expect(money).toEqual({ amount: 100, currency: 'CNY' });
      // undefined 键被忽略：{ a: undefined, b: 2 } “等于” { b: 2 }
      expect({ a: undefined, b: 2 }).toEqual({ b: 2 });
    });

    it('toStrictEqual：更严——比较类信息，也检查 undefined 键', () => {
      const money = new Money(100);
      expect(money).not.toStrictEqual({ amount: 100, currency: 'CNY' }); // 原型不同
      expect({ a: undefined, b: 2 }).not.toStrictEqual({ b: 2 }); // undefined 键算差异
      expect(new Money(100)).toStrictEqual(new Money(100)); // 同类同构 → 相等
    });
  });

  describe('异常断言 toThrow', () => {
    it('div 除 0 抛 RangeError，消息可用子串或正则匹配', () => {
      expect(() => div(1, 0)).toThrow(RangeError);          // 错误类型
      expect(() => div(1, 0)).toThrow('除数不能为 0');       // 子串
      expect(() => div(1, 0)).toThrow(/^div: 除数不能为 0$/); // 正则
    });

    it('不抛错的函数用 not.toThrow 验证', () => {
      expect(() => div(10, 4)).not.toThrow();
    });
  });

  describe('异步断言 resolves / rejects', () => {
    it('resolves：断言 Promise 的兑现值', async () => {
      await expect(Promise.resolve(add(1, 2))).resolves.toBe(3);
    });

    it('rejects：断言 Promise 的拒绝原因（async 函数同理）', async () => {
      const rejected = new Promise<never>((_, reject) => {
        reject(new RangeError('div: 除数不能为 0'));
      });
      await expect(rejected).rejects.toThrow(RangeError);
      await expect(rejected).rejects.toThrow('除数不能为 0');

      const failAsync = async (): Promise<number> => {
        throw new RangeError('div: 除数不能为 0');
      };
      await expect(failAsync()).rejects.toThrow(RangeError);
    });
  });

  it('compose 组合顺序：compose(f, g)(x) = f(g(x))', () => {
    expect(compose(double, addOne)(5)).toBe(12); // double(addOne(5)) = double(6)
  });
});
