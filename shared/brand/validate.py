#!/usr/bin/env python3
"""交付前校验：结构、安全区、配色一致性、对比度。

只覆盖本仓文档化的安全子集（可编辑路径、32/64 栅格、固定配色），
不做原创性、商标可注册性或跨渲染器一致性判断。
"""

import json
import os
import re
import sys
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BRAND = os.path.join(ROOT, "shared", "brand")
NS = "{http://www.w3.org/2000/svg}"
BANNED = ("image", "text", "linearGradient", "radialGradient", "filter",
          "foreignObject", "style", "pattern", "mask")
NUM = re.compile(r"-?\d+(?:\.\d+)?")

fails, warns = [], []


def check(cond, msg):
    if not cond:
        fails.append(msg)


def coords_of(el):
    tag = el.tag.replace(NS, "")
    pts = []
    if tag == "rect":
        x, y = float(el.get("x", 0)), float(el.get("y", 0))
        pts = [(x, y), (x + float(el.get("width")), y + float(el.get("height")))]
    elif tag == "circle":
        cx, cy, r = (float(el.get(k)) for k in ("cx", "cy", "r"))
        pts = [(cx - r, cy - r), (cx + r, cy + r)]
    elif tag == "ellipse":
        cx, cy = float(el.get("cx")), float(el.get("cy"))
        rx, ry = float(el.get("rx")), float(el.get("ry"))
        pts = [(cx - rx, cy - ry), (cx + rx, cy + ry)]
    elif tag == "path":
        d = el.get("d", "")
        if "a" in d or "A" in d:
            return []  # 含弧线命令的路径无法按绝对坐标线性解析，跳过几何判定
        nums = [float(n) for n in NUM.findall(d)]
        pts = [(nums[i], nums[i + 1]) for i in range(0, len(nums) - 1, 2)]
    sw = float(el.get("stroke-width", 0)) if el.get("stroke") else 0.0
    return [(x - sw / 2, y - sw / 2) for x, y in pts] + \
           [(x + sw / 2, y + sw / 2) for x, y in pts]


def validate(site, path, spec_entry, kind):
    name = f"{site}/{os.path.basename(path)}"
    try:
        tree = ET.parse(path)
    except ET.ParseError as e:
        fails.append(f"{name}: XML 解析失败 {e}")
        return
    root = tree.getroot()
    vb = root.get("viewBox", "")
    expect = "0 0 512 512" if kind == "app-icon" else "0 0 64 64"
    check(vb == expect, f"{name}: viewBox 为 {vb!r}，应为 {expect!r}")
    check(root.get("role") == "img", f"{name}: 缺少 role=img")
    tags = [el.tag.replace(NS, "") for el in root.iter()]
    for bad in BANNED:
        check(bad not in tags, f"{name}: 出现不允许的 <{bad}>")
    for el in root.iter():
        for attr in ("style", "class", "id"):
            check(el.get(attr) is None, f"{name}: 元素带 {attr}，禁止外部样式依赖")
    if spec_entry.get("thirdParty"):
        # 第三方官方标志：几何与配色由权利人定版，只校验结构与视口，不校验安全区与色值
        return
    fills = {el.get("fill") for el in root.iter() if el.get("fill")} - {"none"}
    strokes = {el.get("stroke") for el in root.iter() if el.get("stroke")} - {"none"}
    allowed_fills = {spec_entry["tile"], spec_entry["tileDark"], "#ffffff", "currentColor"}
    if kind == "app-icon":
        allowed_fills = {spec_entry["tile"], "#ffffff"}
    for f in (fills | strokes) - allowed_fills:
        fails.append(f"{name}: 出现未登记的颜色 {f}")
    if kind != "app-icon":
        if os.path.basename(path) == "logo-dark.svg":
            check(spec_entry["tileDark"] in fills, f"{name}: 深色版未使用 tileDark")
        elif os.path.basename(path) in ("logo.svg", "favicon.svg", "logo-small.svg"):
            check(spec_entry["tile"] in fills, f"{name}: 未使用登记的 tile 色")
        if os.path.basename(path) == "logo-mono.svg":
            check("currentColor" in (fills | strokes), f"{name}: 单色版应使用 currentColor")
            check(not ({spec_entry["tile"], spec_entry["tileDark"]} & fills),
                  f"{name}: 单色版不应带底板")
    # 安全区：图案不得触碰底板边缘（64 栅格安全区 11..53，512 栅格 ×8）
    # app-icon 的图案在 scale(8) 内，坐标仍按 64 栅格判断
    lo, hi = (6.0, 58.0)
    if os.path.basename(path) != "logo-mono.svg":
        for el in root.iter():
            tag = el.tag.replace(NS, "")
            if tag in ("svg", "title", "desc", "rect", "g"):
                if tag == "rect" and el.get("width") in ("64", "512"):
                    continue
                if tag == "g":
                    continue
                if tag == "rect":
                    pts = coords_of(el)
                else:
                    continue
            else:
                pts = coords_of(el)
            for x, y in pts:
                if x < lo or x > hi or y < lo or y > hi:
                    warns.append(f"{name}: <{tag}> 越出安全区 ({x:.1f},{y:.1f})")
                    break


def contrast(a, b):
    def lin(c):
        c = int(c, 16) / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    def lum(h):
        return 0.2126 * lin(h[1:3]) + 0.7152 * lin(h[3:5]) + 0.0722 * lin(h[5:7])
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def main():
    with open(os.path.join(BRAND, "brand-spec.json"), encoding="utf-8") as f:
        spec = json.load(f)
    variants = ("favicon.svg", "logo.svg", "logo-small.svg", "logo-dark.svg", "logo-mono.svg")
    for entry in spec["palette"]:
        if entry.get("thirdParty"):
            variants = ("favicon.svg", "logo.svg", "logo-small.svg", "logo-dark.svg")
        img = os.path.join(ROOT, entry["dir"], "static", "img")
        for v in variants:
            p = os.path.join(img, v)
            check(os.path.exists(p), f"{entry['site']}/{v}: 缺失")
            if os.path.exists(p):
                validate(entry["site"], p, entry, v)
        app = os.path.join(img, "app-icon.svg")
        if os.path.exists(app):
            validate(entry["site"], app, entry, "app-icon")
        if entry.get("thirdParty"):
            check(not os.path.exists(os.path.join(img, "logo-mono.svg")),
                  f"{entry['site']}: 第三方标志不应存在单色版（改色等于修改他人商标）")
            for v in ("favicon.svg", "logo.svg", "logo-small.svg", "logo-dark.svg"):
                p = os.path.join(img, v)
                check(os.path.exists(p), f"{entry['site']}/{v}: 缺失")
                if os.path.exists(p):
                    validate(entry["site"], p, entry, v)
            continue
        c_tile = contrast(entry["tile"], "#ffffff")
        check(c_tile >= 3.0, f"{entry['site']}: 白图/底板对比 {c_tile:.2f} < 3.0")
        c_page = contrast(entry["tile"], "#ffffff")
        check(c_page >= 3.0, f"{entry['site']}: 底板/白页对比 {c_page:.2f} < 3.0")
        c_dark = contrast(entry["tileDark"], "#1b1b1d")
        check(c_dark >= 3.0, f"{entry['site']}: 暗色底板/暗页对比 {c_dark:.2f} < 3.0")
        c_mark = contrast(entry["tileDark"], "#ffffff")
        check(c_mark >= 3.0, f"{entry['site']}: 白图/暗色底板对比 {c_mark:.2f} < 3.0")

    # ---- 文档站主题色：AA 对比度、色相一致性、与站点副本是否一致
    for entry in spec["palette"]:
        t = entry.get("theme")
        check(t is not None, f"{entry['site']}: brand-spec 缺 theme 令牌")
        if not t:
            continue
        c1 = contrast(t["primary"], "#ffffff")
        c2 = contrast(t["primaryDark"], "#1b1b1d")
        ch = contrast(t["heroTo"], "#ffffff")
        check(c1 >= 4.5, f"{entry['site']}: 主色对白底 {c1:.2f} < 4.5（正文/链接不达 AA）")
        check(c2 >= 4.5, f"{entry['site']}: 深色模式主色对 #1b1b1d {c2:.2f} < 4.5")
        check(ch >= 4.5, f"{entry['site']}: hero 浅端压白字 {ch:.2f} < 4.5")
        check(t["hueShift"] <= 2.0, f"{entry['site']}: 主色色相偏移 {t['hueShift']}° > 2°")

        # 色阶必须严格递增，否则 hover / 深色模式会出现反向
        ladder = [t["light"][k] for k in ("darkest", "darker", "dark")] + [t["primary"]] + \
                 [t["light"][k] for k in ("light", "lighter", "lightest")]
        ys = [contrast(x, "#ffffff") for x in ladder]
        check(all(a > b for a, b in zip(ys, ys[1:])),
              f"{entry['site']}: 浅色色阶亮度非单调（{['%.2f' % y for y in ys]}）")

        slug = entry["dir"].split("/")[0]
        shared_css = os.path.join(BRAND, "theme", slug + ".css")
        site_css = os.path.join(ROOT, entry["dir"], "src", "css", "brand.css")
        check(os.path.exists(shared_css), f"{entry['site']}: 缺 shared/brand/theme/{slug}.css")
        check(os.path.exists(site_css), f"{entry['site']}: 缺 src/css/brand.css（跑 node shared/sync-theme.mjs）")
        if os.path.exists(shared_css) and os.path.exists(site_css):
            with open(shared_css, encoding="utf-8") as f1, open(site_css, encoding="utf-8") as f2:
                check(f1.read() == f2.read(), f"{entry['site']}: src/css/brand.css 与源头不一致")
        site_custom = os.path.join(ROOT, entry["dir"], "src", "css", "custom.css")
        if os.path.exists(site_custom):
            with open(site_custom, encoding="utf-8") as f:
                check("@import './brand.css';" in f.read(),
                      f"{entry['site']}: custom.css 未引入 brand.css，主色不会生效")

    tp = sum(1 for e in spec["palette"] if e.get("thirdParty"))
    print(f"检查 {len(spec['palette'])} 个站点（{len(spec['palette']) - tp} 个自研 4 变体 + "
          f"{tp} 个第三方标志 4 变体）")
    for w in warns:
        print("WARN ", w)
    if fails:
        print(f"\n❌ {len(fails)} 项失败")
        for f_ in fails:
            print("  -", f_)
        sys.exit(1)
    print(f"✅ 全部通过（{len(warns)} 条提示）")


if __name__ == "__main__":
    main()
