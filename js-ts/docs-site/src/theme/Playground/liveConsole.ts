/**
 * live 代码块的 console 捕获与输出格式化。
 *
 * react-live 通过 `new Function(...scopeKeys, code)` 注入 scope，
 * 因此在 scope 里放入捕获版 console 即可原地遮蔽全局 console，
 * 笔记源码里的 `console.log` 无需任何改写。
 * 输出格式对齐 Node console.log（笔记「预期输出」均为 Node 生成）。
 */

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  text: string;
}

/** 每个 live 代码块一个实例；不可变快照 + 订阅，供 useSyncExternalStore 使用 */
export class LiveConsoleStore {
  private listeners = new Set<() => void>();
  private current: LogEntry[] = [];

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): LogEntry[] => this.current;

  push = (level: LogLevel, text: string): void => {
    this.current = [...this.current, {level, text}];
    this.emit();
  };

  clear = (): void => {
    if (this.current.length === 0) {
      return;
    }
    this.current = [];
    this.emit();
  };

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

const MAX_DEPTH = 2; // 与 Node 默认 depth: 2 一致，超出显示 [Object]/[Array]

/** Node inspect 风格：字符串带引号（顶层除外）、对象键不加引号、Map/Set/Error 特殊格式 */
export function nodeInspect(value: unknown, depth = 0, seen?: Set<object>): string {
  if (value === null) {
    return 'null';
  }
  switch (typeof value) {
    case 'undefined':
      return 'undefined';
    case 'string':
      // 顶层字符串原样输出（Node console.log('hi') → hi），嵌套时带引号
      return depth === 0
        ? value
        : `'${value
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')}'`;
    case 'number':
      return Number.isNaN(value) ? 'NaN' : Object.is(value, -0) ? '-0' : String(value);
    case 'boolean':
      return String(value);
    case 'bigint':
      return `${value}n`;
    case 'symbol':
      return String(value);
    case 'function':
      return (value as (...args: unknown[]) => unknown).name
        ? `[Function: ${(value as {name: string}).name}]`
        : '[Function (anonymous)]';
    case 'object':
      break;
    default:
      return String(value);
  }

  const obj = value as object;
  if (seen?.has(obj)) {
    return '[Circular *1]';
  }
  const nextSeen = seen ?? new Set<object>();
  nextSeen.add(obj);

  if (Array.isArray(obj)) {
    if (depth >= MAX_DEPTH) {
      return '[Array]';
    }
    const items = obj.map((item) => nodeInspect(item, depth + 1, nextSeen));
    return items.length === 0 ? '[]' : `[ ${items.join(', ')} ]`;
  }
  if (obj instanceof Date) {
    return Number.isNaN(obj.getTime()) ? 'Invalid Date' : obj.toISOString();
  }
  if (obj instanceof Error) {
    // 完整 stack（首行 Error: msg，其余为调用栈）
    return depth === 0
      ? (obj.stack ?? `${obj.name}: ${obj.message}`)
      : `${obj.name}: ${obj.message}`;
  }
  if (obj instanceof Map) {
    const entries = [...obj.entries()].map(
      ([k, v]) =>
        `${nodeInspect(k, depth + 1, nextSeen)} => ${nodeInspect(v, depth + 1, nextSeen)}`,
    );
    return `Map(${obj.size}) { ${entries.join(', ')} }`;
  }
  if (obj instanceof Set) {
    const items = [...obj.values()].map((v) => nodeInspect(v, depth + 1, nextSeen));
    return `Set(${obj.size}) { ${items.join(', ')} }`;
  }
  if (depth >= MAX_DEPTH) {
    return '[Object]';
  }

  const proto = Object.getPrototypeOf(obj) as {constructor?: {name?: string}} | null;
  const isPlain = proto === Object.prototype || proto === null;
  const ctorName = proto?.constructor?.name;
  const prefix = isPlain || !ctorName || ctorName === 'Object' ? '' : `${ctorName} `;
  const entries = Object.entries(obj).map(
    ([key, val]) => `${key}: ${nodeInspect(val, depth + 1, nextSeen)}`,
  );
  return entries.length === 0 ? `${prefix}{}` : `${prefix}{ ${entries.join(', ')} }`;
}

const PLACEHOLDER = /%[sdifjoOc%]/g;

/** 对齐 Node util.format 的常用占位符子集 */
export function formatConsoleArgs(args: unknown[]): string {
  if (args.length === 0) {
    return '';
  }
  const first = args[0];
  if (typeof first !== 'string' || !PLACEHOLDER.test(first)) {
    PLACEHOLDER.lastIndex = 0;
    return args.map((arg) => nodeInspect(arg, 0)).join(' ');
  }
  PLACEHOLDER.lastIndex = 0;

  let cursor = 1;
  const body = first.replace(PLACEHOLDER, (placeholder) => {
    if (placeholder === '%%') {
      return '%';
    }
    if (cursor >= args.length) {
      return placeholder;
    }
    const value = args[cursor++];
    switch (placeholder) {
      case '%s':
        return typeof value === 'object' && value !== null
          ? nodeInspect(value, 1)
          : String(value);
      case '%d':
      case '%i':
      case '%f': {
        try {
          const num = Number(value);
          return placeholder === '%d' && typeof value === 'bigint'
            ? `${value}n`
            : String(
                placeholder === '%i'
                  ? Math.trunc(num)
                  : placeholder === '%f'
                    ? num
                    : num,
              );
        } catch {
          return 'NaN';
        }
      }
      case '%j':
        try {
          return JSON.stringify(value) ?? 'undefined';
        } catch {
          return '[Circular]';
        }
      case '%o':
      case '%O':
        return nodeInspect(value, 1);
      case '%c':
        return ''; // CSS 样式占位符：吞掉参数，不输出
      default:
        return placeholder;
    }
  });

  const rest = args.slice(cursor).map((arg) => nodeInspect(arg, 0));
  return rest.length > 0 ? `${body} ${rest.join(' ')}` : body;
}

/** 构造注入 react-live scope 的捕获版 console：log 族被捕获，其余方法经原型链透传真实 console */
export function createCapturedConsole(store: LiveConsoleStore): Console {
  const captured = Object.create(console) as Console;
  for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    captured[level] = (...args: unknown[]) => {
      store.push(level, formatConsoleArgs(args));
    };
  }
  return captured;
}
