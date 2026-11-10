#!/usr/bin/env node
/**
 * 给 notes/ 全部笔记注入 docusaurus-graph 建边所需的 front matter references。
 *
 * 原理：docusaurus-graph 的边只来自 front matter（正文 markdown 链接不参与建边），
 * 节点 id = 文件 basename（含数字前缀，如 01-types-and-coercion）。
 * 本脚本扫描每篇笔记正文里的显式交叉引用（「笔记 NN」「笔记 NN」变体），
 * 把 NN 解析为目标文件 basename，写入/合并到该笔记的 front matter：
 *
 *   references:            # 本文 → 目标（"我引用了谁"）
 *     - 03-this-and-prototype
 *
 * 规则：
 * - 只匹配「笔记 NN」字样（NN 为两位数字），且 NN 必须存在于编号→文件映射
 * - 跳过代码围栏内的匹配（fenced code block 内不视为正文引用）
 * - 幂等：existing references 已含目标则跳过；无变化文件不重写
 * - 已有 front matter（如 mdx: { format: mdx }）的文件在原块内合并，不覆盖
 *
 * 用法：node scripts/inject-graph-refs.mjs [--dry]
 */
import {readFile, writeFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const notesDir = path.join(workspace, 'notes');

const dry = process.argv.includes('--dry');

// 笔记编号 → basename（节点 id）。新增笔记在文件名里带 NN- 前缀即自动可映射，
// 但映射表在这里显式维护，避免文件改名后图边悄悄断裂。
const NUM_TO_BASENAME = {
  '00': '00-environment-setup',
  '01': '01-types-and-coercion',
  '02': '02-scope-and-closure',
  '03': '03-this-and-prototype',
  '04': '04-async-programming',
  '05': '05-es2015-plus',
  '06': '06-memory-management',
  '07': '07-v8-engine',
  '08': '08-render-and-performance',
  '09': '09-ts-narrowing',
  '10': '10-ts-generics',
  '11': '11-ts-type-programming',
  '12': '12-ts-utility-types',
  '13': '13-ts-type-theory',
  '14': '14-ts-declarations-and-modules',
  '15': '15-tsconfig',
  '16': '16-modules-esm-cjs',
  '17': '17-build-tools',
  '18': '18-testing-vitest',
  '19': '19-code-quality-eslint-prettier',
  '20': '20-package-manager-monorepo',
  '21': '21-functional-programming',
  '22': '22-design-patterns',
  '23': '23-reactivity-source-reading',
  '24': '24-interview-prediction-questions',
  '25': '25-milestone-implementations',
  '26': '26-compiler-perspective',
  '27': '27-weird-behaviors-by-stage',
  '28': '28-js-ts-history',
  '29': '29-prototype-chain-supplement',
  '30': '30-internals-vs-mainstream',
  '31': '31-async-supplement',
};

/** 去掉代码围栏后的正文（围栏内出现的「笔记 NN」不算正文引用） */
function stripFences(text) {
  return text.replace(/^```[^]*?^```/gm, '');
}

/** 提取正文里的「笔记 NN」引用，解析为 basename 列表（去重、排除自引用） */
async function extractRefs(mdPath, selfBasename) {
  const raw = await readFile(mdPath, 'utf-8');
  const body = stripFences(raw);
  const refs = new Set();
  for (const match of body.matchAll(/笔记\s*(\d{2})/g)) {
    const target = NUM_TO_BASENAME[match[1]];
    if (target && target !== selfBasename) refs.add(target);
  }
  return [...refs];
}

/**
 * 把 references 合并进 front matter，返回新全文；无变化返回 null。
 * - 无 front matter：文件头创建 --- 块
 * - 已有：块内已有 references: 键则合并去重，否则追加键
 */
function mergeFrontMatter(text, refs) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (m) {
    const block = m[1];
    const existing = [...block.matchAll(/^\s{2}-\s(.+)$/gm)].map((x) => x[1].trim());
    // 仅当块里存在 references: 键时，其列表项才会以两空格缩进出现；
    // 为避免把其他键（如 mdx:）的列表项误当 references，显式按键定位。
    const refKeyMatch = block.match(/^references:\r?\n((?:\s{2}-\s.+\r?\n?)*)/m);
    const existingRefs = refKeyMatch
      ? [...refKeyMatch[1].matchAll(/^\s{2}-\s(.+)$/gm)].map((x) => x[1].trim())
      : [];
    const merged = [...new Set([...existingRefs, ...refs])];
    if (merged.length === existingRefs.length) return null;
    const refBlock = `references:\n${merged.map((r) => `  - ${r}`).join('\n')}\n`;
    const newBlock = refKeyMatch
      ? block.replace(refKeyMatch[0], refBlock)
      : `${block.endsWith('\n') ? block : block + '\n'}${refBlock}`;
    return text.replace(m[0], `---\n${newBlock}---\n${text.slice(m[0].length).replace(/^\r?\n/, '')}`);
  }
  const refBlock = `---\nreferences:\n${refs.map((r) => `  - ${r}`).join('\n')}\n---\n\n`;
  return refBlock + text;
}

const files = (await readdir(notesDir, {recursive: true}))
  .filter((f) => f.endsWith('.md'))
  .sort();

let changed = 0;
const report = [];
for (const rel of files) {
  const file = path.join(notesDir, rel);
  const basename = path.basename(rel, '.md');
  const refs = await extractRefs(file, basename);
  if (refs.length === 0) {
    report.push(`  = ${rel}: 无正文交叉引用`);
    continue;
  }
  const text = await readFile(file, 'utf-8');
  const next = mergeFrontMatter(text, refs);
  if (next === null) {
    report.push(`  = ${rel}: references 已含 ${refs.join(', ')}`);
    continue;
  }
  report.push(`  ~ ${rel}: + ${refs.join(', ')}`);
  if (!dry) await writeFile(file, next, 'utf-8');
  changed++;
}

console.log(report.join('\n'));
console.log(`\n${dry ? '[dry] 将修改' : '已修改'} ${changed}/${files.length} 篇笔记`);
