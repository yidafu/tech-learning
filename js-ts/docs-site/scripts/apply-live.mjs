#!/usr/bin/env node
/**
 * 按 manifest 把 js / ts 围栏批量转为 live 围栏：
 *   ```js   →  ```js live noInline
 *   ```ts   →  ```ts live noInline
 * 并给入选笔记头部加 front matter：mdx: { format: mdx }（live 围栏仅在 MDX 编译路径生效）。
 *
 * 排除清单来自人工核对（live-audit.mjs 之后）：
 * - 引用笔记其他代码块 / 练习文件的名字，运行立即 ReferenceError（如 Stack、MyPromise、throttle、nodes）
 * - 伪代码 / 纯类型展示块（如 19 的 eslint 片段、11 L441 的答案类型、31 L100 的旧写法对比）
 * - 浏览器无法代表的环境（06 gc/DOM 挂载、28 ESM 模式差异）
 * - 仅注释无代码的块（04 L151）
 *
 * 用法：node scripts/apply-live.mjs [--revert]
 * 幂等：已是 live 的围栏跳过；--revert 恢复全部 live 围栏为普通围栏并移除 front matter。
 */
import {readFile, writeFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const notesDir = path.join(workspace, 'notes');
const manifestPath = path.join(workspace, 'docs-site', '.live-manifest.json');

const revert = process.argv.includes('--revert');

// { '相对 notes/ 的路径': [1-based 行号] } —— 与 .live-manifest.json 对应，人工核对后定稿
const EXCLUSIONS = {
  'stage-1-js-core/04-async-programming.md': [155], // 仅注释，无代码
  'stage-1-js-core/06-memory-management.md': [133, 220], // 需真实 DOM(#go) / gc()，浏览器内必然报错
  'stage-2-engine-runtime/08-render-and-performance.md': [42, 54, 274], // nodes / throttle 来自外部上下文
  'stage-3-ts-types/10-ts-generics.md': [200], // Stack 定义在另一个代码块
  'stage-3-ts-types/11-ts-type-programming.md': [445], // 答案中的类型展示块，非可运行代码
  'stage-4-engineering/19-code-quality-eslint-prettier.md': [86, 173], // eslint 规则片段 / 伪代码（{ ... }）
  'stage-5-topics/21-functional-programming.md': [103], // pipe/upper/exclaim 定义在其他块
  'stage-5-topics/23-reactivity-source-reading.md': [194, 214], // reactive/effect/computed 定义在其他块
  'stage-1-js-core/25-milestone-implementations.md': [223], // MyPromise 是练习文件里的实现
  'stage-5-topics/27-weird-behaviors-by-stage.md': [103], // varFns/letFns 未定义
  'stage-5-topics/28-js-ts-history.md': [253], // 演示 ESM 严格模式，浏览器 live 块（sloppy）无法代表
  'stage-1-js-core/31-async-supplement.md': [104, 116], // 旧写法对比伪代码（重复声明）/ AsyncDisposable 需 esnext lib
};

const FRONT_MATTER = ['---', 'mdx:', '  format: mdx', '---', ''].join('\n');

const {manifest} = JSON.parse(await readFile(manifestPath, 'utf8'));

const targetsByFile = new Map();
let liveCount = 0;
for (const {file, liveBlocks} of manifest) {
  const excluded = new Set(EXCLUSIONS[file] ?? []);
  const targets = liveBlocks.filter((b) => !excluded.has(b.line));
  if (targets.length > 0) {
    targetsByFile.set(file, targets);
    liveCount += targets.length;
  }
}
const unresolvedExclusions = Object.entries(EXCLUSIONS).flatMap(([file, lines]) =>
  lines.filter((l) => {
    const entry = manifest.find((m) => m.file === file);
    return !entry || !entry.liveBlocks.some((b) => b.line === l);
  }),
);
if (unresolvedExclusions.length > 0) {
  console.warn(`⚠ 排除清单与 manifest 不一致（文件/行号不存在）: ${JSON.stringify(unresolvedExclusions)}`);
  process.exit(1);
}

// 递归遍历阶段子目录；manifest 里的 file 为相对 notes/ 的路径
const files = (await readdir(notesDir, {recursive: true}))
  .filter((f) => f.endsWith('.md'))
  .sort();
let converted = 0;
let skipped = 0;
const touchedFiles = [];

for (const file of files) {
  const filePath = path.join(notesDir, file);
  let content = await readFile(filePath, 'utf8');
  const lines = content.split('\n');
  let fileChanged = false;

  const targets = revert ? null : targetsByFile.get(file);

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(```)(\w[\w.-]*)(\s+.*)?$/);
    if (!m) continue;
    const [, fence, lang, rest = ''] = m;
    const isLive = rest.split(/\s+/).includes('live');
    const isJsTs = lang === 'js' || lang === 'ts';

    if (revert) {
      if (isLive) {
        lines[i] = `${fence}${lang}`;
        fileChanged = true;
        skipped++;
      }
      continue;
    }
    if (!isJsTs) continue;
    const isTarget = targets?.some((t) => t.line === i + 1);
    if (isTarget && !isLive) {
      lines[i] = `${fence}${lang} live noInline`;
      fileChanged = true;
      converted++;
    } else if (isTarget && isLive) {
      converted++; // 已转换（幂等重跑）
    }
  }

  // front matter：转换目标笔记必须有（live 仅 MDX 路径生效）；revert 时移除
  const needsFrontMatter = revert ? false : targetsByFile.has(file);
  const hasFrontMatter = lines[0] === '---';
  if (needsFrontMatter && !hasFrontMatter) {
    lines.unshift(...FRONT_MATTER.split('\n').filter((l, idx, arr) => !(l === '' && idx === arr.length - 1)));
    lines.push(''); // front matter 结束后留一个空行再接正文
    fileChanged = true;
  } else if (revert && hasFrontMatter && lines[1] === 'mdx:' && lines[2] === '  format: mdx') {
    lines.splice(0, 5); // --- mdx: format: mdx --- + 空行
    fileChanged = true;
  }

  if (fileChanged) {
    await writeFile(filePath, lines.join('\n'));
    touchedFiles.push(file);
  }
}

console.log(
  revert
    ? `✔ 已还原 ${skipped} 个围栏，涉及 ${touchedFiles.length} 篇`
    : `✔ 转换 ${converted} 个 live 围栏（排除 ${liveCount === 0 ? 0 : Object.values(EXCLUSIONS).flat().length} 个），涉及 ${touchedFiles.length} 篇笔记`,
);
console.log(touchedFiles.map((f) => `  - ${f}`).join('\n'));
