/**
 * Lisp 演练场：约两百行的 Scheme 方言（lispy）。
 * 语法即数据（S-表达式），核心是 eval/apply 元循环。
 * 参考：Norvig 的 lispy.py、SICP 第 4 章。
 */

export class LispError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LispError';
  }
}

class LSym {
  constructor(name) {
    this.name = name;
  }
}

// ---- 词法 + 读取：字符流 → 嵌套数组（代码与数据同构） ----

function tokenize(src) {
  const noComments = src.replace(/;[^\n]*/g, '');
  return noComments.match(/\(|\)|'|"(?:[^"\\]|\\.)*"|[^\s()'"]+/g) ?? [];
}

function atom(token) {
  if (token[0] === '"') {
    return token.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (/^[+-]?\d+(\.\d+)?$/.test(token)) return Number(token);
  return new LSym(token);
}

function parseAll(src) {
  const tokens = tokenize(src);
  const forms = [];
  let pos = 0;

  function read() {
    const t = tokens[pos++];
    if (t === undefined) throw new LispError('输入意外结束（括号未闭合？）');
    if (t === '(') {
      const list = [];
      while (true) {
        if (pos >= tokens.length) throw new LispError('缺少右括号 )');
        if (tokens[pos] === ')') {
          pos++;
          return list;
        }
        list.push(read());
      }
    }
    if (t === ')') throw new LispError('多余的右括号 )');
    if (t === "'") return [new LSym('quote'), read()]; // 'x ≡ (quote x)
    return atom(t);
  }

  while (pos < tokens.length) forms.push(read());
  return forms;
}

// ---- 环境：名字 → 值 的链 ----

class Env {
  constructor(outer) {
    this.map = new Map();
    this.outer = outer;
  }

  lookup(sym) {
    for (let e = this; e; e = e.outer) {
      if (e.map.has(sym.name)) return e.map.get(sym.name);
    }
    throw new LispError(`未定义的变量：${sym.name}`);
  }

  assign(sym, value) {
    for (let e = this; e; e = e.outer) {
      if (e.map.has(sym.name)) {
        e.map.set(sym.name, value);
        return;
      }
    }
    throw new LispError(`set! 未定义的变量：${sym.name}`);
  }
}

// ---- 闭包：函数值 = 参数 + 函数体 + 定义环境 ----

function makeClosure(params, body, env, name) {
  return { closure: true, params, body, env, name };
}

function applyFn(fn, args) {
  if (typeof fn === 'function') return fn(...args);
  if (fn && fn.closure) {
    if (args.length !== fn.params.length) {
      throw new LispError(
        `${fn.name ?? 'lambda'} 期望 ${fn.params.length} 个参数，收到 ${args.length} 个`,
      );
    }
    const env = new Env(fn.env);
    fn.params.forEach((p, i) => env.map.set(p, args[i]));
    let result = null;
    for (const form of fn.body) result = evaluate(form, env);
    return result;
  }
  throw new LispError(`不是可以调用的值：${show(fn)}`);
}

// ---- 求值器：十条规则走天下 ----

function evaluate(x, env) {
  if (x instanceof LSym) return env.lookup(x);
  if (!Array.isArray(x)) return x; // 数字 / 字符串字面量自求值
  if (x.length === 0) throw new LispError('() 不可求值');

  const [head, ...rest] = x;
  if (head instanceof LSym) {
    switch (head.name) {
      case 'quote':
        return rest[0];
      case 'if':
        return evaluate(rest[0], env) !== false
          ? evaluate(rest[1], env)
          : rest.length > 2
            ? evaluate(rest[2], env)
            : null;
      case 'define': {
        const target = rest[0];
        if (Array.isArray(target)) {
          // (define (f x y) body…) 是 (define f (lambda (x y) body…)) 的语法糖
          env.map.set(
            target[0].name,
            makeClosure(target.slice(1).map((s) => s.name), rest.slice(1), env, target[0].name),
          );
        } else {
          env.map.set(target.name, evaluate(rest[1], env));
        }
        return null;
      }
      case 'set!':
        env.assign(rest[0], evaluate(rest[1], env));
        return null;
      case 'lambda':
        return makeClosure(rest[0].map((s) => s.name), rest.slice(1), env);
      case 'begin': {
        let v = null;
        for (const form of rest) v = evaluate(form, env);
        return v;
      }
      case 'let': {
        // let 是 lambda 的语法糖：((lambda (vars…) body…) vals…)
        const bindings = rest[0];
        const fn = makeClosure(
          bindings.map((b) => b[0].name),
          rest.slice(1),
          env,
        );
        return applyFn(fn, bindings.map((b) => evaluate(b[1], env)));
      }
      default:
        break; // 普通函数应用
    }
  }
  return applyFn(evaluate(head, env), rest.map((a) => evaluate(a, env)));
}

// ---- 打印 ----

function show(v, display = false) {
  if (v === true) return '#t';
  if (v === false) return '#f';
  if (v === null || v === undefined) return '#<void>';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return display ? v : `"${v}"`;
  if (v instanceof LSym) return v.name;
  if (Array.isArray(v)) return `(${v.map((x) => show(x)).join(' ')})`;
  if (v && v.closure) return v.name ? `<procedure ${v.name}>` : '<procedure>';
  if (typeof v === 'function') return '<builtin>';
  return String(v);
}

// ---- 内建库 ----

function globalEnv(out) {
  const env = new Env(null);
  const d = env.map;
  d.set('+', (...xs) => xs.reduce((a, b) => a + b));
  d.set('-', (a, ...xs) => (xs.length ? xs.reduce((r, x) => r - x, a) : -a));
  d.set('*', (...xs) => xs.reduce((a, b) => a * b));
  d.set('/', (a, b) => {
    if (b === 0) throw new LispError('除数为零');
    return a / b;
  });
  d.set('modulo', (a, b) => {
    if (b === 0) throw new LispError('除数为零');
    return ((a % b) + b) % b;
  });
  d.set('=', (a, b) => a === b);
  d.set('<', (a, b) => a < b);
  d.set('>', (a, b) => a > b);
  d.set('<=', (a, b) => a <= b);
  d.set('>=', (a, b) => a >= b);
  d.set('not', (a) => a === false);
  d.set('abs', Math.abs);
  d.set('min', (...xs) => Math.min(...xs));
  d.set('max', (...xs) => Math.max(...xs));
  d.set('list', (...xs) => xs);
  d.set('cons', (a, l) => [a, ...l]); // 约定：cons 用于列表头插
  d.set('car', (l) => {
    if (!Array.isArray(l) || l.length === 0) throw new LispError('car: 空表');
    return l[0];
  });
  d.set('cdr', (l) => {
    if (!Array.isArray(l) || l.length === 0) throw new LispError('cdr: 空表');
    return l.slice(1);
  });
  d.set('length', (l) => l.length);
  d.set('append', (a, b) => [...a, ...b]);
  d.set('reverse', (l) => [...l].reverse());
  d.set('null?', (l) => Array.isArray(l) && l.length === 0);
  d.set('pair?', (v) => Array.isArray(v) && v.length > 0);
  d.set('number?', (v) => typeof v === 'number');
  d.set('symbol?', (v) => v instanceof LSym);
  d.set('string?', (v) => typeof v === 'string');
  d.set('eq?', (a, b) => a === b || (a instanceof LSym && b instanceof LSym && a.name === b.name));
  d.set('equal?', function eq(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((x, i) => eq(x, b[i]));
    }
    if (a instanceof LSym && b instanceof LSym) return a.name === b.name;
    return a === b;
  });
  d.set('print', (v) => {
    out(show(v, true));
    return null;
  });
  d.set('map', (f, l) => l.map((v) => applyFn(f, [v])));
  d.set('filter', (f, l) => l.filter((v) => applyFn(f, [v]) !== false));
  d.set('reduce', (f, init, l) => l.reduce((r, v) => applyFn(f, [r, v]), init));
  return env;
}

// ---- 入口 ----

export function run(code, out) {
  const env = globalEnv(out);
  for (const form of parseAll(code)) {
    const v = evaluate(form, env);
    if (v !== null && v !== undefined) out(`= ${show(v)}`);
  }
}

// ---- 页面元信息与示例 ----

export default {
  key: 'lisp',
  run,
  title: 'Lisp · 元循环解释器',
  tagline: 'S-表达式 + eval/apply：两百行实现一门动态类型的函数式语言，闭包、递归、高阶函数全都有。',
  docSlug: 'Lisp元循环解释器',
  cheatsheet: [
    '(define (f x) …) / (define x v) 定义；\'x 即 (quote x)',
    '(lambda (x) …) 函数；闭包记住定义时的环境',
    '(if c a b) 条件中只有 #f 为假；(let ((x 1)) …) 是 lambda 的语法糖',
    'print 输出；顶层表达式的值会被回显（= 开头）；; 是注释',
  ],
  examples: [
    {
      name: '你好，Lisp',
      code: `; 分号是注释。顶层表达式的值会被回显（= 开头）
(print "hello, world")
(+ 1 2 (* 3 4))
(< 2 10)
`,
    },
    {
      name: '递归：fib',
      code: `(define (fib n)
  (if (< n 2) n
      (+ (fib (- n 1)) (fib (- n 2)))))

(print (fib 15))   ; 610
(fib 20)           ; => 6765
`,
    },
    {
      name: '闭包与计数器',
      code: `(define (make-counter)
  (let ((n 0))
    (lambda () (set! n (+ n 1)) n)))

(define c1 (make-counter))
(define c2 (make-counter))
(c1) (c1)
(c2)               ; 两个计数器互不影响：闭包各带一份环境
`,
    },
    {
      name: '表与高阶函数',
      code: `(define (map f l)
  (if (null? l) '()
      (cons (f (car l)) (map f (cdr l)))))

(map (lambda (x) (* x x)) '(1 2 3 4 5))

(define (filter p l)
  (if (null? l) '()
      (if (p (car l))
          (cons (car l) (filter p (cdr l)))
          (filter p (cdr l)))))

(filter (lambda (x) (= (modulo x 2) 0)) '(1 2 3 4 5 6))
(reduce (lambda (a b) (+ a b)) 0 '(1 2 3 4 5 6 7 8 9 10))
`,
    },
  ],
};
