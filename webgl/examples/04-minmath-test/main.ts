// 04 数学库自检页：在页面打印 minmath 最小集（src/common/math.ts）的运行时断言结果。
// 对应分册：《03-第三阶段/02-数学库minmath.md》1.4（用 vitest 给矩阵运算写单元测试；
// 分册跑在 Node，本页在浏览器里跑同样的用例——数学库"纯计算、零依赖"，天然两种环境通吃）。
// 断言框架与全部用例见本目录 tests.ts。

import { groups, results } from './tests';

const main = document.querySelector('main');
let failed = 0;

for (const g of groups) {
  const before = results.length;
  g.run();
  const h2 = document.createElement('h2');
  h2.textContent = g.title;
  main?.appendChild(h2);
  const ul = document.createElement('ul');
  for (const r of results.slice(before)) {
    const li = document.createElement('li');
    li.className = r.pass ? 'pass' : 'fail';
    li.textContent = r.name + (r.pass || !r.detail ? '' : `（${r.detail}）`);
    if (!r.pass) failed++;
    ul.appendChild(li);
  }
  main?.appendChild(ul);
}

const summary = document.getElementById('summary');
if (summary) {
  summary.textContent = failed === 0
    ? `全部通过：${results.length} passed / 0 failed`
    : `存在失败：${results.length - failed} passed / ${failed} failed`;
  summary.style.color = failed === 0 ? '#4c9a63' : '#d06a6a';
}
