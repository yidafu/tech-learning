/**
 * noInline 且无显式 render 的语句块隐藏了 Result 区，
 * 但运行时错误（如故意抛错的教学演示）必须可见：单独渲染一条 LiveError。
 * 无错误时 react-live 的 LiveError 渲染为 null。
 */
import React, {type ReactNode} from 'react';
import {LiveError} from 'react-live';

import styles from './styles.module.css';

export default function LiveErrorStrip(): ReactNode {
  return (
    <div className={styles.strip}>
      <LiveError />
    </div>
  );
}
