/**
 * 全局类型：浏览器内惰性加载的 TypeScript 编译器（static/ts/ 下）。
 * 仅用于类型标注，运行时统一从 window 取值，不产生对 'typescript' 的运行时依赖。
 */
import type * as TS from 'typescript';

declare global {
  interface Window {
    ts?: typeof TS;
    /** lib.d.ts 文件名 → 内容（gen-ts-libs.mjs 生成） */
    __TS_LIB_FILES__?: Record<string, string>;
  }
}

export {};
