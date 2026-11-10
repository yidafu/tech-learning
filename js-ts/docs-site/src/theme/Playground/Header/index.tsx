import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import type {Props} from '@theme/Playground/Header';

import styles from './styles.module.css';

export default function PlaygroundHeader({
  children,
  buttons,
}: Props): ReactNode {
  return (
    <div className={clsx(styles.playgroundHeader)}>
      <div className={styles.playgroundHeaderContent}>{children}</div>
      {buttons && (
        <div className={styles.playgroundHeaderButtons}>{buttons}</div>
      )}
    </div>
  );
}
