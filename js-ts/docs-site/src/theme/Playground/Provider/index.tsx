/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Customized (ejected): Reset 重挂载边界内同步清空捕获的 console 输出。
 */

import React, {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {LiveProvider} from 'react-live';
import {PlaygroundProvider as PlaygroundProviderComponent} from '@docusaurus/theme-live-codeblock/client';
import {usePrismTheme} from '@docusaurus/theme-common';
import type {Props} from '@theme/Playground/Provider';

import {usePlaygroundInfo} from '../context';

// this should rather be a stable function
// see https://github.com/facebook/docusaurus/issues/9630#issuecomment-1855682643
const DEFAULT_TRANSFORM_CODE = (code: string) => `${code};`;

/** 挂载时清空输出：位于 Reset 的 key 重挂载边界内，每次 Reset 都会执行 */
function ResetClear({children}: {children: ReactNode}): ReactNode {
  const {store} = usePlaygroundInfo();
  useEffect(() => {
    store.clear();
  }, [store]);
  return <>{children}</>;
}

function LiveProviderComponent({code, children, ...props}: Props): ReactNode {
  const prismTheme = usePrismTheme();
  const noInline = props.metastring?.includes('noInline') ?? false;
  return (
    <LiveProvider
      noInline={noInline}
      theme={prismTheme}
      {...props}
      code={code?.replace(/\n$/, '')}
      transformCode={props.transformCode ?? DEFAULT_TRANSFORM_CODE}>
      {children}
    </LiveProvider>
  );
}

export default function PlaygroundProvider(props: Props): ReactNode {
  const [resetKey, setResetKey] = useState(0);
  const reset = useCallback(() => setResetKey((prev) => prev + 1), []);
  const value = useMemo(() => ({reset}), [reset]);

  return (
    <PlaygroundProviderComponent key={resetKey} value={value}>
      <ResetClear>
        <LiveProviderComponent {...props} />
      </ResetClear>
    </PlaygroundProviderComponent>
  );
}
