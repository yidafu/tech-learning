/**
 * `ts live` 块的类型检查面板：在浏览器内跑真实 tsc（strict），
 * 编译错误演示与纯类型代码由此可在站内验证。
 *
 * 编译器以静态文件惰性加载（static/ts/typescript.js + static/ts/ts-libs.js），
 * 不走 webpack 打包（typescript 包无 browser 字段，打包有 fs/path 风险）。
 */
import React, {
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import type * as TS from 'typescript';

import {usePlaygroundInfo} from '../context';
import styles from './styles.module.css';

type Diagnostic = {
  line: number; // 0 表示无文件级定位（如编译选项错误）
  code: number;
  message: string;
};

type Status =
  | {kind: 'idle'}
  | {kind: 'loading'}
  | {kind: 'running'}
  | {kind: 'clean'}
  | {kind: 'diagnostics'; items: Diagnostic[]}
  | {kind: 'failed'; message: string};

// 脚本加载 promise 缓存：已加载完的 <script> 不会再触发 load 事件，
// 必须以 URL 为键缓存 promise，避免二次调用悬挂
const scriptPromises = new Map<string, Promise<void>>();

function loadScriptOnce(src: string): Promise<void> {
  let pending = scriptPromises.get(src);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.dataset.liveTs = src;
      script.addEventListener('load', () => resolve());
      script.addEventListener('error', () => {
        scriptPromises.delete(src); // 允许下次点击重试
        reject(new Error(`加载失败: ${src}`));
      });
      document.head.appendChild(script);
    });
    scriptPromises.set(src, pending);
  }
  return pending;
}

// lib.d.ts 解析结果跨代码块缓存（每个 live 页面可能有几十次类型检查）
const libSourceCache = new Map<string, TS.SourceFile>();

function runTypecheck(code: string): Diagnostic[] {
  const ts = window.ts!;
  const libs = window.__TS_LIB_FILES__!;
  // 追加 export 使输入成为模块：与工作区练习文件（均为模块）同口径，
  // 允许片段内声明的 Partial 等遮蔽 lib 全局名；行号不受影响（追加在末尾）
  const fileMap: Record<string, string> = {
    ...libs,
    '/input.ts': `${code}\nexport {};\n`,
  };
  const host: TS.CompilerHost = {
    getSourceFile(fileName, languageVersion) {
      const cached = libSourceCache.get(fileName);
      if (cached) {
        return cached;
      }
      const text = fileMap[fileName];
      if (text === undefined) {
        return undefined;
      }
      const sourceFile = ts.createSourceFile(fileName, text, languageVersion);
      libSourceCache.set(fileName, sourceFile);
      return sourceFile;
    },
    // lib 选项与 /// <reference lib> 均按 getDefaultLibLocation + 文件名解析
    getDefaultLibLocation: () => '/libs',
    getDefaultLibFileName: () => '/libs/lib.es2022.d.ts',
    writeFile: () => {},
    getCurrentDirectory: () => '/',
    getDirectories: () => [],
    fileExists: (fileName) => fileName in fileMap,
    readFile: (fileName) => fileMap[fileName],
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    directoryExists: (dir) => dir === '/' || dir === '/libs',
  };
  // 与工作区单文件类型检查口径一致：
  // tsc --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom
  // 注意：createProgram 不走 CLI 解析，lib 须传完整 lib.d.ts 文件名
  // （CLI 的 --lib es2022,dom 会被命令行解析器规范化为文件名）
  const options: TS.CompilerOptions = {
    strict: true,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  };
  const program = ts.createProgram(['/input.ts'], options, host);
  const input = program.getSourceFile('/input.ts');
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter((diag) => !diag.file || diag.file.fileName === '/input.ts');
  return diagnostics.map((diag) => {
    const line = input && diag.start !== undefined
      ? input.getLineAndCharacterOfPosition(diag.start).line + 1
      : 0;
    return {
      line,
      code: diag.code,
      message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
    };
  });
}

export default function TypeCheck(): ReactNode {
  const {code} = usePlaygroundInfo();
  const compilerUrl = useBaseUrl('/ts/typescript.js');
  const libsUrl = useBaseUrl('/ts/ts-libs.js');
  const [status, setStatus] = useState<Status>({kind: 'idle'});

  // 代码被编辑后，旧检查结果失效
  useEffect(() => {
    setStatus({kind: 'idle'});
  }, [code]);

  const run = useCallback(async () => {
    try {
      setStatus({kind: 'loading'});
      if (!window.ts) {
        await loadScriptOnce(compilerUrl);
      }
      if (!window.__TS_LIB_FILES__) {
        await loadScriptOnce(libsUrl);
      }
      setStatus({kind: 'running'});
      // 让 UI 先渲染一帧，再进入同步的重检查
      await new Promise((resolve) => setTimeout(resolve, 30));
      const items = runTypecheck(code);
      setStatus(items.length === 0 ? {kind: 'clean'} : {kind: 'diagnostics', items});
    } catch (err) {
      setStatus({kind: 'failed', message: String(err)});
    }
  }, [code, compilerUrl, libsUrl]);

  const busy = status.kind === 'loading' || status.kind === 'running';
  const label =
    status.kind === 'running' ? '类型检查中…' : '▶ 类型检查（strict）';

  return (
    <div className={styles.typeCheck}>
      <button
        type="button"
        className="button button--sm button--secondary"
        onClick={run}
        disabled={busy}>
        {busy ? '⏳ ' : ''}
        {label}
      </button>
      {status.kind === 'clean' && (
        <div className={styles.clean}>✔ 无类型错误（strict, target ES2022）</div>
      )}
      {status.kind === 'diagnostics' && (
        <div className={styles.panel}>
          <div className={styles.summary}>
            {status.items.length} 个类型错误：
          </div>
          {status.items.map((item, index) => (
            <div key={index} className={styles.diag}>
              {item.line > 0 ? (
                <span className={styles.loc}>第 {item.line} 行 </span>
              ) : null}
              <span className={styles.code}>TS{item.code}</span>
              <span>: </span>
              <span>{item.message}</span>
            </div>
          ))}
        </div>
      )}
      {status.kind === 'loading' && (
        <div className={styles.note}>首次加载编译器（约 10 MB，之后有缓存）…</div>
      )}
      {status.kind === 'failed' && (
        <div className={styles.failed}>{status.message}</div>
      )}
    </div>
  );
}
