/**
 * 大纲章节：阶段 4 构建工具——打包器核心骨架（笔记 17 §4/§5）
 * 主题：手写零依赖 mini-bundler：① DFS 构建「模块图」② 每个模块包装成工厂函数 ③ 注册表 + 微运行时拼成单文件 IIFE
 *       （这就是 Rollup/esbuild build 阶段的最小内核；dev 阶段为什么不做这件事 → 见笔记 17 §1 no-bundle 思路）
 * 运行：node exercises/build-tools/01-mini-bundler.mjs
 * 预期输出：
 *   ── [1] 模块图（DFS 发现顺序）──
 *     entry.mjs → math.mjs  { add, mul }
 *     entry.mjs → format.mjs  { tag }
 *     math.mjs → format.mjs  { wrap }
 *     format.mjs（无依赖）
 *   ── [2] 产物（IIFE 模块注册表 + 微运行时，1377 字节）──
 *   (() => {
 *     const modules = {
 *       'entry.mjs': (exports, require) => {
 *         const { add, mul } = require('./math.mjs');
 *         const { tag } = require('./format.mjs');
 *         console.log('[产物运行] add(1,2) =', add(1, 2));
 *         console.log('[产物运行] mul(3,4) =', mul(3, 4));
 *         console.log('[产物运行] tag(add(2,3)) =', tag(add(2, 3)));
 *       },
 *       'math.mjs': (exports, require) => {
 *         const { wrap } = require('./format.mjs');
 *         function add(a, b) { return a + b; }
 *         function mul(a, b) { return wrap(a * b); }
 *         exports.add = add;
 *         exports.mul = mul;
 *       },
 *       'format.mjs': (exports, require) => {
 *         function wrap(x) { return x; }
 *         const tag = (x) => 'result:' + x;
 *         exports.wrap = wrap;
 *         exports.tag = tag;
 *       },
 *     };
 *     const deps = {
 *       "entry.mjs|./math.mjs": "math.mjs",
 *       "entry.mjs|./format.mjs": "format.mjs",
 *       "math.mjs|./format.mjs": "format.mjs"
 *     };
 *     const cache = new Map();
 *     const require = (from, spec) => {
 *       const id = deps[from + '|' + spec];
 *       if (!cache.has(id)) {
 *         cache.set(id, {});  // 先占位再执行——循环依赖时拿到「未填满」的 exports（CJS 经典陷阱）
 *         modules[id](cache.get(id), (s) => require(id, s));
 *       }
 *       return cache.get(id);
 *     };
 *     const entryExports = {};
 *     modules['entry.mjs'](entryExports, (s) => require('entry.mjs', s));
 *   })();
 *   ── [3] new Function(bundle)() 运行产物 ──
 *   [产物运行] add(1,2) = 3
 *   [产物运行] mul(3,4) = 12
 *   [产物运行] tag(add(2,3)) = result:5
 *   ── [4] 统计：模块 3 个 / 依赖边 3 条 / 产物 1377 字节 ──
 *   （真实 esbuild：并行解析 + 一次 AST 往返 + Go 原生，见文件头注释与笔记 17 §5）
 *
 * 与真实 esbuild 的差距（为什么它快，笔记 17 §5）：
 *   1. 并行：esbuild 每个文件的 词法分析→语法分析→代码生成 三步全在 Go goroutine 里跑，我们串行；
 *   2. 一次 AST 往返：esbuild 从 AST 直接生成输出，不做 tsc 那样的多轮 binder/checker 遍历；
 *   3. 我们用正则扫描 import —— 只认识「命名导入、整行书写」这一种写法，这是教学取舍，不是工程实现。
 */

import * as posix from 'node:path/posix';

// ────────────────────────────────────────────────────────────
// 三个内存模块：entry → math → format（math 也依赖 format，形成菱形依赖）
// 刻意只支持两种形式：`import { a, b } from '...'` 与 `export function/const name`
// ────────────────────────────────────────────────────────────
const SOURCES = {
  'entry.mjs': [
    "import { add, mul } from './math.mjs';",
    "import { tag } from './format.mjs';",
    "console.log('[产物运行] add(1,2) =', add(1, 2));",
    "console.log('[产物运行] mul(3,4) =', mul(3, 4));",
    "console.log('[产物运行] tag(add(2,3)) =', tag(add(2, 3)));",
  ].join('\n'),
  'math.mjs': [
    "import { wrap } from './format.mjs';",
    'export function add(a, b) { return a + b; }',
    'export function mul(a, b) { return wrap(a * b); }',
  ].join('\n'),
  'format.mjs': [
    'export function wrap(x) { return x; }',
    "export const tag = (x) => 'result:' + x;",
  ].join('\n'),
};

// ────────────────────────────────────────────────────────────
// ① 图构建：从 entry 出发 DFS，解析每个模块的依赖说明符
// ────────────────────────────────────────────────────────────
function resolveSpec(fromId, spec) {
  return posix.normalize(posix.join(posix.dirname(fromId), spec));
}

const IMPORT_RE = /^import\s+\{([^}]*)\}\s+from\s*['"]([^'"]+)['"]\s*;?\s*$/;
const EXPORT_RE = /^export\s+(function|const)\s+(\w+)/;

const graph = new Map(); // id → { imports: [{ names, spec, target }], exports: string[] }

function loadModule(id) {
  if (graph.has(id)) return;
  const node = { imports: [], exports: [] };
  graph.set(id, node);
  for (const line of SOURCES[id].split('\n')) {
    const imp = line.match(IMPORT_RE);
    if (imp) {
      const spec = imp[2];
      node.imports.push({ names: imp[1].replace(/\s+/g, ' ').trim(), spec, target: resolveSpec(id, spec) });
      loadModule(node.imports.at(-1).target);
      continue;
    }
    const exp = line.match(EXPORT_RE);
    if (exp) node.exports.push(exp[2]);
  }
}
loadModule('entry.mjs');

console.log('── [1] 模块图（DFS 发现顺序）──');
for (const [id, node] of graph) {
  if (node.imports.length === 0) {
    console.log(`  ${id}（无依赖）`);
  } else {
    for (const imp of node.imports) console.log(`  ${id} → ${imp.target}  { ${imp.names} }`);
  }
}

// ────────────────────────────────────────────────────────────
// ② 模块包装：import 行改写为 require 调用；export 前缀剥掉，
//    工厂尾部统一挂到 exports 对象上（CJS 风格的模块注册表）
// ────────────────────────────────────────────────────────────
function wrapModule(id) {
  const node = graph.get(id);
  const body = SOURCES[id]
    .split('\n')
    .map((line) => {
      const imp = line.match(IMPORT_RE);
      if (imp) return `      const { ${imp[1].replace(/\s+/g, ' ').trim()} } = require('${imp[2]}');`;
      return '      ' + line.replace(/^export\s+(function|const)\s/, '$1 ');
    });
  for (const name of node.exports) body.push(`      exports.${name} = ${name};`);
  return `    '${id}': (exports, require) => {\n${body.join('\n')}\n    },`;
}

// ────────────────────────────────────────────────────────────
// ③ 产物拼接：模块注册表 + 依赖解析表 + 带缓存的 require 微运行时
// ────────────────────────────────────────────────────────────
const deps = {};
for (const [id, node] of graph) for (const imp of node.imports) deps[`${id}|${imp.spec}`] = imp.target;

const bundle = [
  '(() => {',
  '  const modules = {',
  ...[...graph.keys()].map(wrapModule),
  '  };',
  '  const deps = ' + JSON.stringify(deps, null, 2).replace(/\n/g, '\n  ') + ';',
  '  const cache = new Map();',
  "  const require = (from, spec) => {",
  "    const id = deps[from + '|' + spec];",
  '    if (!cache.has(id)) {',
  "      cache.set(id, {});  // 先占位再执行——循环依赖时拿到「未填满」的 exports（CJS 经典陷阱）",
  '      modules[id](cache.get(id), (s) => require(id, s));',
  '    }',
  '    return cache.get(id);',
  '  };',
  "  const entryExports = {};",
  "  modules['entry.mjs'](entryExports, (s) => require('entry.mjs', s));",
  '})();',
].join('\n');

const bytes = Buffer.byteLength(bundle, 'utf8');
console.log(`── [2] 产物（IIFE 模块注册表 + 微运行时，${bytes} 字节）──`);
console.log(bundle);

console.log('── [3] new Function(bundle)() 运行产物 ──');
new Function(bundle)();
console.log(`── [4] 统计：模块 ${graph.size} 个 / 依赖边 ${Object.keys(deps).length} 条 / 产物 ${bytes} 字节 ──`);
console.log('（真实 esbuild：并行解析 + 一次 AST 往返 + Go 原生，见文件头注释与笔记 17 §5）');
