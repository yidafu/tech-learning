/**
 * λ 演算演练场：α/β-归约的小步语义归约器。
 * 支持：λx. t（\x. t 亦可）、应用左结合、名字 = 项; 的元级定义、
 * 数字字面量自动展开为 Church 数、正则序 / 应用序两种策略（首行注释切换）。
 */

export class LambdaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LambdaError';
  }
}

let freshCounter = 0;

// ---- 词法与语法 ----

function tokenize(src) {
  // 整行注释（; 开头）先剥掉；行内的 ; 是定义分隔符，不剥
  const noComments = src.replace(/^[ \t]*;.*$/gm, '');
  return noComments.match(/λ|\\|[().=;]|[A-Za-z_][A-Za-z0-9_']*|\d+/g) ?? [];
}

// n = λf. λx. f (f … (f x))  —— f 出现 n 次
function church(n) {
  let body = { k: 'v', n: 'x' };
  for (let i = 0; i < n; i++) body = { k: 'app', f: { k: 'v', n: 'f' }, x: body };
  return { k: 'l', a: 'f', b: { k: 'l', a: 'x', b: body } };
}

function parseProgram(src) {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = (offset = 0) => tokens[pos + offset];
  const next = () => tokens[pos++];
  const expect = (tok) => {
    const x = next();
    if (x !== tok) throw new LambdaError(`期望「${tok}」，收到「${x ?? '输入结束'}」`);
  };

  function atom() {
    const t = next();
    if (t === undefined) throw new LambdaError('表达式意外结束');
    if (t === '(') {
      const e = expr();
      expect(')');
      return e;
    }
    if (/^\d+$/.test(t)) return church(Number(t));
    if (/^[A-Za-z_]/.test(t)) return { k: 'v', n: t };
    throw new LambdaError(`无法识别的记号：${t}`);
  }

  function appSeq() {
    let left = atom();
    while (peek() !== undefined && /^[A-Za-z_(\d]/.test(peek())) {
      left = { k: 'app', f: left, x: atom() }; // 应用左结合
    }
    return left;
  }

  function expr() {
    if (peek() === 'λ' || peek() === '\\') {
      next();
      const args = [];
      while (peek() !== undefined && /^[A-Za-z_]/.test(peek())) args.push(next());
      if (!args.length) throw new LambdaError('λ 后面需要至少一个参数名');
      expect('.');
      let body = expr(); // λ 体向右延伸到尽头
      for (let i = args.length - 1; i >= 0; i--) body = { k: 'l', a: args[i], b: body };
      return body;
    }
    return appSeq();
  }

  const defs = [];
  let finalTerm = null;
  while (pos < tokens.length) {
    if (finalTerm !== null) throw new LambdaError('定义之后应恰好有一个待求值表达式');
    if (/^[A-Za-z_]/.test(peek()) && peek(1) === '=') {
      const name = next();
      next(); // '='
      const body = expr();
      expect(';');
      defs.push([name, body]);
    } else {
      finalTerm = expr();
    }
  }
  if (finalTerm === null) throw new LambdaError('缺少待求值的表达式');
  return { defs, term: finalTerm };
}

// ---- 替换：带捕获避免（先 α-改名再代入） ----

function freeVars(t, acc = new Set()) {
  if (t.k === 'v') acc.add(t.n);
  else if (t.k === 'l') {
    const inner = freeVars(t.b, new Set());
    inner.delete(t.a);
    for (const v of inner) acc.add(v);
  } else {
    freeVars(t.f, acc);
    freeVars(t.x, acc);
  }
  return acc;
}

function subst(t, name, val) {
  if (t.k === 'v') return t.n === name ? val : t;
  if (t.k === 'app') return { k: 'app', f: subst(t.f, name, val), x: subst(t.x, name, val) };
  // λ：参数遮蔽则不动；val 的自由变量撞上绑定名时先 α-改名
  if (t.a === name) return t;
  if (freeVars(val).has(t.a)) {
    const freshArg = `_r${freshCounter++}`;
    const renamed = subst(t.b, t.a, { k: 'v', n: freshArg });
    return { k: 'l', a: freshArg, b: subst(renamed, name, val) };
  }
  return { k: 'l', a: t.a, b: subst(t.b, name, val) };
}

// ---- 小步归约 ----

function stepNormal(t) {
  // 正则序：最外、最左的 redex 先归约
  if (t.k === 'app') {
    if (t.f.k === 'l') return subst(t.f.b, t.f.a, t.x); // β
    const f = stepNormal(t.f);
    if (f) return { ...t, f };
    const x = stepNormal(t.x);
    if (x) return { ...t, x };
    return null;
  }
  if (t.k === 'l') {
    const b = stepNormal(t.b);
    return b && { ...t, b };
  }
  return null;
}

function stepApplicative(t) {
  // 应用序：先把函数部、参数部归约到底，再 β
  if (t.k === 'app') {
    const f = stepApplicative(t.f);
    if (f) return { ...t, f };
    const x = stepApplicative(t.x);
    if (x) return { ...t, x };
    if (t.f.k === 'l') return subst(t.f.b, t.f.a, t.x);
    return null;
  }
  if (t.k === 'l') {
    const b = stepApplicative(t.b);
    return b && { ...t, b };
  }
  return null;
}

// ---- 打印与 Church 数识别 ----

function fmt(t, argPos = false) {
  if (t.k === 'v') return t.n;
  if (t.k === 'app') {
    const s = `${fmt(t.f, t.f.k === 'l')} ${fmt(t.x, t.x.k !== 'v')}`;
    return argPos ? `(${s})` : s; // 处于操作数位置的应用要加括号
  }
  const s = `λ${t.a}. ${fmt(t.b)}`;
  return argPos ? `(${s})` : s;
}

function churchToInt(t) {
  if (t.k !== 'l') return null;
  const f = t.a;
  const body1 = t.b;
  if (body1.k !== 'l') return null;
  const x = body1.a;
  let cur = body1.b;
  let n = 0;
  while (cur.k === 'app') {
    if (cur.f.k !== 'v' || cur.f.n !== f) return null;
    n++;
    cur = cur.x;
  }
  return cur.k === 'v' && cur.n === x ? n : null;
}

const clip = (s) => (s.length > 200 ? `${s.slice(0, 200)} …` : s);

// ---- 入口 ----

export function run(code, out) {
  const firstComment = code.match(/^[ \t]*;.*$/m)?.[0] ?? '';
  const strategy = firstComment.includes('应用序') ? 'applicative' : 'normal';
  const { defs, term } = parseProgram(code);

  // 元级定义：按序展开（后定义可用先定义的）
  const expanded = new Map();
  for (const [name, body] of defs) {
    let b = body;
    for (const [prevName, prevBody] of expanded) b = subst(b, prevName, prevBody);
    expanded.set(name, b);
  }
  let t = term;
  for (const [name, body] of expanded) t = subst(t, name, body);

  const step = strategy === 'applicative' ? stepApplicative : stepNormal;
  out(`策略：${strategy === 'applicative' ? '应用序（最内先归约）' : '正则序（最外先归约）'}`);
  out(`  0. ${clip(fmt(t))}`);

  let n = 0;
  while (n < 300) {
    const nextStep = step(t);
    if (!nextStep) break;
    t = nextStep;
    n++;
    out(`${String(n).padStart(3)}. ${clip(fmt(t))}`);
  }

  if (step(t) === null) {
    const asInt = churchToInt(t);
    out(`✓ 范式（${n} 步）${asInt !== null ? `，即 Church 数 ${asInt}` : ''}`);
  } else {
    out(`⚠ ${n} 步后仍未归约——可能没有范式（如 Ω）`);
  }
}

// ---- 页面元信息与示例 ----

export default {
  key: 'lambda',
  run,
  title: 'λ 演算 · 归约器',
  tagline: '三条语法、两条规则：函数抽象与应用。看 Church 编码怎么用最原始的材料搭出布尔、数与递归。',
  docSlug: 'Lambda演算归约器',
  cheatsheet: [
    'λx. t 定义函数（\\x. t 一样）；应用左结合：f a b = (f a) b',
    '名字 = 项; 定义缩写（分号结尾）；数字字面量自动展开为 Church 数',
    '输出每步 β-归约；若结果是 Church 数会标注出来',
    '第一行注释写「; 应用序」切换为应用序（默认正则序）；行内 ; 是定义分隔符',
  ],
  examples: [
    {
      name: '布尔与条件',
      code: `; true = 二元选择器的第一分支
TRUE = λt. λf. t;
FALSE = λt. λf. f;
NOT = λa. a FALSE TRUE;
AND = λa. λb. a b FALSE;
OR = λa. λb. a TRUE b;

AND TRUE FALSE
; 结果 λt.λf.f 会被识别成 Church 0——FALSE ≡ 0，同一个项
; 再试试 OR FALSE TRUE、NOT TRUE
`,
    },
    {
      name: 'Church 数',
      code: `; 数字 n = 把 f 叠 n 次：2 = λf. λx. f (f x)
SUCC = λn. λf. λx. f (n f x);
ADD = λm. λn. λf. λx. m f (n f x);
MUL = λm. λn. λf. m (n f);

ADD 2 3
; 换成 MUL 2 3、SUCC 10 试试
`,
    },
    {
      name: '配对子',
      code: `; 先备好布尔选择器
TRUE = λt. λf. t;
FALSE = λt. λf. f;
PAIR = λa. λb. λsel. sel a b;
FST = λp. p TRUE;
SND = λp. p FALSE;

FST (PAIR 1 2)
; 再试试 SND (PAIR 1 2)
`,
    },
    {
      name: 'Y 组合子',
      code: `; 不动点组合子：Y g ⇒* g (Y g)，递归在纯 λ 演算里的化身
Y = λg. (λx. g (x x)) (λx. g (x x));

; 正则序下 Y g 一步展开为 g (Y g)，再展开……永不停止
Y g
`,
    },
    {
      name: '正则序的救命',
      code: `; (λx. 0) Ω：参数永远算不出来，但正则序直接丢掉参数
OMEGA = (λx. x x) (λx. x x);

(λx. 0) OMEGA
; 把首行注释改成「; 应用序」再看：应用序先算参数，永远出不去
`,
    },
    {
      name: '应用序：发散',
      code: `; 应用序
OMEGA = (λx. x x) (λx. x x);

(λx. 0) OMEGA
; 同样的表达式，应用序卡死在参数上——策略即语义
`,
    },
  ],
};
