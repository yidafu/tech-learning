// 把各章节目录下的 Kotlin 示例目录（`NNa-`/`NNb-示例-*`）同步拷入 static/章节N/ 同名路径，
// 使笔记内指向 .kt 示例文件的相对链接在站上可直接下载/查看。
// static/ 整体是生成物（已 gitignore），单一事实源仍是工作区各章节目录；
// 由 package.json 的 dev/build 脚本在启动前自动执行。
import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const siteDir = dirname(dirname(fileURLToPath(import.meta.url))) // 站点根（仓库根）
const docsDir = join(siteDir, 'docs')
const staticDir = join(siteDir, 'static')

const isSampleDir = (name) => /^\d+[a-z]-示例-/.test(name)

// docs/ 下的章节目录是指向工作区源目录的符号链接：Dirent 不跟随符号链接，
// 需 statSync 穿透后再判断是否目录
const realDirs = (dir) =>
  readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory())

rmSync(staticDir, { recursive: true, force: true })
mkdirSync(staticDir, { recursive: true })

const chapters = realDirs(docsDir).filter((name) => name.startsWith('章节'))

let copied = 0
for (const ch of chapters) {
  for (const name of realDirs(join(docsDir, ch))) {
    if (isSampleDir(name)) {
      cpSync(join(docsDir, ch, name), join(staticDir, ch, name), {
        recursive: true,
      })
      copied += 1
      console.log(`copy-samples: ${ch}/${name}`)
    }
  }
}
console.log(`copy-samples: 共同步 ${copied} 个示例目录 → static/`)
