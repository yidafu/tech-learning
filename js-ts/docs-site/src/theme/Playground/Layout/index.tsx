/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Customized (ejected): 编辑器下方追加 console 输出面板；
 * ts 块追加类型检查面板；noInline 且无显式 render 的语句块隐藏空 Result 区。
 */
import React, {type ReactNode} from 'react';
import {useThemeConfig} from '@docusaurus/theme-common';
import PlaygroundPreview from '@theme/Playground/Preview';
import PlaygroundEditor from '@theme/Playground/Editor';
import type {Props} from '@theme/Playground/Layout';

import {usePlaygroundInfo} from '../context';
import ConsolePanel from '../ConsolePanel';
import TypeCheck from '../TypeCheck';
import LiveErrorStrip from '../LiveErrorStrip';
import type {ThemeConfig} from '@docusaurus/theme-live-codeblock';

function useLiveCodeBlockThemeConfig() {
  const themeConfig = useThemeConfig() as unknown as ThemeConfig;
  return themeConfig.liveCodeBlock;
}

export default function PlaygroundLayout(props: Props): ReactNode {
  const info = usePlaygroundInfo();
  const themeConfig = useLiveCodeBlockThemeConfig();
  const position = props.position ?? themeConfig.playgroundPosition;

  const preview = info.showPreview ? <PlaygroundPreview /> : <LiveErrorStrip />;
  const panels = (
    <>
      <ConsolePanel />
      {info.language === 'ts' && <TypeCheck />}
    </>
  );

  return (
    <>
      {position === 'top' ? (
        <>
          {preview}
          <PlaygroundEditor />
          {panels}
        </>
      ) : (
        <>
          <PlaygroundEditor />
          {preview}
          {panels}
        </>
      )}
    </>
  );
}
