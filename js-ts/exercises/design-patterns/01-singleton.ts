/**
 * 大纲章节：阶段 5 专题深入 —— 设计模式（Singleton 单例）
 * 主题：class 惰性单例 vs ESM 模块天然单例（模块缓存证据），以及单例的可测性问题
 * 运行：npx tsx exercises/design-patterns/01-singleton.ts
 * 预期输出：
 * --- 1) class 惰性单例（private 构造器 + 静态工厂）---
 * getInstance：实例不存在，创建新实例
 * getInstance：命中已有实例
 * 两次 getInstance() 是同一实例: true
 * --- 2) 可测性问题：单例就是隐藏的全局状态 ---
 * getInstance：命中已有实例
 * 测试 A 通过 getInstance 写入: ["test-a"]
 * 测试 B 拿到的实例已被测试 A 污染: true
 * --- 3) ESM 模块天然单例：模块只求值一次 ---
 * 动态 import 本模块两次，得到同一 namespace: true
 * 动态 import 与主模块共享同一实例: true
 */

// ---------------------------------------------------------------------------
// 1) class 写法：惰性创建 + private 构造器堵住 new
//    - 惰性（lazy）：第一次 getInstance 才创建；
//    - private constructor：类外无法 new，创建入口唯一化；
//    - 注意：TS 的 private 只是编译期检查，抹掉类型后在 JS 运行期仍可绕过
//      （所以下面的演示错误行要包成「只编译不调用」的箭头函数）。
//      真正的运行期封装要靠模块作用域 + 闭包，或者干脆用第 3 节的 ESM 单例。
// ---------------------------------------------------------------------------

class AppConfig {
  private static instance: AppConfig | null = null;

  /** 可变状态：用它在第 2 节演示单例的状态泄漏问题。 */
  bag: string[] = [];

  private constructor(readonly env: string) {}

  static getInstance(): AppConfig {
    if (AppConfig.instance === null) {
      console.log('getInstance：实例不存在，创建新实例');
      AppConfig.instance = new AppConfig('dev');
    } else {
      console.log('getInstance：命中已有实例');
    }
    return AppConfig.instance;
  }
}

console.log('--- 1) class 惰性单例（private 构造器 + 静态工厂）---');
const s1 = AppConfig.getInstance();
const s2 = AppConfig.getInstance();
console.log(`两次 getInstance() 是同一实例: ${s1 === s2}`);

// 编译期拦截：构造器是 private，类外不能 new（包成箭头只演示编译期，不真正执行）
// @ts-expect-error - Class constructor is private: 只能走 AppConfig.getInstance()
const byNew = () => new AppConfig('prod');
void byNew;

// ---------------------------------------------------------------------------
// 2) 可测性问题：单例 = 隐藏的全局可变状态
//    - 测试之间隐式耦合：用例 A 改的状态会影响用例 B（顺序敏感）；
//    - 无法替换：依赖单例的代码拿不到「另一个实现」，mock 困难；
//    - 生命周期失控：实例何时创建、何时销毁，由「谁第一次调用」决定，不可控。
//    缓解手段：
//    a) 依赖注入：把「实例」当参数传进去，而不是让代码自己去 getInstance；
//    b) 模块工厂：导出 createAppConfig(deps) 工厂函数，而不是导出实例；
//    c) 每个测试用独立模块图（vitest 默认 isolate / node 的 vm modules）。
// ---------------------------------------------------------------------------

console.log('--- 2) 可测性问题：单例就是隐藏的全局状态 ---');
// 模拟「测试 A」：拿单例写状态
const shared = AppConfig.getInstance();
shared.bag.push('test-a');
console.log(`测试 A 通过 getInstance 写入: ${JSON.stringify(shared.bag)}`);
// 模拟「测试 B」：自己什么都没写，却读到了 A 的痕迹
console.log(`测试 B 拿到的实例已被测试 A 污染: ${shared.bag.includes('test-a')}`);

// ---------------------------------------------------------------------------
// 3) ESM 模块天然单例
//    ESM 规范保证：一个模块文件只被【求值一次】，之后所有 import（静态/动态）
//    拿到的是同一个模块记录（module record）。
//    于是「模块顶层创建的对象」天然全局唯一 —— 连 getInstance 都不用写。
//    证据：动态 import 同一 URL 两次，比对 namespace 里的对象引用。
//
//    本节必须放在文件最后 + 不能在顶层 await：
//    主模块尚未求值完成时，`await import(自己)` 会等待「求值完成」，
//    而求值又在等这个 await —— 死锁（Node 会警告 unsettled top-level await）。
//    用 void（不 await）挂起这个演示：顶层代码跑完、模块求值结束后它才解锁，
//    这也是「动态 import 自导入拿到的就是主模块这份缓存」的最强证据。
// ---------------------------------------------------------------------------

/** 模块顶层求值时创建的唯一实例。 */
const esmConfig = { env: 'dev', note: 'created at module evaluation' };
export { esmConfig };

async function demoEsmSingleton(): Promise<void> {
  const [m1, m2] = await Promise.all([
    import(import.meta.url),
    import(import.meta.url),
  ]);
  console.log(`动态 import 本模块两次，得到同一 namespace: ${m1.esmConfig === m2.esmConfig}`);
  console.log(`动态 import 与主模块共享同一实例: ${m1.esmConfig === esmConfig}`);
}

console.log('--- 3) ESM 模块天然单例：模块只求值一次 ---');
void demoEsmSingleton();

export {};
