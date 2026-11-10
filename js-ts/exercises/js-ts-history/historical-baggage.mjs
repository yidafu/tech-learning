// exercises/js-ts-history/historical-baggage.mjs
// 大纲章节：阶段 5 补充专题（notes/stage-5-topics/28-js-ts-history.md）
// 主题：同一批「历史遗物」在 ESM（模块代码）下的下场——Annex B 不适用于模块
// 运行：node exercises/js-ts-history/historical-baggage.mjs
// 预期输出：模块在**解析阶段**就失败，一行都不会执行（V8 按它先撞上的错误报）：
//   SyntaxError: Octal literals are not allowed in strict mode.
//   ——模块隐含 strict，所以报的是 strict 措辞，不是「in modules」
//   （把 010 那行注释掉再跑，才轮到第二件遗物：
//     SyntaxError: HTML comments are not allowed in modules）

console.log("先跑到这里才对——但模块直接解析失败，这行永远看不到");

// 遗留八进制：模块里非法（strict 同罪）
console.log(010);

// HTML 型注释：模块里同样非法
<!-- 1995 年的遗产，模块不认 -->
