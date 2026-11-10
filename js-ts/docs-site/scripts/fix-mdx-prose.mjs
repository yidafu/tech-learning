#!/usr/bin/env node
/**
 * 把开启 mdx: { format: mdx } 的笔记正文修成 MDX 兼容写法（只动散文，不动围栏与行内代码）：
 * 1. autolink `<https://…>` → `[https://…](https://…)`（MDX 不支持 CommonMark autolink，转为普通链接）
 * 2. 其余裸 `<` + 字母///$ → `&lt;`（防御性；核对过正文只有 autolink 与合法的 <details>/<summary> JSX）
 * 3. 散文裸 `{` / `}` → `\{` / `\}`（MDX 会把花括号当表达式解析）
 *
 * 用法：node scripts/fix-mdx-prose.mjs   （幂等：已转义/已转换的不再处理）
 */
import {readFile, writeFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const notesDir = path.join(workspace, 'notes');

// 递归遍历阶段子目录（stage-0-setup … stage-5-topics）
const files = (await readdir(notesDir, {recursive: true}))
  .filter((f) => f.endsWith('.md'))
  .sort();

/** 把一行拆成 [文本段, 行内代码段, 文本段, …]；未闭合的反引号 run 之后按文本处理 */
function splitInlineCode(line) {
  const segments = [];
  let cursor = 0;
  let lastRun = null;
  const re = /`+/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    if (lastRun === null) {
      segments.push({kind: 'text', text: line.slice(cursor, m.index)});
      lastRun = {start: m.index, len: m[0].length};
    } else if (m[0].length === lastRun.len) {
      segments.push({kind: 'code', text: line.slice(lastRun.start, m.index + m[0].length)});
      cursor = m.index + m[0].length;
      lastRun = null;
    }
    // 长度不同的 run 不配对，继续找
  }
  segments.push({kind: 'text', text: line.slice(lastRun === null ? cursor : lastRun.start)});
  return segments;
}

function fixTextSegment(text) {
  let out = text.replace(/<(https?:\/\/[^>\s]+)>/g, '[$1]($1)');
  // <字母/数字/$/_//!? 均会被 MDX 当 JSX 起始解析（<4ms 这类数字开头也报错）
  out = out.replace(/<([A-Za-z0-9_$/!][^\s<>`]*)/g, '&lt;$1');
  // 收敛式转义（幂等）：任何「反斜杠* + 花括号」归一为 \{ / \}
  out = out.replace(/\\*\{/g, '\\{').replace(/\\*\}/g, '\\}');
  return out;
}

let changedFiles = 0;
let fixCount = 0;

for (const file of files) {
  const filePath = path.join(notesDir, file);
  let content = await readFile(filePath, 'utf8');
  const lines = content.split('\n');

  // 仅处理带 mdx front matter 的笔记
  const hasMdx = lines[0] === '---' && lines[1] === 'mdx:' && lines[2] === '  format: mdx';
  if (!hasMdx) continue;

  let inFence = false;
  let fileChanged = false;
  const startIdx = lines.findIndex((l, i) => i > 0 && l === '---') + 1; // front matter 结束行之后

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const segments = splitInlineCode(line);
    let changed = false;
    const fixed = segments
      .map((seg) => {
        if (seg.kind !== 'text') return seg.text;
        const next = fixTextSegment(seg.text);
        if (next !== seg.text) {
          changed = true;
          fixCount++;
        }
        return next;
      })
      .join('');
    if (changed) {
      lines[i] = fixed;
      fileChanged = true;
    }
  }

  if (fileChanged) {
    await writeFile(filePath, lines.join('\n'));
    changedFiles++;
  }
}

console.log(`✔ 修复 ${fixCount} 处，涉及 ${changedFiles} 篇笔记`);
