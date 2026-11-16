#!/usr/bin/env python3
"""生成品牌规范手册（HTML → PDF）。内容全部读 brand-spec.json + 各站 SVG。"""

import importlib.util
import json
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BRAND = os.path.join(ROOT, "shared", "brand")
spec = importlib.util.spec_from_file_location("build", os.path.join(BRAND, "build.py"))
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)

with open(os.path.join(BRAND, "brand-spec.json"), encoding="utf-8") as f:
    SPEC = json.load(f)

SEMANTICS = {
    "architecture": "一朵云下挂两台服务器 —— 云上入口收束到两个服务节点",
    "react": "官方 React 标志（filled 版，官方 #087EA4）—— 原样引用，未改动几何与配色",
    "react-native": "官方 React Native 标志（描边原子，官方 #61DAFB）—— 与 React 同形，靠描边与色相区分",
    "observability": "望远镜与三脚架 —— 把系统内部拉到眼前观测",
    "compiler": "三段式：菱形（入料）→ 漏斗 + 曲柄（绞肉机）→ 三粒圆点（出料）",
    "js-ts": "一对花括号 —— 语句块与类型标注的边界",
    "browser": "圆 + 经线 + 赤道线 —— 全球网络与渲染视口",
    "security": "盾形挖出锁孔 —— 防御优先，缺口在内部",
    "backend": "竖直服务塔 + 三层槽位 —— 请求自上而下穿过容器",
    "webgl": "等距立方 + 正面棱 —— 三维空间与投影",
    "gui": "窗口框 + 标题栏 + 控件块 —— 从视口到控件树",
}


def read(slug, name):
    p = os.path.join(BRAND, "sites", slug, name)
    with open(p, encoding="utf-8") as f:
        return f.read().strip()


def inline(svg, size, extra=""):
    return svg.replace('width="64" height="64"', f'width="{size}" height="{size}"', 1) \
              .replace('width="512" height="512"', f'width="{size}" height="{size}"', 1) \
              .replace("<svg ", f'<svg style="display:block;{extra}" ', 1)


CSS = """
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  color: #1f2328; font-size: 10.5pt; line-height: 1.65; }
h1 { font-size: 23pt; font-weight: 650; margin: 0 0 6px; letter-spacing: -0.5px; }
h2 { font-size: 14pt; font-weight: 650; margin: 26px 0 10px; padding-bottom: 5px;
  border-bottom: 1px solid #d1d9e0; }
h3 { font-size: 11pt; font-weight: 650; margin: 18px 0 6px; }
p, li { color: #32383f; }
small, .muted { color: #59636e; }
.cover { padding-top: 34mm; }
.cover .kicker { font-size: 9pt; letter-spacing: 2px; color: #2e7cf6; text-transform: uppercase; }
.cover .lead { font-size: 11.5pt; color: #32383f; margin-top: 14px; max-width: 150mm; }
.cover .meta { margin-top: 26px; font-size: 9pt; color: #59636e; }
.page { page-break-before: always; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e6e9ec; vertical-align: middle; }
th { font-weight: 650; color: #59636e; font-size: 8.5pt; letter-spacing: 0.4px; }
tr { page-break-inside: avoid; }
.mono { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 8.5pt; }
.chip { display: inline-block; width: 34px; height: 12px; border-radius: 3px;
  vertical-align: middle; margin-right: 6px; }
.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.card { border: 1px solid #e6e9ec; border-radius: 8px; padding: 10px; }
.card .cap { font-size: 8.5pt; color: #59636e; margin-top: 6px; }
.rowmarks { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
.note { background: #f6f8fa; border-left: 3px solid #2e7cf6; padding: 9px 12px;
  font-size: 9.5pt; margin: 12px 0; }
.warn { background: #fdf3ec; border-left: 3px solid #bc6d03; padding: 9px 12px;
  font-size: 9.5pt; margin: 12px 0; }
.bad { color: #a32d2d; }
ul { padding-left: 18px; }
li { margin: 3px 0; }
"""


def cover():
    return f"""
<div class="cover">
  <div class="kicker">tech-learning · brand system 1.1</div>
  <h1>站群 Logo 与视觉规范</h1>
  <p class="lead">11 个技术学习站点的标记系统：一个底板语言、11 个等距色相、4 种必备变体。
  全部为可编辑 SVG 几何路径，不含位图、渐变与文字。</p>
  <div class="meta">
    方向：A 模块方块 + 每站一色（OKLCH 同亮度同彩度，色相 32.7° 等距）<br>
    锚点色：<span class="mono">#2e7cf6</span>（architecture 的 Logo 底板）·
    文档主色由各自 Logo 色派生，见「文档主题色」<br>
    唯一源头：<span class="mono">shared/brand/build.py</span> · 手册由 guide.py 生成
  </div>
  <div class="rowmarks" style="margin-top:30px">
    {"".join(inline(read(p["dir"].split("/")[0], "logo.svg"), 44) for p in SPEC["palette"])}
  </div>
</div>
<div class="page">
<h2>为什么是这个方向</h2>
<p>11 个标记会大量并排出现（落地页网格、各站「站群导航」下拉、浏览器书签栏），因此家族一致性
优先于单体表现力。蓝底圆角方块提供统一底板，形状承担识别，颜色只做辅助——这也是在 16px
下仍能区分的前提。</p>
<table>
  <tr><th>方向</th><th>16px 可读</th><th>家族感</th><th>结论</th></tr>
  <tr><td>A 模块方块（采用）</td><td>好</td><td>最强</td><td>自带色块，网格排布整齐，深浅底边界清楚</td></tr>
  <tr><td>B 字母笔画</td><td>最好</td><td>中</td><td>视觉重量偏轻，卡片里显弱</td></tr>
  <tr><td>C 分层剖面</td><td class="bad">差</td><td>强</td><td>斜层在 16px 糊成一团</td></tr>
</table>
<div class="note"><b>统一亮度是硬约束。</b>11 个底板在 OKLCH 下取同一 L、同一 C，只换色相，
因此白色图案对每一块底板的对比度都落在 3.93–3.96，视觉重量完全一致。代价是黄绿色相在这
个亮度下必然偏暗（<span class="mono">js-ts #967f05</span>、<span class="mono">compiler #618d04</span>），
这是为了让白图在全部 11 站都站得住，不是选色失误。</div>
<p><small>色相按 32.7° 等距排布，红与粉相邻，暖色区必然拥挤。因此形状必须能独立完成识别：
把任一标记转成灰度，仍应能说出是哪一站。</small></p>
</div>"""


def marks():
    rows = []
    for p in SPEC["palette"]:
        slug = p["dir"].split("/")[0]
        if p.get("thirdParty"):
            rows.append(
                f'<tr><td>{inline(read(slug, "logo.svg"), 40)}</td>'
                f'<td>{p["name"]}<br><small class="mono">{p["site"]}</small></td>'
                f'<td>{SEMANTICS[p["site"]]}</td>'
                f'<td class="mono">{p["mark"]}</td>'
                f'<td class="mono">官方</td></tr>')
            continue
        rows.append(
            f'<tr><td>{inline(read(slug, "logo.svg"), 40)}</td>'
            f'<td>{p["name"]}<br><small class="mono">{p["site"]}</small></td>'
            f'<td>{SEMANTICS[p["site"]]}</td>'
            f'<td class="mono"><span class="chip" style="background:{p["tile"]}"></span>{p["tile"]}</td>'
            f'<td class="mono">{p["hueDeg"]}°</td></tr>')
    return f"""
<div class="page">
<h2>十一个标记</h2>
<table><tr><th style="width:52px"></th><th>站点</th><th>母题</th><th>底板色</th><th>色相</th></tr>
{"".join(rows)}</table>
</div>"""


def variants():
    head = "".join(f"<th>{c}</th>" for c in ("主标 logo.svg", "小尺寸 logo-small.svg",
                                             "深色 logo-dark.svg", "单色 logo-mono.svg"))
    rows = []
    for p in SPEC["palette"]:
        slug = p["dir"].split("/")[0]
        mono = ('<span class="muted">— 不提供</span>' if p.get("thirdParty")
                else inline(read(slug, "logo-mono.svg"), 40, "color:#1f2328"))
        rows.append(
            f'<tr><td><small>{p["site"]}</small></td>'
            f'<td>{inline(read(slug, "logo.svg"), 40)}</td>'
            f'<td>{inline(read(slug, "logo-small.svg"), 40)}</td>'
            f'<td style="background:#1b1b1d">{inline(read(slug, "logo-dark.svg"), 40)}</td>'
            f'<td>{mono}</td></tr>')
    return f"""
<div class="page">
<h2>四个必备变体</h2>
<p><b>9 个自研站</b>：同一份几何，四种用途——深色版只把底板提亮一档（亮度 0.255），图案仍是纯白；
单色版去掉底板、改用 <span class="mono">currentColor</span>，用于单色印刷与任意底色嵌入。</p>
<p><b>react / react-native</b>：只有官方定版的两档（浅底 <span class="mono">logo.svg</span>、
深底 <span class="mono">logo-dark.svg</span>）。小尺寸版是同一几何等比放大占位比，
不是重绘；<b>不提供单色版</b>，因为给他人商标做单色化属于改动。</p>
<table><tr><th>站点</th><th>主标</th><th>小尺寸</th><th>深色（#1b1b1d）</th><th>单色（2 站不提供）</th></tr>
{"".join(rows)}</table>
<div class="note">v1.0 的 favicon 用<b>小尺寸图案</b>：浏览器标签页实际只有 16px，
用完整图案会糊。logo.svg 保留完整图案，用于 32px 以上。</div>
</div>"""


def sizing():
    demo = next(p for p in SPEC["palette"] if p["site"] == "security")
    slug = "security"
    sizes = "".join(
        f'<div class="card"><div style="height:132px;display:flex;align-items:center;'
        f'justify-content:center">{inline(read(slug, "favicon.svg" if s <= 32 else "logo.svg"), s)}'
        f'</div><div class="cap" style="text-align:center">{s}px</div></div>'
        for s in (16, 32, 64, 128))
    clear = read(slug, "logo.svg")
    clear_svg = (
        '<svg width="200" height="200" viewBox="-46 -46 156 156" style="display:block">'
        '<rect x="-16" y="-16" width="96" height="96" fill="none" stroke="#2e7cf6"'
        ' stroke-width="1" stroke-dasharray="3 3"/>'
        '<g transform="translate(0,0)">' + clear.split(">", 1)[1].rsplit("</svg>", 1)[0] + "</g>"
        '<text x="32" y="-24" font-size="10" fill="#2e7cf6" text-anchor="middle"'
        ' font-family="-apple-system,PingFang SC">留白 ≥ 16 / 64</text></svg>')
    return f"""
<div class="page">
<h2>尺寸下限与实测</h2>
<p>实测尺寸（非等比缩放截图），从左到右 16 / 32 / 64 / 128 px：</p>
<div class="grid4">{sizes}</div>
<div class="note"><b>建议最小值（基于本次实测，不构成通用结论）：</b>
小尺寸版与 favicon ≥ 16px；主标 ≥ 32px；单色版 ≥ 20px。
低于这些尺寸时，圆角底板的曲率与最细的 4 单位描边会开始丢失。</div>

<h2>留白与最小间距</h2>
<div style="display:flex;gap:28px;align-items:center">
  {clear_svg}
  <div>
    <p>留白 = 底板宽度的 <b>1/4</b>（64 栅格即 16 单位），四周等量。任何相邻文字、
    其它标记、容器边缘都不得侵入该区域。</p>
    <p><small>落在深色底上时改用 logo-dark.svg，留白规则不变。</small></p>
  </div>
</div>

<h2>误用</h2>
<table>
  <tr><th>禁止</th><th>原因</th></tr>
  <tr><td>非等比拉伸</td><td>圆角与描边粗细失衡，16px 下会变形</td></tr>
  <tr><td>换成未登记的底色或图案色</td><td>破坏 11 站的等亮度关系，白图对比度失效</td></tr>
  <tr><td>加描边、投影、外发光</td><td>标记本身是平涂几何，加效果会在小尺寸变成脏边</td></tr>
  <tr><td>旋转、倾斜、拆分母题元素</td><td>母题的辨识依赖固定角度与相对位置</td></tr>
  <tr><td>在杂乱照片上直接放单色版</td><td>单色版靠形状识别，需要干净底或加实色底板</td></tr>
  <tr><td>把底板裁成非圆角方块</td><td>圆角 14/64 是家族的统一特征</td></tr>
</table>
</div>"""


def palette():
    def prow(p):
        if p.get("thirdParty"):
            return (f'<tr><td><small>{p["site"]}</small></td>'
                    f'<td class="mono" colspan="2">官方标志，无底板 · {p["mark"]}</td>'
                    f'<td class="muted" colspan="3">不适用</td></tr>')
        return (f'<tr><td><small>{p["site"]}</small></td>'
                f'<td class="mono"><span class="chip" style="background:{p["tile"]}"></span>{p["tile"]}</td>'
                f'<td class="mono"><span class="chip" style="background:{p["tileDark"]}"></span>{p["tileDark"]}</td>'
                f'<td class="mono">{p["contrastWhiteOnTile"]}</td>'
                f'<td class="mono">{p["contrastTileVsPage"]}</td>'
                f'<td class="mono">{p["contrastTileDarkVsDarkPage"]}</td></tr>')
    rows = "".join(prow(p) for p in SPEC["palette"])
    return f"""
<div class="page">
<h2>调色板</h2>
<table><tr><th>站点</th><th>浅色底</th><th>深色底</th><th>白图/底</th><th>底/白页</th><th>底/暗页</th></tr>
{rows}</table>
<p><small>对比度按 WCAG 相对亮度计算，全部 ≥ 3.9（非文本图形元素门槛为 3.0）。
深色底板对 <span class="mono">#1b1b1d</span> 页面约 5.0，因此不会在深色主题里沉下去。</small></p>

<h2>第三方商标（react / react-native）</h2>
<table>
  <tr><th>站点</th><th>权利人</th><th>官方源文件</th><th>SHA-256（前 16 位）</th></tr>
{{TPROWS}}
</table>
<div class="warn"><b>两个标志形状相同，这是官方事实而非失误。</b>React Native 没有独立的图形标志，
reactnative.dev 的头部标志就是 React 原子（青色描边版）。因此这两站在 11 个标记的网格里
只能靠<b>描边/填充</b>与<b>色相</b>区分，不能像其它 9 站那样靠形状区分。若你更看重网格里的
辨识度，可把 react-native 退回站群自研的「Bridge」母题（双侧立柱 + 通道），
执行时把该站从 <span class="mono">build.py</span> 的 <span class="mono">OFFICIAL</span> 里移除即可。</div>
<div class="note">官方标志的既有弱点一并继承：React Native 的 <span class="mono">#61DAFB</span>
在白底上对比度约 1.9:1，16px 下两者都会糊成色块。这是官方定版的结果，不做「优化」。</div>

<h2>权利与授权</h2>
<ul>
  <li><b>标志（9 站）</b>：architecture / observability / compiler / js-ts / browser /
      security / backend / webgl / gui 的母题为本次原创几何，未复制、未参考任何现有商标的造型；
      不构成商标可注册性判断，也未做冲突检索。</li>
  <li><b>标志（2 站）</b>：react 与 react-native 按要求直接使用官方标志，权利人
      <b>Meta Platforms, Inc.</b>，文件来自官方仓库（reactjs/react.dev 的
      <span class="mono">public/images/brand/</span>、facebook/react-native-website 的
      <span class="mono">header_logo.svg</span>）。几何、配色均未改动，<b>不提供单色版</b>
      ——改色或重绘等于修改他人商标。用途仅限指代该技术本身的教学站点，不暗示官方背书。</li>
  <li><b>字体</b>：系统内<b>不含任何文字</b>，因此不依赖字体授权，也不存在把字体转曲绕过许可的问题。
      站名一律由站点的 HTML 文本承担。</li>
  <li><b>图像</b>：无位图素材。所有 PNG 均由本仓 SVG 用 <span class="mono">rsvg-convert</span> 导出，
      可随时重新生成。</li>
  <li><b>旧资源</b>：<span class="mono">shared/static/img/{{logo,favicon}}.svg</span>（蓝底书本）已废弃并删除，
      其图形不再出现在任何站点。</li>
</ul>

<h2>复现与校验</h2>
<pre style="font-family:'SF Mono',Menlo,monospace;font-size:8.5pt;background:#f6f8fa;padding:10px 12px;border-radius:6px;overflow:auto">python3 shared/brand/build.py     # 11 站 SVG + 透明 PNG + 各站主题色 + brand-spec.json
python3 shared/brand/validate.py  # 结构 / 安全区 / 配色 / 对比度校验
python3 shared/brand/sheet.py     # 浅色、深色检查表
python3 shared/brand/guide.py     # 本手册
node    shared/sync-theme.mjs     # 分发 shared/brand/sites/ 与 shared/brand/theme/ 到各站</pre>

<h2>本版未覆盖</h2>
<ul>
  <li>商标检索与可注册性：未做，也不作承诺。</li>
  <li>跨渲染器一致性：只在 rsvg 与 Chrome 中核对过；未逐一验证所有浏览器与邮件客户端。</li>
  <li>动画版与动态 favicon：未制作。</li>
  <li>navbar 集成：各站配置目前只用文字标题，尚未接入 logo 图；接入属独立改动。</li>
  <li>无障碍：提供 <span class="mono">role="img"</span> 与 <span class="mono">&lt;title&gt;</span>，
      装饰性使用时应加 <span class="mono">aria-hidden</span>，落地页已按此处理。</li>
</ul>
</div>"""


def theme_colors():
    rows = []
    for p in SPEC["palette"]:
        t = p["theme"]
        hero = (f'<div style="height:15px;border-radius:3px;'
                f'background:linear-gradient(160deg,{t["heroFrom"]} 0%,'
                f'{t["heroMid"]} 45%,{t["heroTo"]} 100%)"></div>')
        rows.append(
            f'<tr><td><small>{p["site"]}</small></td>'
            f'<td class="mono"><span class="chip" style="background:{t["seed"]}"></span>{t["seed"]}</td>'
            f'<td class="mono"><span class="chip" style="background:{t["primary"]}"></span>{t["primary"]}</td>'
            f'<td class="mono"><span class="chip" style="background:{t["primaryDark"]}"></span>{t["primaryDark"]}</td>'
            f'<td class="mono">{t["contrastOnWhite"]} / {t["contrastOnDark"]}</td>'
            f'<td style="width:78px">{hero}</td></tr>')
    return f"""
<div class="page">
<h2>文档主题色</h2>
<p>Logo 的底板色是「白字压色块」的用法：白色图案对 11 块底板的对比度都在 3.93–3.96。
同一个颜色直接拿去当行内链接、正文强调色、按钮文字，就只有 3.9:1——<b>低于 WCAG AA
要求的 4.5:1</b>。要让「站点看起来确实是它的颜色」与「正文读得清」同时成立，
规则是<b>保色相、降亮度</b>：色相与彩度不动，只把亮度解到刚好过线。</p>

<table>
  <tr><th>站点</th><th>Logo 底板</th><th>浅色主题主色</th><th>深色模式主色</th>
      <th>对白页 / 对暗页</th><th>hero 渐变</th></tr>
  {"".join(rows)}
</table>

<div class="note"><b>派生规则</b>：OKLCH 色相与彩度保持不变，亮度下移约 <span class="mono">0.035</span>
（各站 ΔL 记在 <span class="mono">brand-spec.json</span> 的 <span class="mono">lumFromLogo</span>），使白底对比度落到 <span class="mono">4.54–4.57</span>；深色模式另解一档，
使 <span class="mono">#1b1b1d</span> 上的对比度同样过 4.5。色相偏移全部 &lt; 0.1°。</div>

<p>两个例外值得单独说明：</p>
<ul>
  <li><b>react</b>：官方蓝 <span class="mono">#087EA4</span> 本身对白底 4.64:1，已经过线，
      因此主色<b>就是官方色</b>，未做任何调整。</li>
  <li><b>react-native</b>：官方青 <span class="mono">#61DAFB</span> 对白底只有 1.9:1，
      当正文色不可能成立。压到同色相的 <span class="mono">#00819b</span> 才能过 AA——
      这是 11 站里唯一与 Logo 观感差别较大的一站，属于官方定色带来的必然结果。</li>
</ul>

<h3>落地方式（一处差异，其余共享）</h3>
<pre style="font-family:'SF Mono',Menlo,monospace;font-size:8.5pt;background:#f6f8fa;padding:10px 12px;border-radius:6px;overflow:auto">shared/theme/custom.css       11 站逐字节相同（版式、卡片、文档排版）
shared/brand/theme/&lt;站&gt;.css   每站一份主色令牌（浅色 / 深色 / hero 三档）
        ↓ node shared/sync-theme.mjs
&lt;站&gt;/src/css/brand.css         custom.css 的第一行 @import 它</pre>
<p><small>Infima 的 <span class="mono">--ifm-color-primary-contrast-background</span> 等变量
默认写死为蓝（<span class="mono">#ebf2fc</span>），不跟主色走。已在 brand.css 里用
<span class="mono">color-mix</span> 按主色显式派生，否则引用块、提示条会在绿站/红站里透出蓝底。</small></p>
</div>
"""


def main():
    TPROWS = "".join(
        f'<tr><td><small>{p["site"]}</small></td><td>{p["owner"]}</td>'
        f'<td class="mono" style="font-size:8pt">{p["source"]}</td>'
        f'<td class="mono">{" · ".join(v[:16] for v in p["sha256"].values())}</td></tr>'
        for p in SPEC["palette"] if p.get("thirdParty"))
    body = cover() + marks() + variants() + theme_colors() + sizing() + palette()
    body = body.replace("{TPROWS}", TPROWS)
    html = ("<!DOCTYPE html><html lang=\"zh-Hans\"><head><meta charset=\"utf-8\">"
            "<title>tech-learning 站群 Logo 与视觉规范</title><style>" + CSS +
            "</style></head><body>" + body +
            "</body></html>")
    out_html = os.path.join(BRAND, "out", "brand-guide.html")
    with open(out_html, "w", encoding="utf-8") as f:
        f.write(html)
    pdf = os.path.join(BRAND, "brand-guide.pdf")
    chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    # 本机 Chrome 在默认 headless 下会 SIGTRAP，需 --headless=new + 独立 profile
    subprocess.run([chrome, "--headless=new", "--no-sandbox", "--disable-gpu",
                    "--user-data-dir=/tmp/tl-brand-guide-profile",
                    "--no-pdf-header-footer", f"--print-to-pdf={pdf}",
                    "file://" + out_html],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("wrote", out_html)
    print("wrote", pdf)


if __name__ == "__main__":
    main()
