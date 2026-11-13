/**
 * Forth 演练场：数据栈 + 字典的极简栈式语言。
 * 一切操作经过栈（逆波兰序）；: name … ; 向字典里添加新单词。
 * 教学简化：if/then、do/loop、begin/until 用「配对扫描」实现，
 * 真实 Forth 是编译成线程码 + 分支指令（见讲解文档的对照说明）。
 */

export class ForthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForthError';
  }
}

function tokenize(src) {
  const noComments = src.replace(/\\[^\n]*/g, ' ').replace(/\([^)]*\)/g, ' ');
  return noComments.match(/\."[^"]*"|\S+/g) ?? [];
}

// 控制流配对扫描：从 from 出发找最近的 stop（同族开词计数防嵌套误配）
const OPENER = { then: 'if', else: 'if', loop: 'do', until: 'begin' };

function scanTo(tokens, from, stop) {
  const opener = OPENER[stop];
  let depth = 0;
  for (let j = from + 1; j < tokens.length; j++) {
    const w = tokens[j];
    if (w === opener) depth++;
    else if (w === stop) {
      if (depth === 0) return j;
      depth--;
    } else if (stop === 'then' && w === 'else' && depth === 0) return j;
  }
  throw new ForthError(`「${tokens[from]}」缺少配对的 ${stop}`);
}

function scanBackToBegin(tokens, from) {
  let depth = 0;
  for (let j = from - 1; j >= 0; j--) {
    const w = tokens[j];
    if (w === 'until') depth++;
    else if (w === 'begin') {
      if (depth === 0) return j;
      depth--;
    }
  }
  throw new ForthError('until 缺少配对的 begin');
}

// ---- 解释器：walk token 数组；用户单词递归解释（线程码雏形） ----

function interpret(tokens, ctx) {
  const { stack } = ctx;
  const pop = () => {
    if (!stack.length) throw new ForthError('栈下溢（操作数不够）');
    return stack.pop();
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^-?\d+$/.test(t)) {
      stack.push(parseInt(t, 10));
      continue;
    }
    if (t.startsWith('."')) {
      ctx.out(t.slice(2, -1));
      continue;
    }

    switch (t) {
      case ':': {
        const name = tokens[++i];
        if (!name || /^\d+$/.test(name)) throw new ForthError(': 后面需要单词名');
        const body = [];
        while (true) {
          const w = tokens[++i];
          if (w === undefined) throw new ForthError(`定义 ${name} 缺少 ;`);
          if (w === ';') break;
          body.push(w);
        }
        ctx.dict.set(name, body);
        continue;
      }
      case 'variable': {
        const name = tokens[++i];
        if (!name) throw new ForthError('variable 后面需要名字');
        ctx.dict.set(name, (c) => c.stack.push(name)); // 地址就用名字表示
        ctx.cells.set(name, 0);
        continue;
      }
      case 'constant': {
        const name = tokens[++i];
        if (!name) throw new ForthError('constant 后面需要名字');
        const v = pop();
        ctx.dict.set(name, (c) => c.stack.push(v));
        continue;
      }
      case 'if': {
        if (pop() === 0) i = scanTo(tokens, i, 'then'); // 假：跳到 else（执行 else 分支）或 then
        continue;
      }
      case 'else':
        i = scanTo(tokens, i, 'then'); // 真分支执行到 else：直接跳过 else 分支
        continue;
      case 'then':
        continue;
      case 'begin':
        continue;
      case 'until':
        if (pop() === 0) i = scanBackToBegin(tokens, i);
        continue;
      case 'do': {
        const index = pop();
        const limit = pop();
        if (index >= limit) i = scanTo(tokens, i, 'loop');
        else ctx.loops.push({ index, limit, bodyStart: i + 1 });
        continue;
      }
      case 'loop': {
        const l = ctx.loops[ctx.loops.length - 1];
        if (!l) throw new ForthError('loop 缺少配对的 do');
        l.index++;
        if (l.index < l.limit) i = l.bodyStart - 1;
        else ctx.loops.pop();
        continue;
      }
      case 'i': {
        const l = ctx.loops[ctx.loops.length - 1];
        if (!l) throw new ForthError('i 只能在 do…loop 里用');
        stack.push(l.index);
        continue;
      }
      default:
        break;
    }

    const word = ctx.dict.get(t);
    if (word === undefined) throw new ForthError(`未知单词：${t}`);
    if (typeof word === 'function') word(ctx);
    else interpret(word, ctx);
  }
}

// ---- 内建字典 ----

function makeDict() {
  const dict = new Map();
  const need = (ctx, name, n) => {
    if (ctx.stack.length < n) throw new ForthError(`${name} 需要 ${n} 个操作数`);
  };
  const bin = (name, f) =>
    dict.set(name, (ctx) => {
      need(ctx, name, 2);
      const b = ctx.stack.pop();
      const a = ctx.stack.pop();
      ctx.stack.push(f(a, b));
    });
  const un = (name, f) =>
    dict.set(name, (ctx) => {
      need(ctx, name, 1);
      ctx.stack.push(f(ctx.stack.pop()));
    });

  bin('+', (a, b) => a + b);
  bin('-', (a, b) => a - b);
  bin('*', (a, b) => a * b);
  bin('/', (a, b) => {
    if (b === 0) throw new ForthError('除数为零');
    return Math.trunc(a / b);
  });
  bin('mod', (a, b) => {
    if (b === 0) throw new ForthError('除数为零');
    return ((a % b) + b) % b;
  });
  bin('<', (a, b) => (a < b ? -1 : 0)); // Forth 惯例：真 = -1，假 = 0
  bin('>', (a, b) => (a > b ? -1 : 0));
  bin('=', (a, b) => (a === b ? -1 : 0));
  un('0=', (a) => (a === 0 ? -1 : 0));
  un('abs', Math.abs);
  bin('min', Math.min);
  bin('max', Math.max);

  dict.set('dup', (ctx) => {
    need(ctx, 'dup', 1);
    ctx.stack.push(ctx.stack[ctx.stack.length - 1]);
  });
  dict.set('drop', (ctx) => {
    need(ctx, 'drop', 1);
    ctx.stack.pop();
  });
  dict.set('swap', (ctx) => {
    need(ctx, 'swap', 2);
    const b = ctx.stack.pop();
    const a = ctx.stack.pop();
    ctx.stack.push(b, a);
  });
  dict.set('over', (ctx) => {
    need(ctx, 'over', 2);
    ctx.stack.push(ctx.stack[ctx.stack.length - 2]);
  });
  dict.set('rot', (ctx) => {
    need(ctx, 'rot', 3);
    const c = ctx.stack.pop();
    const b = ctx.stack.pop();
    const a = ctx.stack.pop();
    ctx.stack.push(b, c, a);
  });

  dict.set('.', (ctx) => {
    need(ctx, '.', 1);
    ctx.out(`${ctx.stack.pop()} `);
  });
  dict.set('.s', (ctx) => ctx.out(`<${ctx.stack.length}> ${ctx.stack.join(' ')}\n`));
  dict.set('cr', (ctx) => ctx.out('\n'));
  dict.set('space', (ctx) => ctx.out(' '));
  dict.set('emit', (ctx) => {
    need(ctx, 'emit', 1);
    ctx.out(String.fromCharCode(ctx.stack.pop()));
  });

  dict.set('@', (ctx) => {
    need(ctx, '@', 1);
    const addr = ctx.stack.pop();
    if (!ctx.cells.has(addr)) throw new ForthError(`无效地址：${addr}`);
    ctx.stack.push(ctx.cells.get(addr));
  });
  dict.set('!', (ctx) => {
    need(ctx, '!', 2);
    const addr = ctx.stack.pop(); // ( x addr -- )：栈顶是地址
    const v = ctx.stack.pop();
    if (!ctx.cells.has(addr)) throw new ForthError(`无效地址：${addr}`);
    ctx.cells.set(addr, v);
  });
  dict.set('+!', (ctx) => {
    need(ctx, '+!', 2);
    const addr = ctx.stack.pop();
    const v = ctx.stack.pop();
    if (!ctx.cells.has(addr)) throw new ForthError(`无效地址：${addr}`);
    ctx.cells.set(addr, ctx.cells.get(addr) + v);
  });
  return dict;
}

// ---- 入口：行缓冲输出，收尾报告栈状态 ----

export function run(code, write) {
  const ctx = {
    stack: [],
    dict: makeDict(),
    cells: new Map(),
    loops: [],
    line: '',
    out(s) {
      for (const ch of String(s)) {
        if (ch === '\n') {
          write(this.line);
          this.line = '';
        } else {
          this.line += ch;
        }
      }
    },
  };
  try {
    interpret(tokenize(code), ctx);
  } finally {
    if (ctx.line) {
      write(ctx.line);
      ctx.line = '';
    }
  }
  write(`（栈：${ctx.stack.length ? ctx.stack.join(' ') : '空'}）`);
}

// ---- 页面元信息与示例 ----

export default {
  key: 'forth',
  run,
  title: 'Forth · 栈机',
  tagline: '数据栈 + 字典：逆波兰序的最小命令式语言。它是第五阶段字节码 VM 的直系亲戚。',
  docSlug: 'Forth栈机与字典',
  cheatsheet: [
    "'1 2 +' 即 1+2：操作数先进栈，运算符弹栈压结果",
    ': name … ; 定义新单词；单词可以调用单词（含自己——递归）',
    'if … else … then / do … loop（配 i）/ begin … until 控制流',
    'variable x、x @、v x ! 可变状态；. 弹栈打印、." 文本" 输出字符串、\\ 注释',
  ],
  examples: [
    {
      name: '栈与算术',
      code: `\\ 逆波兰序：操作数先入栈，运算符弹栈
1 2 + .            \\ 3
3 4 * . cr         \\ 12
1 2 3 4 5 .s       \\ 看看栈里有什么
`,
    },
    {
      name: '定义单词',
      code: `: square dup * ;      \\ dup 复制栈顶：a -- a a
: cube dup square * ;
5 square . 3 cube . cr
`,
    },
    {
      name: '递归阶乘',
      code: `: fact
  dup 2 < if        \\ 栈上只剩 n，dup 一份去比较
    drop 1          \\ 基例：n < 2，丢掉 n 压 1
  else
    dup 1 - fact * \\ 递归：n * fact(n-1)
  then ;
5 fact . 10 fact . cr
`,
    },
    {
      name: 'do…loop 求和',
      code: `\\ 101 1 do：从 1 数到 100（上界排他）；i 取当前计数值
: sum100
  0                 \\ 累加器先入栈
  101 1 do i + loop ;
sum100 . cr         \\ 5050
`,
    },
    {
      name: '变量与计数',
      code: `variable count
0 count !
: bump  count @ 1 + count !  count @ . ;
bump bump bump cr
`,
    },
    {
      name: 'begin…until 倒数',
      code: `: countdown
  3                 \\ ( -- n )
  begin
    dup .           \\ 打印当前值
    1 -             \\ 递减
    dup 0 = until   \\ 直到减到 0
  drop cr ;
countdown
`,
    },
  ],
};
