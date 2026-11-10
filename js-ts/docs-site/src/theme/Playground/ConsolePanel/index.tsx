/**
 * live 代码块的 console 输出面板。
 * 通过 useSyncExternalStore 订阅本代码块的 LiveConsoleStore，
 * 编辑 / Reset 重新求值时自动刷新。
 */
import React, {type ReactNode, useSyncExternalStore} from 'react';
import PlaygroundHeader from '@theme/Playground/Header';

import {usePlaygroundInfo} from '../context';
import styles from './styles.module.css';

// 服务端渲染快照（SSG 要求第三个参数）；求值只在客户端发生，服务端恒为空
const EMPTY: never[] = [];

export default function ConsolePanel(): ReactNode {
  const {store} = usePlaygroundInfo();
  const entries = useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY);

  return (
    <>
      <PlaygroundHeader>
        <span>
          输出（console）
          <code className={styles.hint}>console.log 已被捕获，无需改写源码</code>
        </span>
      </PlaygroundHeader>
      <div className={styles.consoleOutput}>
        {entries.length === 0 ? (
          <div className={styles.lineEmpty}>（暂无输出）</div>
        ) : (
          entries.map((entry, index) => (
            <div
              key={index}
              className={
                entry.level === 'error'
                  ? styles.lineError
                  : entry.level === 'warn'
                    ? styles.lineWarn
                    : styles.line
              }>
              {entry.text}
            </div>
          ))
        )}
      </div>
    </>
  );
}
