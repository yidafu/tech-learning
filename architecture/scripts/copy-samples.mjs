// 把各阶段目录下的 Kotlin 示例目录（`NNa-`/`NNb-示例-*`）同步拷入 static/ 下同名路径，
// 使笔记内指向 .kt 示例文件的相对链接在站上可直接下载/查看。
// 注意：页面 URL 里的目录段已剥离 `NN-` 前缀（01-第一阶段/ → /第一阶段/…），
// 所以 static/ 目标目录也用剥离前缀后的名字（/第一阶段/…），否则 .kt 相对链接 404。
// static/第N阶段/ 是生成物（已 gitignore），单一事实源仍是工作区各阶段目录；
// 只清理这些生成目录，不动 static/ 下手工维护的资产（img/ 等，来自 shared/sync-theme.mjs）；
// 由 package.json 的 dev/build 脚本在启动前自动执行。
import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const siteDir = dirname(dirname(fileURLToPath(import.meta.url))) // 站点根（仓库根）
const docsDir = join(siteDir, 'docs')
const staticDir = join(siteDir, 'static')

const isSampleDir = (name) => /^\d+[a-z]-示例-/.test(name)
// 阶段目录 + 07-数据系统内核专题（同样挂示例目录、同样剥前缀出 URL 段）
const isStageDir = (name) => /^\d+-(第.阶段|数据系统内核专题)$/.test(name)
const urlSegment = (dirName) => dirName.replace(/^\d+-/, '')

// docs/ 下的阶段目录是指向工作区源目录的符号链接：Dirent 不跟随符号链接，
// 需 statSync 穿透后再判断是否目录
const realDirs = (dir) =>
  readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory())

mkdirSync(staticDir, { recursive: true })
for (const name of realDirs(staticDir)) {
  if (/^(第.阶段|数据系统内核专题)$/.test(name)) {
    rmSync(join(staticDir, name), { recursive: true, force: true })
  }
}

const stages = realDirs(docsDir).filter(isStageDir)

let copied = 0
for (const stage of stages) {
  for (const name of realDirs(join(docsDir, stage))) {
    if (isSampleDir(name)) {
      cpSync(join(docsDir, stage, name), join(staticDir, urlSegment(stage), name), {
        recursive: true,
      })
      copied += 1
      console.log(`copy-samples: ${stage}/${name} → static/${urlSegment(stage)}/`)
    }
  }
}
console.log(`copy-samples: 共同步 ${copied} 个示例目录 → static/`)
