#!/usr/bin/env node
/**
 * 审计 notes/ 全部代码围栏，输出 live 转换候选清单（manifest JSON）。
 *
 * 分类规则（与 README 的单文件可运行口径一致）：
 * - js / ts 围栏且不含 Node 依赖（import/require/node:/vitest/process/Worker）→ live 候选
 * - 其余（bash / text / json / 无语言标签 / 含 Node 依赖）→ 保持静态
 *
 * 用法：node scripts/live-audit.mjs [--out manifest.json]
 * 人工核对 manifest 后再用 scripts/apply-live.mjs 应用转换。
 */
import {createWriteStream} from 'node:fs';
import {mkdir, readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const notesDir = path.join(workspace, 'notes');

const outArg = process.argv.includes('--out');
const outIndex = process.argv.indexOf('--out');
const outPath = outArg
  ? path.resolve(process.argv[outIndex + 1])
  : path.join(workspace, 'docs-site', '.live-manifest.json');

// 运行时依赖 Node 环境（模块系统 / Node API / 测试框架 / Worker），浏览器内无法求值
const NODE_DEP_RE = /^\s*import\s|^\s*import\(|\brequire\s*\(|node:|\bfrom\s+['"](?:fs|path|node|vitest|worker_threads)|\bprocess\.|\bWorker\s*\(|__dirname|@eslint\/js|\bvi\.\b|\bdescribe\s*\(|\btest\s*\(|\bit\s*\(|export\s+(?:default|const|function|class|let|var|\{|\*)/m;

// 递归遍历：笔记按阶段子目录分组（stage-0-setup … stage-5-topics），
// file 记录相对 notes/ 的路径（含子目录）
const files = (await readdir(notesDir, {recursive: true}))
  .filter((f) => f.endsWith('.md'))
  .sort();
const manifest = [];
let totalBlocks = 0;
let totalLive = 0;

for (const file of files) {
  const filePath = path.join(notesDir, file);
  const content = await readFile(filePath, 'utf8');
  const lines = content.split('\n');
  const blocks = [];

  let inFence = false;
  let fenceStart = -1;
  let fenceLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!inFence) {
        inFence = true;
        fenceStart = i;
        fenceLang = fenceMatch[2].trim().split(/\s+/)[0] ?? '';
      } else if (line.startsWith(marker) || /^[`~]{3,}\s*$/.test(line)) {
        inFence = false;
        const lang = fenceLang;
        const body = lines.slice(fenceStart + 1, i).join('\n');
        totalBlocks++;
        const isLiveCandidate =
          (lang === 'js' || lang === 'ts') && !NODE_DEP_RE.test(body);
        if (isLiveCandidate) {
          totalLive++;
          blocks.push({
            file,
            lang,
            line: fenceStart + 1, // 1-based
            bodyPreview: body.slice(0, 120).replace(/\n/g, '⏎'),
          });
        }
      }
    }
  }

  if (blocks.length > 0) {
    manifest.push({file, liveBlocks: blocks});
  }
}

await mkdir(path.dirname(outPath), {recursive: true});
const out = createWriteStream(outPath);
out.write(JSON.stringify({generatedAt: new Date().toISOString(), manifest}, null, 2));
out.end();

// 终端摘要
console.log(`审计 ${files.length} 篇笔记，共 ${totalBlocks} 个围栏，live 候选 ${totalLive} 个：\n`);
for (const {file, liveBlocks} of manifest) {
  console.log(`${file}: ${liveBlocks.length} 个`);
}
console.log(`\nmanifest → ${outPath}`);
console.log('请人工核对（重点：浏览器不可运行的块、故意演示未捕获错误的块）后再运行 apply-live.mjs');
