/**
 * Playground 内部共享上下文：console 捕获 store + 围栏元信息。
 * 由根 Playground 组件提供，Layout / ConsolePanel / TypeCheck / Provider 消费。
 */
import {createContext, useContext} from 'react';
import type {LiveConsoleStore} from './liveConsole';

export interface PlaygroundInfo {
  /** 捕获版 console 输出的 store（每代码块一个实例） */
  store: LiveConsoleStore;
  /** 围栏语言（metastring 首个 token），如 'js' / 'ts' / 'jsx' */
  language: string | undefined;
  /** 围栏是否带 noInline 标志 */
  noInline: boolean;
  /** 是否渲染 Result 预览区（inline 块，或 noInline 且代码显式调用 render） */
  showPreview: boolean;
  /** 原始代码文本（供 TS 类型检查使用） */
  code: string;
}

export const PlaygroundInfoContext = createContext<PlaygroundInfo | null>(null);

export function usePlaygroundInfo(): PlaygroundInfo {
  const info = useContext(PlaygroundInfoContext);
  if (!info) {
    throw new Error('usePlaygroundInfo must be used within Playground');
  }
  return info;
}
