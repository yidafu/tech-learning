#!/usr/bin/env python3
"""tech-learning 站群 Logo 生成器（唯一源头）。

所有标记均由可编辑 SVG 几何路径构成：无位图、无渐变、无文字。
调色板从 OKLCH 均匀取色：同一 L、同一 C，仅色相按 32.7° 等距分布，
因此 11 个标记在深浅底上的视觉重量一致。

输出：
  shared/brand/brand-spec.json      调色板与规则（唯一源头）
  shared/brand/exports/*.png        透明 PNG（32/64/128/180/192/512）
  shared/brand/out/sheet-*.svg/png  浅色/深色检查表
  <站点>/static/img/favicon.svg  logo.svg  logo-small.svg  logo-mono.svg  logo-dark.svg
  （backend 额外输出 app-icon.svg + apple-touch-icon.png + icon-192/512.png）

用法：python3 shared/brand/build.py
"""

import json
import math
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BRAND = os.path.join(ROOT, "shared", "brand")

# ---------------------------------------------------------------- 色彩空间

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def linear_to_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def hex_to_oklch(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    r, g, b = srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = l ** (1 / 3), m ** (1 / 3), s ** (1 / 3)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    C = math.hypot(a, bb)
    H = math.degrees(math.atan2(bb, a)) % 360
    return L, C, H


def oklch_to_rgb(L, C, H):
    a = C * math.cos(math.radians(H))
    b = C * math.sin(math.radians(H))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    if min(r, g, bl) < -0.0005 or max(r, g, bl) > 1.0005:
        return None
    rgb = tuple(min(1, max(0, linear_to_srgb(v))) for v in (r, g, bl))
    return rgb


def rgb_luminance(rgb):
    r, g, b = rgb
    return 0.2126 * srgb_to_linear(r) + 0.7152 * srgb_to_linear(g) + 0.0722 * srgb_to_linear(b)


def to_hex(rgb):
    return "#" + "".join(f"{round(v * 255):02x}" for v in rgb)


def contrast(a, b):
    ya, yb = rgb_luminance(a), rgb_luminance(b)
    hi, lo = max(ya, yb), min(ya, yb)
    return (hi + 0.05) / (lo + 0.05)


ANCHOR = "#2e7cf6"
ANCHOR_RGB = tuple(int(ANCHOR[i:i + 2], 16) / 255 for i in (1, 3, 5))
ANCHOR_Y = rgb_luminance(ANCHOR_RGB)
_, ANCHOR_C, ANCHOR_H = hex_to_oklch(ANCHOR)
DARK_BG_RGB = (0x1b / 255, 0x1b / 255, 0x1d / 255)
LIGHT_BG_RGB = (1.0, 1.0, 1.0)


def solve(hue, target_y, chroma, chroma_scale=1.0):
    """在给定色相下找最接近目标亮度的颜色，色度不足自动降档以留在 sRGB 内。"""
    best, best_err = None, 9e9
    c = chroma * chroma_scale
    L = 0.30
    while L <= 0.86:
        cc = c
        rgb = None
        while cc > 0.005 and rgb is None:
            rgb = oklch_to_rgb(L, cc, hue)
            if rgb is None:
                cc -= 0.002
        if rgb is not None:
            err = abs(rgb_luminance(rgb) - target_y)
            if err < best_err:
                best, best_err = (L, cc, rgb), err
        L += 0.002
    return best


# ---------------------------------------------------------------- 站点定义
# k = 色相序位，自锚点色（#2e7cf6）起按 32.727° 递减：11 个刻度覆盖整圈。

SITES = [
    ("architecture", "软件架构学习笔记", "architecture", 0),
    ("react", "React 高阶学习课程", "react", 1),
    ("react-native", "ReactNative 原理学习站", "react-native", 2),
    ("observability", "可观测性学习站", "observability", 3),
    ("compiler", "编译原理学习站", "compiler", 4),
    ("js-ts", "JS/TS 深度学习笔记", "js-ts/docs-site", 5),
    ("browser", "浏览器与网络原理学习站", "browser", 6),
    ("security", "安全学习笔记", "security", 7),
    ("backend", "后端开发学习站", "backend", 8),
    ("webgl", "WebGL 与 3D 框架学习站", "webgl", 9),
    ("gui", "GUI 框架原理学习站", "gui", 10),
]

STEP = 360.0 / 11.0

# ---------------------------------------------------------------- 第三方官方标志
# react / react-native 两站按要求直接使用官方标志：原样引用，不重绘、不改色、不做单色版。
# 单色化、换底色包装都算修改他人标志，因此这两站只提供官方文件自带的明/暗两版。

OFFICIAL = {
    "react": {
        "light": "react-logo-light.svg",
        "dark": "react-logo-dark.svg",
        "owner": "Meta Platforms, Inc.",
        "mark": "#087ea4 · 暗版 #61dafb",
        "seed": "#087ea4",
        "source": "https://github.com/reactjs/react.dev/tree/main/public/images/brand",
        "usage": "指代 React 本身的教学站点标识，非官方背书，未改动几何与配色",
        "sha256": {
            "react-logo-light.svg": "ebdfad4916a4c4b5ec0bdf80fe9c8476a7cb8b7e925e502f78260098cd65a543",
            "react-logo-dark.svg": "e5278257e728c9527af74185f73f0715ffde03d713512aded478d832665e8f24",
        },
    },
    "react-native": {
        "light": "react-native-logo.svg",
        "dark": "react-native-logo.svg",
        "owner": "Meta Platforms, Inc.",
        "mark": "#61dafb",
        "seed": "#61dafb",
        "source": "https://github.com/facebook/react-native-website/tree/main/website/static/img/header_logo.svg",
        "usage": "指代 React Native 的教学站点标识，非官方背书，未改动几何与配色",
        "sha256": {
            "react-native-logo.svg": "69c5c70c9e616159b8a56a451881df40bf54eb93a258843ba62c5dff90c70817",
        },
    },
}


def official_inner(fname):
    path = os.path.join(BRAND, "official", fname)
    with open(path, encoding="utf-8") as f:
        s = f.read()
    s = re.sub(r"<\?xml[^>]*\?>", "", s)
    m = re.search(r"<svg[^>]*>", s)
    head = m.group(0)
    vb_match = re.search(r'viewBox="([^"]+)"', head)
    if vb_match:
        vb = [float(x) for x in vb_match.group(1).replace(",", " ").split()]
        w, h = vb[2], vb[3]
    else:  # 无 viewBox 时以 width/height 为用户单位（官方 RN 文件即如此）
        w = float(re.search(r'width="([\d.]+)"', head).group(1))
        h = float(re.search(r'height="([\d.]+)"', head).group(1))
    inner = s[m.end():].rsplit("</svg>", 1)[0]
    inner = re.sub(r"<title>.*?</title>", "", inner, flags=re.S)
    inner = re.sub(r'\s+id="[^"]*"', "", inner)
    # 根节点上的表现属性（如 RN 标志的 fill="none"）必须带进包装组，否则子路径按默认黑色填充
    attrs = ""
    for name in ("fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
                 "fill-rule", "stroke-miterlimit"):
        am = re.search(r'\s' + name + r'="([^"]*)"', head)
        if am:
            attrs += f' {name}="{am.group(1)}"'
    return inner.strip(), w, h, attrs


def official_svg(fname, label, fit=0.94):
    """原样嵌入官方路径，只做等比缩放与居中，不改颜色、不加底板。"""
    inner, w, h, attrs = official_inner(fname)
    scale = 64.0 * fit / max(w, h)
    tx = (64 - w * scale) / 2
    ty = (64 - h * scale) / 2
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"'
            ' role="img" aria-label="%s"><title>%s</title>'
            '<g%s transform="translate(%.3f,%.3f) scale(%.6f)">%s</g></svg>'
            ) % (label, label, attrs, tx, ty, scale, inner)

# ---------------------------------------------------------------- 几何（64 栅格）
# %A% = 图案色。所有路径为原创几何，安全区 x/y ∈ [11, 52]。

ARTS = {
    "architecture": (
        # 一朵云下挂两台服务器：云由三个圆与一条圆角横条并集而成
        '<circle cx="23" cy="23" r="7" fill="%A%"/>'
        '<circle cx="32" cy="18.5" r="8.5" fill="%A%"/>'
        '<circle cx="41" cy="23.5" r="6.5" fill="%A%"/>'
        '<rect x="20" y="23" width="25" height="8" rx="4" fill="%A%"/>'
        '<path d="M26 31 L23 39.5" fill="none" stroke="%A%" stroke-width="4" stroke-linecap="round"/>'
        '<path d="M38 31 L41 39.5" fill="none" stroke="%A%" stroke-width="4" stroke-linecap="round"/>'
        '<rect x="15.5" y="40.5" width="14" height="9" rx="2.5" fill="%A%"/>'
        '<rect x="34.5" y="40.5" width="14" height="9" rx="2.5" fill="%A%"/>',
        '<circle cx="23" cy="23" r="7.5" fill="%A%"/>'
        '<circle cx="32" cy="18" r="9" fill="%A%"/>'
        '<circle cx="41" cy="23.5" r="7" fill="%A%"/>'
        '<rect x="19" y="22.5" width="26" height="9" rx="4.5" fill="%A%"/>'
        '<path d="M26 31 L23 39" fill="none" stroke="%A%" stroke-width="6" stroke-linecap="round"/>'
        '<path d="M38 31 L41 39" fill="none" stroke="%A%" stroke-width="6" stroke-linecap="round"/>'
        '<rect x="14.5" y="39.5" width="15" height="10.5" rx="3" fill="%A%"/>'
        '<rect x="34.5" y="39.5" width="15" height="10.5" rx="3" fill="%A%"/>',
    ),
    "react": (
        '<ellipse cx="32" cy="32" rx="19" ry="7.5" fill="none" stroke="%A%" stroke-width="4"/>'
        '<ellipse cx="32" cy="32" rx="19" ry="7.5" fill="none" stroke="%A%" stroke-width="4"'
        ' transform="rotate(60 32 32)"/>'
        '<circle cx="32" cy="32" r="4.5" fill="%A%"/>',
        '<ellipse cx="32" cy="32" rx="19" ry="8" fill="none" stroke="%A%" stroke-width="7"/>'
        '<circle cx="32" cy="32" r="5.5" fill="%A%"/>',
    ),
    "react-native": (
        '<rect x="13" y="18" width="7" height="28" rx="3.5" fill="%A%"/>'
        '<rect x="44" y="18" width="7" height="28" rx="3.5" fill="%A%"/>'
        '<rect x="23" y="28" width="18" height="8" rx="4" fill="%A%"/>',
        '<rect x="12" y="17" width="9" height="30" rx="4.5" fill="%A%"/>'
        '<rect x="43" y="17" width="9" height="30" rx="4.5" fill="%A%"/>'
        '<rect x="23.5" y="27" width="17" height="10" rx="5" fill="%A%"/>',
    ),
    "observability": (
        # 望远镜：锥形筒 + 物镜罩 + 三脚架（把系统内部拉到眼前观测）
        '<path d="M24.3 43.5 L46.5 25.3 L39.5 17.7 L19.7 38.5 Z" fill="%A%"/>'
        '<path d="M39.7 32.8 L48.2 25.5 L39.8 15.7 L31.3 23 Z" fill="%A%"/>'
        '<path d="M31 33 L21 51" fill="none" stroke="%A%" stroke-width="4.5" stroke-linecap="round"/>'
        '<path d="M31 33 L41 51" fill="none" stroke="%A%" stroke-width="4.5" stroke-linecap="round"/>'
        '<path d="M31 33 L31.5 50" fill="none" stroke="%A%" stroke-width="4" stroke-linecap="round"/>',
        # 小尺寸只留筒 + 双腿，去掉中腿与折角，避免 16px 糊成一团
        '<path d="M24.3 43.5 L46.5 25.3 L39.5 17.7 L19.7 38.5 Z" fill="%A%"/>'
        '<path d="M39.7 32.8 L48.2 25.5 L39.8 15.7 L31.3 23 Z" fill="%A%"/>'
        '<path d="M31 33 L20 52" fill="none" stroke="%A%" stroke-width="7" stroke-linecap="round"/>'
        '<path d="M31 33 L42 52" fill="none" stroke="%A%" stroke-width="7" stroke-linecap="round"/>',
    ),
    "compiler": (
        # 三段结构：菱形=入料，漏斗+曲柄=绞肉机，三粒圆点=出料
        '<path d="M30 13.5 L34.5 18 L30 22.5 L25.5 18 Z" fill="%A%"/>'
        '<path d="M17 25 L43 25 L34 41 L26 41 Z" fill="%A%"/>'
        '<path d="M35 33 H43" fill="none" stroke="%A%" stroke-width="3.4" stroke-linecap="round"/>'
        '<circle cx="45.5" cy="33" r="3.2" fill="%A%"/>'
        '<circle cx="22.5" cy="47.2" r="3.4" fill="%A%"/>'
        '<circle cx="30" cy="47.2" r="3.4" fill="%A%"/>'
        '<circle cx="37.5" cy="47.2" r="3.4" fill="%A%"/>',
        # 小尺寸：柄与握把同步放大，三段在 16px 仍分层
        '<path d="M30 12.5 L35 17.5 L30 22.5 L25 17.5 Z" fill="%A%"/>'
        '<path d="M16 24.5 L44 24.5 L34.5 40.5 L25.5 40.5 Z" fill="%A%"/>'
        '<path d="M34 32.5 H43.5" fill="none" stroke="%A%" stroke-width="4.5" stroke-linecap="round"/>'
        '<circle cx="46" cy="32.5" r="3.6" fill="%A%"/>'
        '<circle cx="22" cy="47" r="3.6" fill="%A%"/>'
        '<circle cx="30" cy="47" r="3.6" fill="%A%"/>'
        '<circle cx="38" cy="47" r="3.6" fill="%A%"/>',
    ),
    "js-ts": (
        '<path d="M27.5 13 C22.5 13 22 16 22 20 V26.5 C22 30 19 32 15.5 32 C19 32 22 34 22 37.5'
        ' V44 C22 48 22.5 51 27.5 51" fill="none" stroke="%A%" stroke-width="5" stroke-linecap="round"/>'
        '<path d="M36.5 13 C41.5 13 42 16 42 20 V26.5 C42 30 45 32 48.5 32 C45 32 42 34 42 37.5'
        ' V44 C42 48 41.5 51 36.5 51" fill="none" stroke="%A%" stroke-width="5" stroke-linecap="round"/>',
        '<path d="M27 13 C21.5 13 21.5 16 21.5 21 V27 C21.5 30.5 17.5 32 15 32 C17.5 32 21.5 33.5 21.5 37'
        ' V43 C21.5 48 21.5 51 27 51" fill="none" stroke="%A%" stroke-width="6.5" stroke-linecap="round"/>'
        '<path d="M37 13 C42.5 13 42.5 16 42.5 21 V27 C42.5 30.5 46.5 32 49 32 C46.5 32 42.5 33.5 42.5 37'
        ' V43 C42.5 48 42.5 51 37 51" fill="none" stroke="%A%" stroke-width="6.5" stroke-linecap="round"/>',
    ),
    "browser": (
        '<circle cx="32" cy="32" r="19" fill="none" stroke="%A%" stroke-width="5"/>'
        '<ellipse cx="32" cy="32" rx="8.5" ry="19" fill="none" stroke="%A%" stroke-width="4"/>'
        '<path d="M13 32 H51" fill="none" stroke="%A%" stroke-width="4"/>',
        '<circle cx="32" cy="32" r="19" fill="none" stroke="%A%" stroke-width="7"/>'
        '<ellipse cx="32" cy="32" rx="8" ry="19" fill="none" stroke="%A%" stroke-width="6"/>',
    ),
    "security": (
        '<path fill="%A%" fill-rule="evenodd"'
        ' d="M32 12.5 L49 19 V32 C49 42 41.5 47.8 32 51.5 C22.5 47.8 15 42 15 32 V19 Z'
        ' M32 20 a5 5 0 1 0 0 10 a5 5 0 1 0 0 -10 Z'
        ' M29.6 30 H34.4 L33.6 38.5 H30.4 Z"/>',
        '<path fill="%A%" d="M32 12 L50 19 V32 C50 42.5 42 48 32 52 C22 48 14 42.5 14 32 V19 Z"/>',
    ),
    "backend": (
        '<rect x="19" y="11" width="26" height="42" rx="6" fill="none" stroke="%A%" stroke-width="5"/>'
        '<path d="M26 22 H38" fill="none" stroke="%A%" stroke-width="5" stroke-linecap="round"/>'
        '<path d="M26 32 H38" fill="none" stroke="%A%" stroke-width="5" stroke-linecap="round"/>'
        '<path d="M26 42 H38" fill="none" stroke="%A%" stroke-width="5" stroke-linecap="round"/>',
        '<rect x="19" y="11" width="26" height="42" rx="6" fill="none" stroke="%A%" stroke-width="7"/>'
        '<path d="M26 22 H38" fill="none" stroke="%A%" stroke-width="6" stroke-linecap="round"/>'
        '<path d="M26 40 H38" fill="none" stroke="%A%" stroke-width="6" stroke-linecap="round"/>',
    ),
    "webgl": (
        '<path d="M32 10 L51 21 V43 L32 54 L13 43 V21 Z" fill="none" stroke="%A%"'
        ' stroke-width="4.5" stroke-linejoin="round"/>'
        '<path d="M32 10 L51 21 L32 32 L13 21 Z" fill="none" stroke="%A%"'
        ' stroke-width="4" stroke-linejoin="round"/>'
        '<path d="M32 32 V54" fill="none" stroke="%A%" stroke-width="4.5"/>',
        '<path d="M32 10 L51 21 V43 L32 54 L13 43 V21 Z" fill="none" stroke="%A%"'
        ' stroke-width="8" stroke-linejoin="round"/>'
        '<path d="M32 32 V54" fill="none" stroke="%A%" stroke-width="8"/>',
    ),
    "gui": (
        '<rect x="12" y="15" width="40" height="34" rx="5" fill="none" stroke="%A%" stroke-width="5"/>'
        '<path d="M15 25 H49" fill="none" stroke="%A%" stroke-width="4"/>'
        '<rect x="18" y="32" width="13" height="10" rx="2.5" fill="%A%"/>',
        '<rect x="12" y="15" width="40" height="34" rx="5" fill="none" stroke="%A%" stroke-width="7"/>'
        '<path d="M15 25 H49" fill="none" stroke="%A%" stroke-width="6"/>',
    ),
}


def art_svg(site, variant, color):
    return ARTS[site][0 if variant == "n" else 1].replace("%A%", color)


def build_svgs(site_id, label, tile_light, tile_dark):
    w = art_svg(site_id, "n", "#ffffff")
    s = art_svg(site_id, "s", "#ffffff")
    head = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"'
            ' role="img" aria-label="%s"><title>%s</title>')
    svgs = {
        # favicon 只在浏览器标签页出现（实际 16px），因此用简化图案
        "favicon.svg": head % (label, label)
        + '<rect width="64" height="64" rx="14" fill="%s"/>' % tile_light + s + "</svg>",
        "logo.svg": head % (label, label)
        + '<rect width="64" height="64" rx="14" fill="%s"/>' % tile_light + w + "</svg>",
        "logo-small.svg": head % (label + "（小尺寸简化版）", label + "（小尺寸简化版）")
        + '<rect width="64" height="64" rx="14" fill="%s"/>' % tile_light + s + "</svg>",
        "logo-dark.svg": head % (label + "（深色背景版）", label + "（深色背景版）")
        + '<rect width="64" height="64" rx="14" fill="%s"/>' % tile_dark + w + "</svg>",
        "logo-mono.svg": head % (label + "（单色母题版）", label + "（单色母题版）")
        + art_svg(site_id, "n", "currentColor") + "</svg>",
    }
    return svgs


# ---------------------------------------------------------------- 主流程

# ---------------------------------------------------------------- 文档站主题色
# Logo 底板色是「白字压底板」的关系（约 3.9:1），直接当正文链接色不达 AA。
# 主题色沿用同一色相与彩度，只把亮度解到白底 4.5:1；深色模式另解一档到 #1b1b1d 上 4.5:1。
# 这样「看起来仍是该站的颜色」，但正文、按钮、行内链接都过 AA。

THEME_AA = 4.55  # 取 4.55 而非 4.5，避免四舍五入后卡在 4.49

# 相对主色的亮度偏移，沿用原手工色阶的比例（#2e7cf6 → #1e6de9 …）
THEME_STEPS = (("dark", -0.044), ("darker", -0.069), ("darkest", -0.139),
               ("light", 0.042), ("lighter", 0.066), ("lightest", 0.134))

Y_ON_WHITE = 1.05 / THEME_AA - 0.05
Y_ON_DARK = THEME_AA * (rgb_luminance(DARK_BG_RGB) + 0.05) - 0.05


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def clamped(L, C, H):
    """在 sRGB 内尽量保住彩度：越界就按 0.002 降档。"""
    cc = C
    while cc > 0.004:
        rgb = oklch_to_rgb(L, cc, H)
        if rgb is not None:
            return rgb, cc
        cc -= 0.002
    return oklch_to_rgb(min(1.0, max(0.0, L)), 0.0, H), 0.0


def solve_y(H, C, target_y):
    L, cc, rgb = solve(H, target_y, C)
    return L, cc, rgb


def theme_tokens(seed_hex):
    """把 Logo 色转成文档站主题色令牌（浅色 / 深色两套 + hero 三档）。"""
    L0, C0, H = hex_to_oklch(seed_hex)
    seed_rgb = hex_to_rgb(seed_hex)

    # 浅色模式的基色：白底正文 4.5:1
    if rgb_luminance(seed_rgb) <= Y_ON_WHITE:
        L_light, C_light, light_rgb = L0, C0, seed_rgb
    else:
        L_light, C_light, light_rgb = solve_y(H, C0, Y_ON_WHITE)

    # 深色模式的基色：#1b1b1d 上 4.5:1，且必须比浅色那档更亮
    if rgb_luminance(seed_rgb) >= Y_ON_DARK and L0 >= 0.62:
        L_dark, C_dark, dark_rgb = L0, C0, seed_rgb
    else:
        L_dark, C_dark, dark_rgb = solve_y(H, C0, Y_ON_DARK)

    def scale(L, C):
        out = {}
        for name, dL in THEME_STEPS:
            rgb, cc = clamped(L + dL, C, H)
            out[name] = to_hex(rgb)
        return out

    light = scale(L_light, C_light)
    dark = scale(L_dark, C_dark)
    primary, primary_dark = to_hex(light_rgb), to_hex(dark_rgb)

    return {
        "seed": seed_hex,
        "hue": round(H, 1),
        "chroma": round(C_light, 4),
        "primary": primary,
        "primaryDark": primary_dark,
        "light": light,
        "dark": dark,
        "heroFrom": light["darkest"],
        "heroMid": light["darker"],
        "heroTo": primary,
        "contrastOnWhite": round(contrast(light_rgb, LIGHT_BG_RGB), 2),
        "contrastOnDark": round(contrast(dark_rgb, DARK_BG_RGB), 2),
        "hueShift": round(abs((hex_to_oklch(primary)[2] - H + 180) % 360 - 180), 2),
        "lumFromLogo": round(L_light - L0, 4),
    }


THEME_CSS = """/* 文档站主题色 · %(site)s（%(name)s）
 * 由 shared/brand/build.py 生成，勿手改。
 * 链路：build.py → shared/brand/theme/%(slug)s.css → shared/sync-theme.mjs → src/css/brand.css
 *
 * 取色自 Logo 底板 %(seed)s：OKLCH %(hue)s° / C %(chroma)s / L %(seedL)s
 * 主色保留原色相与彩度，亮度下移到 L %(lightL)s，白底正文对比度 %(c1)s:1（AA ≥ 4.5）
 * 深色模式基色 L %(darkL)s，对 #1b1b1d 对比度 %(c2)s:1
 */

:root {
  --ifm-color-primary: %(primary)s;
  --ifm-color-primary-dark: %(l_dark)s;
  --ifm-color-primary-darker: %(l_darker)s;
  --ifm-color-primary-darkest: %(l_darkest)s;
  --ifm-color-primary-light: %(l_light)s;
  --ifm-color-primary-lighter: %(l_lighter)s;
  --ifm-color-primary-lightest: %(l_lightest)s;
  --ifm-link-color: var(--ifm-color-primary);

  /* Infima 的 contrast-* 默认是固定的蓝，不跟着主色走，这里显式派生。
     第一行是兜底：不支持 color-mix 的浏览器退回中性底色，而不是蓝。 */
  --ifm-color-primary-contrast-background: var(--ifm-color-emphasis-100);
  --ifm-color-primary-contrast-background: color-mix(in srgb, var(--ifm-color-primary) 9%%, #ffffff);
  --ifm-color-primary-contrast-foreground: %(hero_from)s;

  /* hero 自己就是深色面，固定用浅色主题那套，深色模式也不反转 */
  --brand-hero-from: %(hero_from)s;
  --brand-hero-mid: %(hero_mid)s;
  --brand-hero-to: %(hero_to)s;
}

html[data-theme='dark'] {
  --ifm-color-primary: %(primary_dark)s;
  --ifm-color-primary-dark: %(d_dark)s;
  --ifm-color-primary-darker: %(d_darker)s;
  --ifm-color-primary-darkest: %(d_darkest)s;
  --ifm-color-primary-light: %(d_light)s;
  --ifm-color-primary-lighter: %(d_lighter)s;
  --ifm-color-primary-lightest: %(d_lightest)s;

  --ifm-color-primary-contrast-background: color-mix(in srgb, var(--ifm-color-primary) 14%%, #1b1b1d);
  --ifm-color-primary-contrast-foreground: var(--ifm-color-primary);
}
"""


def theme_css(entry, t):
    L0 = hex_to_oklch(t["seed"])[0]
    L_light = hex_to_oklch(t["primary"])[0]
    L_dark = hex_to_oklch(t["primaryDark"])[0]
    return THEME_CSS % {
        "site": entry["site"], "name": entry["name"],
        "slug": entry["dir"].split("/")[0],
        "seed": t["seed"], "hue": t["hue"], "chroma": t["chroma"],
        "seedL": round(L0, 3), "lightL": round(L_light, 3), "darkL": round(L_dark, 3),
        "c1": t["contrastOnWhite"], "c2": t["contrastOnDark"],
        "primary": t["primary"], "primary_dark": t["primaryDark"],
        "l_dark": t["light"]["dark"], "l_darker": t["light"]["darker"],
        "l_darkest": t["light"]["darkest"], "l_light": t["light"]["light"],
        "l_lighter": t["light"]["lighter"], "l_lightest": t["light"]["lightest"],
        "d_dark": t["dark"]["dark"], "d_darker": t["dark"]["darker"],
        "d_darkest": t["dark"]["darkest"], "d_light": t["dark"]["light"],
        "d_lighter": t["dark"]["lighter"], "d_lightest": t["dark"]["lightest"],
        "hero_from": t["heroFrom"], "hero_mid": t["heroMid"], "hero_to": t["heroTo"],
    }


def main():
    palette = []
    os.makedirs(os.path.join(BRAND, "exports"), exist_ok=True)
    os.makedirs(os.path.join(BRAND, "out"), exist_ok=True)

    for site_id, label, folder, k in SITES:
        third_party = site_id in OFFICIAL
        if third_party:
            off = OFFICIAL[site_id]
            hue = None
            light_hex = light_rgb = dark_hex = None
            site_svgs = {
                "favicon.svg": official_svg(off["light"], label),
                "logo.svg": official_svg(off["light"], label),
                # 官方标志不做重绘简化，小尺寸版仅等比放大占位比（仍为原始几何）
                "logo-small.svg": official_svg(off["light"], label + "（小尺寸）", 0.99),
                "logo-dark.svg": official_svg(off["dark"], label + "（深色背景版）"),
            }
        else:
            hue = (ANCHOR_H - k * STEP) % 360
            if k == 0:
                light_hex, light_rgb = ANCHOR, ANCHOR_RGB
                dark_solved = solve(hue, 0.255, ANCHOR_C, 0.92)
                dark_hex = to_hex(dark_solved[2])
            else:
                light = solve(hue, ANCHOR_Y, ANCHOR_C)
                light_hex = to_hex(light[2])
                light_rgb = light[2]
                dark = solve(hue, 0.255, ANCHOR_C, 0.92)
                dark_hex = to_hex(dark[2])
            site_svgs = build_svgs(site_id, label, light_hex, dark_hex)
        # 唯一源头：shared/brand/sites/<slug>/，再由 sync-theme.mjs 分发到各站
        slug = folder.split("/")[0]
        src_dir = os.path.join(BRAND, "sites", slug)
        img_dir = os.path.join(ROOT, folder, "static", "img")
        os.makedirs(src_dir, exist_ok=True)
        os.makedirs(img_dir, exist_ok=True)
        for name, content in site_svgs.items():
            for d in (src_dir, img_dir):
                with open(os.path.join(d, name), "w", encoding="utf-8") as f:
                    f.write(content + "\n")

        # PWA 图标：11 站统一产出（app-icon.svg + apple-touch-icon/icon-192/icon-512），
        # 满幅不透明是硬要求——iOS 主屏不对 apple-touch-icon 做不透明化，透明角会渲染成黑边
        if third_party:
            # 官方标志无自绘艺术件：白底 + 标志等比居中（0.72 占位，留出 iOS 圆角遮罩安全区）。
            # 用嵌套 <svg> 交给 rsvg-convert 渲染，ImageMagick 会丢掉 <g stroke> 里的描边路径
            inner = re.sub(r'^\s*<svg[^>]*>|</svg>\s*$', '', site_svgs["logo.svg"], flags=re.S)
            app = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512"'
                   ' height="512" role="img" aria-label="%s"><title>%s</title>'
                   '<rect width="512" height="512" fill="#ffffff"/>'
                   '<svg x="72" y="72" width="368" height="368" viewBox="0 0 64 64">%s</svg>'
                   '</svg>') % (label, label, inner)
        else:
            app = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512"'
                   ' height="512" role="img" aria-label="%s"><title>%s</title>'
                   '<g transform="scale(8)"><rect width="64" height="64" fill="%s"/>'
                   '%s</g></svg>') % (label, label, light_hex, art_svg(site_id, "n", "#ffffff"))
        for d in (src_dir, img_dir):
            with open(os.path.join(d, "app-icon.svg"), "w", encoding="utf-8") as f:
                f.write(app + "\n")
        for px, name in ((180, "apple-touch-icon.png"), (192, "icon-192.png"),
                         (512, "icon-512.png")):
            for d in (src_dir, img_dir):
                subprocess.run(["rsvg-convert", "-w", str(px), "-h", str(px),
                                os.path.join(src_dir, "app-icon.svg"), "-o",
                                os.path.join(d, name)], check=True)

        # 透明 PNG（圆角外为透明）：16/32 用简化图案，48 以上用完整图案
        exports = []
        for px in (16, 32, 48, 64, 128, 180, 192, 512):
            src = "favicon.svg" if px <= 32 else "logo.svg"
            out = os.path.join(BRAND, "exports", f"{site_id}-{px}.png")
            subprocess.run(["rsvg-convert", "-w", str(px), "-h", str(px),
                            os.path.join(src_dir, src), "-o", out], check=True)
            exports.append(out)

        if third_party:
            palette.append({
                "site": site_id,
                "name": label,
                "dir": folder,
                "thirdParty": True,
                "hueDeg": None,
                "tile": None,
                "tileDark": None,
                "mark": off["mark"],
                "owner": off["owner"],
                "source": off["source"],
                "usage": off["usage"],
                "sha256": off["sha256"],
                "monoVariant": "not-produced",
            })
            continue

        w_on_light = contrast(light_rgb, LIGHT_BG_RGB)
        w_on_tile = contrast(light_rgb, (1.0, 1.0, 1.0))
        dark_rgb = tuple(int(dark_hex[i:i + 2], 16) / 255 for i in (1, 3, 5))
        palette.append({
            "site": site_id,
            "name": label,
            "dir": folder,
            "thirdParty": False,
            "hueDeg": round(hue, 1),
            "tile": light_hex,
            "tileDark": dark_hex,
            "mark": "#ffffff",
            "contrastTileVsPage": round(w_on_light, 2),
            "contrastWhiteOnTile": round(w_on_tile, 2),
            "contrastTileDarkVsDarkPage": round(contrast(dark_rgb, DARK_BG_RGB), 2),
            "contrastMarkVsTileDark": round(contrast(dark_rgb, (1.0, 1.0, 1.0)), 2),
        })

    # ---- 文档站主题色：由 Logo 色派生，写 shared/brand/theme/<站>.css
    theme_dir = os.path.join(BRAND, "theme")
    os.makedirs(theme_dir, exist_ok=True)
    for entry in palette:
        seed = entry["tile"] if not entry.get("thirdParty") else OFFICIAL[entry["site"]]["seed"]
        t = theme_tokens(seed)
        entry["theme"] = t
        slug = entry["dir"].split("/")[0]
        with open(os.path.join(theme_dir, slug + ".css"), "w", encoding="utf-8") as f:
            f.write(theme_css(entry, t))

    spec = {
        "name": "tech-learning 站群 Logo 系统",
        "version": "1.1.0",
        "source": "shared/brand/build.py 为唯一源头；调色板由该脚本生成，勿手改各站副本",
        "direction": "A 模块方块 + 每站一色（OKLCH 同 L 同 C，色相等距 32.7°）",
        "geometry": {
            "grid": 64,
            "tile": {"x": 0, "y": 0, "w": 64, "h": 64, "rx": 14},
            "artSafeArea": [11, 11, 53, 53],
            "minStroke": 4,
            "strokeLinecap": "round",
        },
        "colorRules": {
            "markOnTile": "#ffffff",
            "monoVariant": "currentColor，无底板",
            "lightTileLuminance": round(ANCHOR_Y, 4),
            "darkTileLuminance": 0.255,
            "note": "每站色相不同但亮度/彩度一致，保证深浅底上重量相同；形状承担主要识别，颜色为辅助",
        },
        "clearSpace": "四周留白 ≥ 16/64 底板宽（即底板的 1/4），任何场合不得小于此值",
        "minSize": {"logo.svg": "32px", "logo-small.svg": "16px",
                    "favicon.svg": "16px", "logo-mono.svg": "20px"},
        "sizes": [16, 32, 64, 128],
        "fonts": "无。所有标记为几何路径，不依赖任何字体，无字体授权风险",
        "rights": "9 个母题为原创几何；react / react-native 按站主要求直接使用官方标志（原样引用，见 thirdParty）",
        "thirdParty": {k: {"owner": v["owner"], "source": v["source"], "usage": v["usage"],
                           "sha256": v["sha256"]} for k, v in OFFICIAL.items()},
        "themeColor": {
            "source": "各站 Logo 底板色（第三方站取其官方标志主色）",
            "rule": "保留 OKLCH 色相与彩度，只把亮度解到白底 4.55:1；深色模式另一档解到 #1b1b1d 上 4.55:1",
            "why": "Logo 底板是白字压底的用法（约 3.9:1），当正文链接色不达 AA；同一色相压暗一档即可过线，观感仍是该站颜色",
            "perSite": "见 palette[].theme，产物 shared/brand/theme/<站>.css",
            "steps": dict(THEME_STEPS),
        },
        "palette": palette,
    }
    with open(os.path.join(BRAND, "brand-spec.json"), "w", encoding="utf-8") as f:
        json.dump(spec, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"{'site':<14}{'hue':>6}  {'tile':<9}{'dark':<9}{'白/底':>7}{'底/白页':>8}{'暗底':>7}")
    _theme_rows = []
    for p in palette:
        if p["thirdParty"]:
            print(f"{p['site']:<14}{'官方':>6}  {'第三方标志（原样引用，无底板）'}")
            continue
        print(f"{p['site']:<14}{p['hueDeg']:>6}  {p['tile']:<9}{p['tileDark']:<9}"
              f"{p['contrastWhiteOnTile']:>7}{p['contrastTileVsPage']:>8}"
              f"{p['contrastTileDarkVsDarkPage']:>7}")

    print()
    print(f"{'site':<14}{'logo':<9}{'primary':<9}{'link/白':>8}{'暗模式':<9}{'暗/暗底':>8}{'ΔL':>8}")
    for p in palette:
        t = p["theme"]
        print(f"{p['site']:<14}{t['seed']:<9}{t['primary']:<9}{t['contrastOnWhite']:>8}"
              f"{t['primaryDark']:<9}{t['contrastOnDark']:>8}{t['lumFromLogo']:>8}")


if __name__ == "__main__":
    main()
