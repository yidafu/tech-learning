// 知识图谱插件：把笔记正文里的 .md 相对链接抽成“页面 → 页面”有向图，挂到 /graph 路由
// （页面组件 src/components/LinkGraphPage 用 force-graph 画力导向图，节点点击即跳转）。
//
// 为何不用跨项目手册 DOCUSAURUS-SETUP.md §4.3 推荐的 docusaurus-graph（2.0.0 源码核查结论）：
// ① 边只认 frontmatter 的 references/sources——得给全部笔记注入与正文链接重复的派生元数据，
//    违背“笔记零改动、站点只做挂载与渲染”，也会与并行会话改笔记相互覆盖；
// ② 节点 id 取文件 basename——章节1、章节2 两份 99-自测答案与点评 会被合并成一个节点；
// ③ 往每页 <head> 同步插入三个 jsdelivr 脚本（其中 note-graph@latest 为浮动版本），CDN 一慢全站阻塞；
// ④ 节点不可点击、界面为英文。
// 本插件在 allContentLoaded 阶段直接复用 docs 插件解析好的元数据：permalink 作节点 id（唯一、可跳转），
// 标题即页面标题（取自首个 # 标题）；图数据经 createData 只随 /graph 路由按需加载，不进其他页面的包。
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'

// 围栏代码块的开/闭栏：允许缩进与块引用前缀（列表、> 引用里的代码块）
const FENCE_RE = /^[\s>]*(`{3,}|~{3,})/
// 行内链接 [文字](目标 "可选标题")，目标可用 <...> 包裹；图片 ![..](..) 也会命中，随后按 .md 过滤
const LINK_RE = /\]\(\s*<?([^)\s>]+)/g
// 外链（http:、mailto: 等协议）与站内绝对路径不参与建边
const SKIP_RE = /^(?:[a-z][a-z0-9+.-]*:|\/)/i

// 剔除围栏代码块与行内代码后的正文，避免把示例代码里的 ](..) 误认成链接；
// 闭栏判定同 CommonMark：同种字符、不短于开栏、其后无其他内容
function prose(markdown) {
  const kept = []
  let fence = null
  for (const line of markdown.split('\n')) {
    const marker = FENCE_RE.exec(line)?.[1]
    if (fence) {
      const rest = line.replace(/^[\s>]*/, '').trimEnd()
      if (marker && rest === marker && marker[0] === fence[0] && marker.length >= fence.length) {
        fence = null
      }
      continue
    }
    if (marker) {
      fence = marker
      continue
    }
    kept.push(line.replace(/`[^`]*`/g, ''))
  }
  return kept.join('\n')
}

const safeDecode = (s) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export default function linkGraphPlugin(context) {
  const docsDir = resolve(context.siteDir, 'docs')
  return {
    name: 'link-graph',
    async allContentLoaded({ allContent, actions }) {
      const { loadedVersions } = allContent['docusaurus-plugin-content-docs'].default
      // 文件路径（docs/ 下的符号链接形态，与正文相对链接的解析基准一致，不做 realpath）→ 文档元数据
      const byPath = new Map(
        loadedVersions
          .flatMap((version) => version.docs)
          .map((doc) => [resolve(context.siteDir, doc.source.replace(/^@site\//, '')), doc]),
      )

      const nodes = []
      const links = new Map() // “源→目标”去重：同一页多次链接同一目标只算一条边
      for (const [file, doc] of byPath) {
        // docs/ 下相对路径的首段作分组（章节1~6 / 示例项目场景 / 软件架构学习大纲），供页面配色；
        // 枢纽页 = 根目录两份索引（大纲、示例项目场景）+ 各章 01- 导览页，页面上常显标题
        const segments = relative(docsDir, file).split(sep)
        const group = segments[0].replace(/\.md$/, '')
        const hub =
          segments.length === 1 ||
          (segments.length === 2 && group.startsWith('章节') && segments[1].startsWith('01-'))
        nodes.push({ id: doc.permalink, title: doc.title, group, hub })

        for (const [, raw] of prose(readFileSync(file, 'utf8')).matchAll(LINK_RE)) {
          const target = safeDecode(raw.split('#')[0])
          if (!target.endsWith('.md') || SKIP_RE.test(target)) continue
          const dest = byPath.get(resolve(dirname(file), target))
          if (dest && dest !== doc) {
            links.set(`${doc.permalink}→${dest.permalink}`, {
              source: doc.permalink,
              target: dest.permalink,
            })
          }
        }
      }

      const graphPath = await actions.createData(
        'graph.json',
        JSON.stringify({ nodes, links: [...links.values()] }),
      )
      actions.addRoute({
        path: `${context.baseUrl}graph`,
        component: '@site/src/components/LinkGraphPage',
        exact: true,
        modules: { graph: graphPath },
      })
    },
  }
}
