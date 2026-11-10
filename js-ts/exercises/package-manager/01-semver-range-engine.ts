/**
 * 大纲章节：阶段 4 包管理与 monorepo——semver：^ ~ 精确版本（笔记 20 §1）
 * 主题：手写 semver 范围判定引擎（不依赖 npm 的 semver 包）——精确版 / ^ / ~ / 比较区间，
 *       重点验证 0.x 特例（^0.2.3 不含 0.3.0——主版本位为 0 时把次版本位当「重大变更位」）
 *       手写实现附带验证：文末断言表全过才打印 PASS
 * 运行：npx tsx exercises/package-manager/01-semver-range-engine.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/package-manager/01-semver-range-engine.ts
 * 预期输出：
 *   判定表（13 例）：
 *     PASS  ^1.2.3           × 1.2.3   → true   （下界本身）
 *     PASS  ^1.2.3           × 1.9.9   → true   （次版本/补丁随便升（笔记题 1 用例））
 *     PASS  ^1.2.3           × 2.0.0   → false   （上界开区间 2.0.0）
 *     PASS  ^1.2.3           × 1.2.2   → false   （低于下界）
 *     PASS  ^0.2.3           × 0.2.9   → true   （0.x：minor 锁死，patch 放行）
 *     PASS  ^0.2.3           × 0.3.0   → false   （0.x 特例：minor 视作重大变更位（笔记题 1 用例））
 *     PASS  ^0.0.3           × 0.0.3   → true   （全 0 前缀：只剩这一个点）
 *     PASS  ^0.0.3           × 0.0.4   → false   （全 0 前缀：patch 也锁）
 *     PASS  ~1.2.3           × 1.2.9   → true   （~ 只放 patch）
 *     PASS  ~1.2.3           × 1.3.0   → false   （~ 不放 minor（笔记题 1 用例））
 *     PASS  >=1.2.3 <2.0.0   × 1.9.9   → true   （比较区间 = ^1.2.3 的展开形）
 *     PASS  1.2.3            × 1.2.3   → true   （精确版）
 *     PASS  1.2.3            × 1.2.4   → false   （精确版不放任何位）
 *   13/13 通过 ✓
 */

// ────────────────────────────────────────────────────────────
// 版本号解析：'1.2.3' → { major: 1, minor: 2, patch: 3 }
// ────────────────────────────────────────────────────────────
interface Ver {
  major: number;
  minor: number;
  patch: number;
}

function parseVer(v: string): Ver {
  const parts = v.split('.').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new Error(`bad version: ${v}`);
  }
  return { major: parts[0]!, minor: parts[1]!, patch: parts[2]! };
}

function compare(a: Ver, b: Ver): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

// ────────────────────────────────────────────────────────────
// 范围语义（对齐 npm semver 的 ^ 与 ~）：
//   1.2.3   精确匹配
//   ^1.2.3  ≥1.2.3 且 <2.0.0   （左边第一个非 0 位锁定）
//   ^0.2.3  ≥0.2.3 且 <0.3.0   （major=0 → 锁 minor；0.x 的 minor 相当于「重大变更位」）
//   ^0.0.3  ≥0.0.3 且 <0.0.4   （major、minor 都 0 → 锁 patch）
//   ~1.2.3  ≥1.2.3 且 <1.3.0   （锁 minor，只放 patch）
//   >=a <b  比较区间（Node ≤18 依赖里最常见的写法，如 ^ 的展开形）
// ────────────────────────────────────────────────────────────
function exclusiveUpper(v: Ver): Ver {
  if (v.major !== 0) return { major: v.major + 1, minor: 0, patch: 0 };
  if (v.minor !== 0) return { major: 0, minor: v.minor + 1, patch: 0 };
  return { major: 0, minor: 0, patch: v.patch + 1 };
}

function satisfies(version: string, range: string): boolean {
  const v = parseVer(version);
  if (range.startsWith('^')) {
    const lo = parseVer(range.slice(1));
    return compare(v, lo) >= 0 && compare(v, exclusiveUpper(lo)) < 0;
  }
  if (range.startsWith('~')) {
    const lo = parseVer(range.slice(1));
    return compare(v, lo) >= 0 && v.major === lo.major && v.minor === lo.minor;
  }
  if (range.startsWith('>=')) {
    // 注意解构位数：exec 结果 = [整体匹配, 下界组, 上界组]——第一坑就是少跳一位拿到下界当上界
    const m = /^>=\s*(\S+)\s*<\s*(\S+)$/.exec(range);
    if (!m) throw new Error(`unsupported range: ${range}`);
    return compare(v, parseVer(m[1]!)) >= 0 && compare(v, parseVer(m[2]!)) < 0;
  }
  return compare(v, parseVer(range)) === 0; // 精确版
}

// ────────────────────────────────────────────────────────────
// 判定表：含笔记 20 输出预测题 1 的三个用例
// ────────────────────────────────────────────────────────────
const CASES: Array<{ range: string; version: string; expect: boolean; why: string }> = [
  { range: '^1.2.3', version: '1.2.3', expect: true, why: '下界本身' },
  { range: '^1.2.3', version: '1.9.9', expect: true, why: '次版本/补丁随便升（笔记题 1 用例）' },
  { range: '^1.2.3', version: '2.0.0', expect: false, why: '上界开区间 2.0.0' },
  { range: '^1.2.3', version: '1.2.2', expect: false, why: '低于下界' },
  { range: '^0.2.3', version: '0.2.9', expect: true, why: '0.x：minor 锁死，patch 放行' },
  { range: '^0.2.3', version: '0.3.0', expect: false, why: '0.x 特例：minor 视作重大变更位（笔记题 1 用例）' },
  { range: '^0.0.3', version: '0.0.3', expect: true, why: '全 0 前缀：只剩这一个点' },
  { range: '^0.0.3', version: '0.0.4', expect: false, why: '全 0 前缀：patch 也锁' },
  { range: '~1.2.3', version: '1.2.9', expect: true, why: '~ 只放 patch' },
  { range: '~1.2.3', version: '1.3.0', expect: false, why: '~ 不放 minor（笔记题 1 用例）' },
  { range: '>=1.2.3 <2.0.0', version: '1.9.9', expect: true, why: '比较区间 = ^1.2.3 的展开形' },
  { range: '1.2.3', version: '1.2.3', expect: true, why: '精确版' },
  { range: '1.2.3', version: '1.2.4', expect: false, why: '精确版不放任何位' },
];

console.log(`判定表（${CASES.length} 例）：`);
let pass = 0;
for (const c of CASES) {
  const got = satisfies(c.version, c.range);
  const ok = got === c.expect;
  if (ok) pass++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${c.range.padEnd(16)} × ${c.version.padEnd(7)} → ${got}   （${c.why}）`);
}
console.log(`\n${pass}/${CASES.length} 通过 ${pass === CASES.length ? '✓' : '✗（有 FAIL，引擎有 bug）'}`);
