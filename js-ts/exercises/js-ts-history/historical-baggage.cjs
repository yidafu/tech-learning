// exercises/js-ts-history/historical-baggage.cjs
// 大纲章节：阶段 5 补充专题（notes/stage-5-topics/28-js-ts-history.md）
// 主题：1995 年代设计决策留下的、今天仍可运行的「历史遗物」
// 运行：node exercises/js-ts-history/historical-baggage.cjs
// 注意：本文件故意用 .cjs（sloppy 模式脚本），因为里面有两件遗物（遗留八进制、HTML 型注释）
//       只在非模块代码里合法——配套的 historical-baggage.mjs 演示同一份代码在 ESM 下的下场。

<!-- 下面这行注释不是 // 也不是 /* */，而是 HTML 型注释：Annex B 只允许在非模块代码里用它 -->


console.log("== 1. typeof null === 'object'（1995 年初版实现偷懒：null 的底层标记位复用了 object，为兼容永久保留）");
console.log(typeof null); // "object"

console.log("\n== 2. Date 月份从 0 开始（1995 年抄了 JDK 1.0 的 java.util.Date；Java 自己在 JDK 1.1 就废弃修掉了，JS 永远改不动）");
console.log(new Date(2026, 11, 5).getMonth()); // 11 —— 11 才是「12 月」

console.log("\n== 3. undefined 曾是可写全局（ES3 时代）；ES5 起全局的 undefined 不可写，但参数阴影永远是合法的");
console.log((function (undefined) { return undefined === 1; })(1)); // true：参数把 undefined 遮住了
console.log(JSON.stringify(Object.getOwnPropertyDescriptor(globalThis, "undefined")));
// {"writable":false,"enumerable":false,"configurable":false} —— ES5 的修复
console.log(void 0 === undefined); // true —— void 0 成语存在的原因：在 undefined 会被污染的年代，它是唯一保险写法

console.log("\n== 4. 遗留八进制字面量 010（Annex B：仅 sloppy 脚本合法，strict 和模块里是 SyntaxError）");
console.log(010); // 8

console.log("\n== 5. 稀疏数组（洞）与 undefined 的区别，ES2015+ 才被逐个方法抹平");
const sparse = [1, , 3];
console.log(sparse.length);          // 3 —— 但中间那个槽没有属性
console.log(Object.keys(sparse));    // ["0","2"] —— 洞不是属性
sparse.forEach((x) => console.log("forEach visits:", x)); // 只访问 1 和 3，跳过洞
console.log([1, , 3].indexOf(undefined)); // -1 —— indexOf 不访问洞，找不到 undefined
console.log([1, , 3].includes(undefined)); // true —— ES2016 起按「洞 === undefined」处理
console.log([...sparse]); // [1, undefined, 3] —— 展开会把洞读成 undefined

console.log("\n== 6. HTML 型注释（Annex B.1.3：1995 年浏览器不认 <script> 时把脚本当 HTML 注释藏起来的 practices）");
console.log("如果本行打印出来了，说明文件头部的 <!-- ... --> 注释在 sloppy 脚本里合法");
