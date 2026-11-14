#!/usr/bin/env node
// 站群统一主题同步脚本。唯一源头：shared/theme、shared/static/img。
// 用法：node shared/sync-theme.mjs（幂等；产物提交进 git，CI 不依赖本脚本）。
// 同步内容：
//   shared/theme/custom.css            → 各站 src/css/custom.css（全量覆盖）
//   shared/theme/components/*.jsx      → 各站 src/components/site/（镜像，先清再拷）
//   shared/static/img/{logo,favicon}.svg → 各站 static/img/（navbar logo 与 favicon 共用）
// 注意：architecture 的 scripts/copy-samples.mjs 只清理 static/第N阶段/，
// 不会动这里同步进去的 static/img/。
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const SITES = ['architecture', 'browser', 'compiler', 'gui', 'js-ts/docs-site', 'observability', 'react', 'react-native', 'security', 'webgl'];

for (const site of SITES) {
  const siteRoot = join(repoRoot, site);

  // 统一 CSS
  mkdirSync(join(siteRoot, 'src/css'), { recursive: true });
  cpSync(join(repoRoot, 'shared/theme/custom.css'), join(siteRoot, 'src/css/custom.css'));

  // 统一首页组件（镜像目录，先清再拷，避免残留已删除的组件）
  const componentsDest = join(siteRoot, 'src/components/site');
  rmSync(componentsDest, { recursive: true, force: true });
  cpSync(join(repoRoot, 'shared/theme/components'), componentsDest, { recursive: true });

  // 统一 logo / favicon
  mkdirSync(join(siteRoot, 'static/img'), { recursive: true });
  cpSync(join(repoRoot, 'shared/static/img'), join(siteRoot, 'static/img'), { recursive: true });

  console.log(`sync-theme: ✓ ${site}`);
}
console.log(`sync-theme: 统一主题已同步到 ${SITES.length} 站。`);
