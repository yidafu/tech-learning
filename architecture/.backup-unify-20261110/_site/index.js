import { useEffect, useRef } from 'react'
import Layout from '@theme/Layout'
import { useHistory } from '@docusaurus/router'
import { useColorMode } from '@docusaurus/theme-common'
import styles from './styles.module.css'

// 知识图谱页：路由与数据由 plugins/link-graph.mjs 注入（props.graph = { nodes, links }）。
// force-graph 依赖 window/canvas，只在 useEffect 里动态 import，SSG 阶段不加载、也不进其他页面的包。

// 分组配色（group 取值见 link-graph.mjs）：大纲 + 六章 + 示例项目场景
const GROUPS = [
  ['软件架构学习大纲', '大纲', '#9c755f'],
  ['章节1', '章节1', '#4e79a7'],
  ['章节2', '章节2', '#f28e2b'],
  ['章节3', '章节3', '#e15759'],
  ['章节4', '章节4', '#76b7b2'],
  ['章节5', '章节5', '#59a14f'],
  ['章节6', '章节6', '#edc948'],
  ['示例项目场景', '示例项目场景', '#b07aa1'],
]
const COLORS = Object.fromEntries(GROUPS.map(([group, , color]) => [group, color]))

function Graph({ graph }) {
  const containerRef = useRef(null)
  const history = useHistory()
  const { colorMode } = useColorMode()

  useEffect(() => {
    const el = containerRef.current
    const textColor = getComputedStyle(el).color
    const linkColor = colorMode === 'dark' ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.12)'

    // 邻接表：节点大小按度数，悬停时只高亮自身与直接邻居
    const neighbors = new Map(graph.nodes.map((n) => [n.id, new Set()]))
    for (const { source, target } of graph.links) {
      neighbors.get(source).add(target)
      neighbors.get(target).add(source)
    }
    // force-graph 会就地改写节点/边（写入坐标、source/target 换成节点对象），传副本以免污染 props；
    // 节点按数组顺序绘制，枢纽页排最后，其常显标题不被后画的节点盖住
    const nodes = graph.nodes
      .map((n) => ({ ...n, degree: neighbors.get(n.id).size }))
      .sort((a, b) => a.hub - b.hub)
    const links = graph.links.map((l) => ({ ...l }))
    const radius = (n) => Math.sqrt(1 + n.degree / 3) * 4 // 与 nodeVal × 默认 nodeRelSize(4) 的命中区域一致

    let hovered = null
    const isLit = (n) => !hovered || n === hovered || neighbors.get(hovered.id).has(n.id)
    const touchesHovered = (l) => hovered && (l.source === hovered || l.target === hovered)

    let fg = null
    let fitted = false
    let disposed = false
    const resize = new ResizeObserver(() => fg?.width(el.clientWidth).height(el.clientHeight))
    // 设备像素比变化（窗口拖到另一块屏等）时 CSS 尺寸不变、ResizeObserver 不触发，而 force-graph 只在
    // 设宽高时按当时的 devicePixelRatio 分配画布像素——不重设的话只清、只画画布左上一角（重影）
    let dprQuery = null
    const onDprChange = () => {
      fg?.width(el.clientWidth).height(el.clientHeight)
      fg?.zoomToFit(0, 40) // 重设画布会按新旧像素比之差平移视角，直接重新适配全图
      watchDpr()
    }
    const watchDpr = () => {
      dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      dprQuery.addEventListener('change', onDprChange, { once: true })
    }
    watchDpr()

    import('force-graph').then(({ default: ForceGraph }) => {
      if (disposed) return
      fg = new ForceGraph(el)
      // 默认斥力 -30、连线长 30 对 69 页 / 569 条边过于紧凑，节点与标题会挤成一团
      fg.d3Force('charge').strength(-160)
      fg.d3Force('link').distance(60)
      fg.width(el.clientWidth)
        .height(el.clientHeight)
        .nodeVal((n) => 1 + n.degree / 3)
        .nodeCanvasObject((n, ctx, scale) => {
          const r = radius(n)
          ctx.globalAlpha = isLit(n) ? 1 : 0.15
          ctx.beginPath()
          ctx.arc(n.x, n.y, r, 0, 2 * Math.PI)
          ctx.fillStyle = COLORS[n.group] ?? '#999'
          ctx.fill()
          // 标题：枢纽页（大纲、索引、各章导览页）常显；放大后全显；悬停时显示自身与相邻页
          if (n.hub || scale >= 1.6 || (hovered && isLit(n))) {
            ctx.font = `${n.hub ? 'bold ' : ''}${12 / scale}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillStyle = textColor
            ctx.fillText(n.title, n.x, n.y + r + 2 / scale)
          }
          ctx.globalAlpha = 1
        })
        .linkColor((l) => (touchesHovered(l) ? COLORS[hovered.group] : linkColor))
        .linkWidth((l) => (touchesHovered(l) ? 1.5 : 0.5))
        .linkDirectionalArrowLength((l) => (touchesHovered(l) ? 4 : 0))
        .linkDirectionalArrowRelPos(1)
        .autoPauseRedraw(false) // 悬停高亮依赖逐帧重绘
        .onNodeHover((n) => {
          hovered = n
          el.style.cursor = n ? 'pointer' : ''
        })
        .onNodeClick((n) => history.push(n.id))
        .warmupTicks(100) // 首帧前先离线迭代布局，打开页面时不会看到节点从一点炸开
        .cooldownTicks(100)
        .onEngineStop(() => {
          // 只在首次布局稳定后自动缩放到全图；之后拖拽节点引起的重新布局不再打断用户视角
          if (fitted) return
          fitted = true
          fg.zoomToFit(400, 40)
        })
        .graphData({ nodes, links })
      resize.observe(el)
    })

    return () => {
      disposed = true
      resize.disconnect()
      dprQuery.removeEventListener('change', onDprChange)
      fg?._destructor()
    }
  }, [graph, colorMode, history])

  return <div ref={containerRef} className={styles.graph} />
}

export default function LinkGraphPage({ graph }) {
  return (
    <Layout title="知识图谱" description="笔记页面之间的链接关系图" noFooter>
      <main className={styles.page}>
        <Graph graph={graph} />
        <div className={styles.legend}>
          <strong>知识图谱</strong> · {graph.nodes.length} 页 · {graph.links.length} 条链接
          <ul>
            {GROUPS.map(([group, label, color]) => (
              <li key={group}>
                <span className={styles.dot} style={{ background: color }} />
                {label}
              </li>
            ))}
          </ul>
          <div className={styles.hint}>悬停高亮相邻页 · 点击节点跳转 · 滚轮缩放 · 拖拽平移</div>
        </div>
      </main>
    </Layout>
  )
}
