#!/usr/bin/env node
// 站群统一主题同步脚本。唯一源头：shared/theme、shared/static/img。
// 用法：node shared/sync-theme.mjs（幂等；产物提交进 git，CI 不依赖本脚本）。
// 同步内容：
//   shared/theme/custom.css            → 各站 src/css/custom.css（全量覆盖，11 站逐字节相同）
//   shared/brand/theme/<站名>.css      → 各站 src/css/brand.css（各站主色，由 build.py 从
//                                        Logo 色派生；custom.css 第一行 @import 它）
//   shared/theme/components/*.jsx      → 各站 src/components/site/（镜像，先清再拷）
//   shared/brand/sites/<站名>/         → 各站 static/img/（各站独立 Logo / favicon，由
//                                        shared/brand/build.py 生成，勿手改各站副本）
// 注意：architecture 的 scripts/copy-samples.mjs 只清理 static/第N阶段/，
// 不会动这里同步进去的 static/img/。
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const SITES = ['architecture', 'backend', 'browser', 'compiler', 'gui', 'js-ts/docs-site', 'observability', 'react', 'react-native', 'security', 'webgl'];

for (const site of SITES) {
  const siteRoot = join(repoRoot, site);

  // 统一 CSS + 各站主色（brand.css 按站取，别改成共享文件）
  mkdirSync(join(siteRoot, 'src/css'), { recursive: true });
  cpSync(join(repoRoot, 'shared/theme/custom.css'), join(siteRoot, 'src/css/custom.css'));
  cpSync(
    join(repoRoot, 'shared/brand/theme', `${site.split('/')[0]}.css`),
    join(siteRoot, 'src/css/brand.css')
  );

  // 统一首页组件（镜像目录，先清再拷，避免残留已删除的组件）
  const componentsDest = join(siteRoot, 'src/components/site');
  rmSync(componentsDest, { recursive: true, force: true });
  cpSync(join(repoRoot, 'shared/theme/components'), componentsDest, { recursive: true });

  // 各站独立 logo / favicon（源头 shared/brand/sites/<站名>/，见 shared/brand/build.py）
  // 注意：这里必须按站分发，早期版本是从 shared/static/img 覆盖全部站，
  // 那会把 11 个站的标记写成同一个图标。
  const brandSlug = site.split('/')[0];
  mkdirSync(join(siteRoot, 'static/img'), { recursive: true });
  cpSync(join(repoRoot, 'shared/brand/sites', brandSlug), join(siteRoot, 'static/img'), {
    recursive: true,
  });

  console.log(`sync-theme: ✓ ${site}`);
}
console.log(`sync-theme: 统一主题已同步到 ${SITES.length} 站。`);
