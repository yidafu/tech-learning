/**
 * Prolog 演练场：事实 + 规则 + 查询的最小逻辑式语言。
 * 核心是两个算法：合一（unification，带 occurs check）与
 * 深度优先回溯搜索（SLD 树）。
 */

export class PrologError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrologError';
  }
}

let varCounter = 0; // 每个变量出现都是独立实体（靠 id 区分）

// ---- 词法 ----

const OP_PREC = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  mod: 2,
  '=': 0,
  '<': 0,
  '>': 0,
  '=<': 0,
  '>=': 0,
  '=:=': 0,
  '=/=': 0,
  is: 0,
};
const isOp = (t) => t !== undefined && Object.prototype.hasOwnProperty.call(OP_PREC, t);

function tokenize(src) {
  const noComments = src.replace(/%[^\n]*/g, '');
  return (
    noComments.match(
      /\?-|:-|=<|>=|=:=|=\/=|\d+|[a-z][A-Za-z0-9_]*|[A-Z_][A-Za-z0-9_]*|[(),.|\[\]+\-*/=<>]/g,
    ) ?? []
  );
}

// ---- 项：v 变量 / n 数字 / a 原子 / c 复合项（列表是 '.'/2 的 cons 链） ----

function makeVar(name) {
  const id = varCounter++;
  return { t: 'v', id, name: name === '_' ? `_G${id}` : name };
}

function parseProgram(src) {
  const tokens = tokenize(src);
  let pos = 0;
  let scope = null; // 子句级变量作用域：同名变量 = 同一个变量
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const expect = (tok) => {
    const x = next();
    if (x !== tok) throw new PrologError(`期望「${tok}」，收到「${x ?? '输入结束'}」`);
  };
  const getVar = (name) => {
    if (name === '_') return makeVar(name); // 匿名变量：每次出现都是新的
    if (!scope.has(name)) scope.set(name, makeVar(name));
    return scope.get(name);
  };

  function primary() {
    const t = peek();
    if (t === '(') {
      next();
      const e = expr(0);
      expect(')');
      return e;
    }
    if (t === '[') {
      next();
      return list();
    }
    next();
    if (t === undefined) throw new PrologError('项意外结束');
    if (/^\d+$/.test(t)) return { t: 'n', v: Number(t) };
    if (/^[A-Z_]/.test(t)) return getVar(t);
    if (/^[a-z]/.test(t)) {
      if (peek() === '(') {
        next();
        const args = [term()];
        while (peek() === ',') {
          next();
          args.push(term());
        }
        expect(')');
        return { t: 'c', name: t, args };
      }
      return { t: 'a', name: t };
    }
    if (isOp(t)) return { t: 'a', name: t };
    throw new PrologError(`无法识别的记号：${t}`);
  }

  function list() {
    // '[' 已消费
    if (peek() === ']') {
      next();
      return { t: 'a', name: '[]' };
    }
    const items = [term()];
    let tail = null;
    while (peek() === ',') {
      next();
      items.push(term());
    }
    if (peek() === '|') {
      next();
      tail = term();
    }
    expect(']');
    let result = tail ?? { t: 'a', name: '[]' };
    for (let k = items.length - 1; k >= 0; k--) {
      result = { t: 'c', name: '.', args: [items[k], result] };
    }
    return result;
  }

  // 运算符优先级爬升：比较/is (0) < 加减 (1) < 乘除 mod (2)
  function expr(minPrec) {
    let left = primary();
    while (true) {
      const op = peek();
      if (!isOp(op)) break;
      const prec = OP_PREC[op];
      if (prec < minPrec) break;
      next();
      const right = expr(prec + 1);
      left = { t: 'c', name: op, args: [left, right] };
    }
    return left;
  }

  function term() {
    return expr(0);
  }

  function goal() {
    const g = term();
    if (g.t === 'n') throw new PrologError('数字不能作为目标');
    if (g.t === 'v') throw new PrologError('目标不能是变量');
    return g;
  }

  const clauses = [];
  const queries = [];
  while (pos < tokens.length) {
    if (peek() === '?-') {
      next();
      scope = new Map(); // 每个查询独立作用域
      const goals = [goal()];
      while (peek() === ',') {
        next();
        goals.push(goal());
      }
      expect('.');
      queries.push(goals);
    } else {
      scope = new Map(); // 每个子句独立作用域：头与体里的同名变量是同一个
      const head = goal();
      let body = [];
      if (peek() === ':-') {
        next();
        body = [goal()];
        while (peek() === ',') {
          next();
          body.push(goal());
        }
      }
      expect('.');
      clauses.push({ head, body });
    }
  }
  return { clauses, queries };
}

// ---- 合一：替换表 s: varId → 项 ----

function walk(t, s) {
  while (t.t === 'v') {
    const b = s.get(t.id);
    if (b === undefined) return t;
    t = b;
  }
  return t;
}

function occurs(v, t, s) {
  t = walk(t, s);
  if (t.t === 'v') return t.id === v.id;
  if (t.t === 'c') return t.args.some((a) => occurs(v, a, s));
  return false;
}

function unify(a, b, s) {
  a = walk(a, s);
  b = walk(b, s);
  if (a.t === 'v' && b.t === 'v' && a.id === b.id) return s;
  if (a.t === 'v') {
    if (occurs(a, b, s)) return null; // occurs check：拒绝无限项
    const s2 = new Map(s);
    s2.set(a.id, b);
    return s2;
  }
  if (b.t === 'v') return unify(b, a, s);
  if (a.t === 'n' && b.t === 'n') return a.v === b.v ? s : null;
  if (a.t === 'a' && b.t === 'a') return a.name === b.name ? s : null;
  if (a.t === 'c' && b.t === 'c' && a.name === b.name && a.args.length === b.args.length) {
    let r = s;
    for (let i = 0; i < a.args.length; i++) {
      r = unify(a.args[i], b.args[i], r);
      if (!r) return null;
    }
    return r;
  }
  return null;
}

function subst(t, s) {
  const w = walk(t, s);
  if (w.t === 'c') return { ...w, args: w.args.map((a) => subst(a, s)) };
  return w;
}

// 规则每次使用前 α-改名：变量是新的，名字沿用（显示友好）
function renameClause(clause) {
  const map = new Map();
  const r = (t) => {
    if (t.t === 'v') {
      if (!map.has(t.id)) map.set(t.id, { t: 'v', id: varCounter++, name: t.name });
      return map.get(t.id);
    }
    if (t.t === 'c') return { ...t, args: t.args.map(r) };
    return t;
  };
  return { head: r(clause.head), body: clause.body.map(r) };
}

// ---- 求解：深度优先 + 回溯，枚举全部解 ----

function evalArith(t, s) {
  const w = subst(t, s);
  if (w.t === 'n') return w.v;
  if (w.t === 'c' && ['+', '-', '*', '/', 'mod'].includes(w.name)) {
    const a = evalArith(w.args[0], s);
    const b = evalArith(w.args[1], s);
    switch (w.name) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        if (b === 0) throw new PrologError('除数为零');
        return Math.trunc(a / b);
      default:
        if (b === 0) throw new PrologError('除数为零');
        return ((a % b) + b) % b;
    }
  }
  throw new PrologError(`is 的右端必须是算术表达式（遇到 ${termStr(w)}）`);
}

function solve(goals, clauses, s, ctx) {
  if (ctx.steps++ > 100000) throw new PrologError('搜索步数超限（程序可能无限递归）');
  if (goals.length === 0) {
    ctx.onSolution(s);
    return;
  }
  const [g, ...rest] = goals;
  const gw = subst(g, s);

  if (gw.t === 'a') {
    if (gw.name === 'true') return solve(rest, clauses, s, ctx);
    if (gw.name === 'fail') return; // fail：强制失败 → 触发回溯
  }

  if (gw.t === 'c') {
    if (gw.name === '=' && gw.args.length === 2) {
      const s2 = unify(gw.args[0], gw.args[1], s);
      if (s2) solve(rest, clauses, s2, ctx);
      return;
    }
    if (gw.name === 'is' && gw.args.length === 2) {
      const value = evalArith(gw.args[1], s);
      const s2 = unify(gw.args[0], { t: 'n', v: value }, s);
      if (s2) solve(rest, clauses, s2, ctx);
      return;
    }
    if (['<', '>', '=<', '>=', '=:=' , '=/='].includes(gw.name) && gw.args.length === 2) {
      const a = evalArith(gw.args[0], s);
      const b = evalArith(gw.args[1], s);
      const ok =
        gw.name === '<' ? a < b
        : gw.name === '>' ? a > b
        : gw.name === '=<' ? a <= b
        : gw.name === '>=' ? a >= b
        : gw.name === '=:=' ? a === b
        : a !== b;
      if (ok) solve(rest, clauses, s, ctx);
      return;
    }
  }

  // 用户定义的过程
  let any = false;
  for (const clause of clauses) {
    const headMatches =
      clause.head.t === 'c' && gw.t === 'c'
        ? clause.head.name === gw.name && clause.head.args.length === gw.args.length
        : clause.head.t === 'a' && gw.t === 'a' && clause.head.name === gw.name;
    if (!headMatches) continue;
    any = true;
    const { head, body } = renameClause(clause);
    const s2 = unify(gw, head, s);
    if (s2) solve([...body, ...rest], clauses, s2, ctx); // 失败会自然回溯到下一个子句
  }
  if (!any) {
    const name = gw.t === 'c' ? `${gw.name}/${gw.args.length}` : `${gw.name}/0`;
    throw new PrologError(`未定义的过程：${name}`);
  }
}

// ---- 打印 ----

function termStr(t) {
  if (t.t === 'v') return t.name.startsWith('_G') ? '_' : t.name;
  if (t.t === 'n') return String(t.v);
  if (t.t === 'a') return t.name;
  if (t.name === '.' && t.args.length === 2) {
    const items = [];
    let cur = t;
    while (cur.t === 'c' && cur.name === '.' && cur.args.length === 2) {
      items.push(termStr(cur.args[0]));
      cur = cur.args[1];
    }
    if (cur.t === 'a' && cur.name === '[]') return `[${items.join(', ')}]`;
    return `[${items.join(', ')} | ${termStr(cur)}]`;
  }
  return `${t.name}(${t.args.map(termStr).join(', ')})`;
}

function collectVars(t, seen, acc) {
  if (t.t === 'v') {
    if (!t.name.startsWith('_') && !seen.has(t.name)) {
      seen.add(t.name);
      acc.push(t);
    }
  } else if (t.t === 'c') {
    for (const a of t.args) collectVars(a, seen, acc);
  }
}

// ---- 入口 ----

export function run(code, out) {
  const { clauses, queries } = parseProgram(code);
  if (!queries.length) throw new PrologError('缺少查询（用 ?- goal. 结尾）');

  for (const goals of queries) {
    out(`?- ${goals.map(termStr).join(', ')}.`);
    const qvars = [];
    collectVars({ t: 'c', name: ',', args: goals }, new Set(), qvars);

    let total = 0;
    const rendered = []; // 只渲染前 10 个解
    const ctx = {
      steps: 0,
      onSolution(s) {
        total++;
        if (rendered.length >= 10) return;
        rendered.push(
          qvars.length === 0
            ? 'true' // 无变量查询：只报告成立与否
            : qvars.map((v) => `${v.name} = ${termStr(subst(v, s))}`).join(', '),
        );
      },
    };
    solve(goals, clauses, new Map(), ctx);

    if (total === 0) {
      out('false.');
    } else {
      rendered.forEach((line, i) => {
        const suffix = i === rendered.length - 1 ? ' .' : ' ;';
        out(line + suffix);
      });
      if (total > rendered.length) out(`……（共 ${total} 个解，仅显示前 10 个）`);
    }
    out('');
  }
}

// ---- 页面元信息与示例 ----

export default {
  key: 'prolog',
  run,
  title: 'Prolog · 合一与回溯',
  tagline: '只写「什么是真的」，不写「怎么算」：事实 + 规则 + 查询，引擎负责合一与回溯搜索。',
  docSlug: 'Prolog合一与回溯',
  cheatsheet: [
    'parent(tom, bob). 事实；h :- g1, g2. 规则（h 成立若 g1 且 g2 成立）',
    '?- grandparent(tom, X). 查询，X 大写开头是变量，_ 是匿名变量',
    '列表 [1,2,3] 与 [H|T]（头尾拆接）；X = 项 做合一',
    'X is 算术表达式 求值；比较 < > =< >=；true/fail 控制回溯；% 注释',
  ],
  examples: [
    {
      name: '家谱推理',
      code: `% 事实：谁是准的父母
parent(tom, bob).
parent(tom, liz).
parent(bob, ann).
parent(bob, pat).
parent(pat, jim).

% 规则：X 是 Z 的祖父母，若存在 Y 使 X 是 Y 的父母且 Y 是 Z 的父母
grandparent(X, Z) :- parent(X, Y), parent(Y, Z).

% 祖先 = 父母，或父母的祖先（递归规则）
ancestor(X, Y) :- parent(X, Y).
ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).

?- grandparent(tom, Who).
?- ancestor(tom, Who).
`,
    },
    {
      name: 'append/3 双向',
      code: `% append(Xs, Ys, Zs)：Zs 是 Xs 与 Ys 的拼接
append([], L, L).
append([H | T], L, [H | R]) :- append(T, L, R).

member(X, [X | _]).
member(X, [_ | T]) :- member(X, T).

?- append([1, 2], [3, 4], Zs).   % 正向：拼接结果
?- append(Xs, Ys, [1, 2]).       % 反向：枚举所有拆法
?- member(Who, [tom, bob, pat]).
`,
    },
    {
      name: '算术与递归',
      code: `% 阶乘：N > 0 是 guards，is 才真正求值
factorial(0, 1).
factorial(N, F) :-
  N > 0,
  N1 is N - 1,
  factorial(N1, F1),
  F is N * F1.

?- factorial(10, F).

% 数列求和
sumto(0, 0).
sumto(N, S) :- N > 0, N1 is N - 1, sumto(N1, S1), S is N + S1.
?- sumto(100, S).
`,
    },
    {
      name: '图上搜索',
      code: `edge(a, b).
edge(b, c).
edge(c, d).
edge(b, d).

path(X, Y) :- edge(X, Y).
path(X, Y) :- edge(X, Z), path(Z, Y).

?- path(a, Y).      % 从 a 出发可达谁？
`,
    },
  ],
};
