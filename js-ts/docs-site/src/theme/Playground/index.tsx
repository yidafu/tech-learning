/**
 * Ejected from @docusaurus/theme-live-codeblock and customized:
 * - console 捕获（scope 注入遮蔽全局 console）+ 输出面板
 * - noInline 语句块自动补 render(null) 并隐藏空的 Result 区
 * - 求值前自动清空上次输出（__liveReset 探针）
 * 代码语义与主题原版保持一致（inline 模式仍为单表达式约定）。
 */
import React, {
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import PlaygroundProvider from '@theme/Playground/Provider';
import PlaygroundContainer from '@theme/Playground/Container';
import PlaygroundLayout from '@theme/Playground/Layout';

import {createCapturedConsole, LiveConsoleStore} from './liveConsole';
import {PlaygroundInfoContext} from './context';
import type {Props} from '@theme/Playground';

const RENDER_RE = /\brender\s*\(/;

/**
 * 解析围栏语言。注意：mdast 会把 info 串拆成 lang（首个 token）+ meta（其余），
 * 传进来的 metastring 只含 'live noInline'，语言在 className 的 'language-xxx' 里。
 */
function parseLanguage(
  metastring: string | undefined,
  className: string | string[] | undefined,
): string | undefined {
  const classes = Array.isArray(className)
    ? className
    : (className?.split(/\s+/) ?? []);
  const langClass = classes
    .find((cls) => cls.startsWith('language-'))
    ?.slice('language-'.length);
  const first = metastring?.trim().split(/\s+/)[0];
  const candidate = langClass ?? first;
  return candidate && /^[a-zA-Z][\w+#.-]*$/.test(candidate) ? candidate : undefined;
}

function createLiveScope(store: LiveConsoleStore): Record<string, unknown> {
  return {
    React,
    ...React,
    console: createCapturedConsole(store),
    // transformCode 在求值代码前调用，用于清空上一次输出
    __liveReset: () => store.clear(),
  };
}

export default function Playground({
  children,
  transformCode,
  position,
  ...props
}: Props): ReactNode {
  const storeRef = useRef<LiveConsoleStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = new LiveConsoleStore();
  }
  const store = storeRef.current;

  const noInline = props.metastring?.includes('noInline') ?? false;
  // className 由 mdx 传入（类型里被 Omit，但运行时存在）
  const className = (props as {className?: string | string[]}).className;
  const language = parseLanguage(props.metastring, className);
  const rawCode = typeof children === 'string' ? children : '';
  const hasExplicitRender = RENDER_RE.test(rawCode);
  const showPreview = !noInline || hasExplicitRender;

  // scope / transformCode 引用必须稳定：LiveProvider 的 useEffect 以它们为依赖
  const scope = useMemo(() => createLiveScope(store), [store]);

  const liveTransformCode = useCallback(
    (code: string): string => {
      if (noInline) {
        // react-live noInline 模式硬性要求代码含 render(...)；
        // 笔记源码保持原样，求值时自动补 render(null)，Result 区随之隐藏
        const withRender = RENDER_RE.test(code)
          ? code
          : `${code}\n;render(null);`;
        return `__liveReset();\n${withRender}`;
      }
      // inline 模式整段被包成 `return (<code>)`，必须是单表达式：
      // 用逗号表达式先清空输出再求值；剥掉尾部分号以兼容 `expr;` 写法
      const trimmed = code.replace(/[;\s]+$/, '');
      return `(__liveReset(), (\n${trimmed}\n))`;
    },
    [noInline],
  );

  const info = useMemo(
    () => ({store, language, noInline, showPreview, code: rawCode}),
    [store, language, noInline, showPreview, rawCode],
  );

  return (
    <PlaygroundInfoContext.Provider value={info}>
      <PlaygroundContainer>
        <PlaygroundProvider
          code={children}
          {...props}
          scope={scope}
          transformCode={liveTransformCode}>
          <PlaygroundLayout position={position} />
        </PlaygroundProvider>
      </PlaygroundContainer>
    </PlaygroundInfoContext.Provider>
  );
}
