#!/usr/bin/env python3
"""生成浅色/深色检查表与尺寸检查（不产出交付物，只做验证）。"""

import importlib.util
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BRAND = os.path.join(ROOT, "shared", "brand")
spec = importlib.util.spec_from_file_location("build", os.path.join(BRAND, "build.py"))
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)

FONT = "PingFang SC, Helvetica Neue, Arial, sans-serif"
COLS = [("96", 190, 96), ("48", 306, 48), ("32", 372, 32), ("16", 414, 16),
        ("小尺寸版 16", 444, 16), ("单色 32", 570, 32)]
ROW = 108


def nested(site, name, size, x, y):
    """第三方官方标志：直接嵌入其文件，不重绘。"""
    s = read_svg(site, name)
    s = s.replace("<svg ", f'<svg x="{x}" y="{y}" ', 1)
    return s.replace('width="64" height="64"', f'width="{size}" height="{size}"', 1)


def read_svg(site, name):
    with open(os.path.join(b.BRAND, "sites", site, name), encoding="utf-8") as f:
        return f.read().strip()


def group(art, size, x, y, tile, mark_color):
    s = size / 64.0
    inner = art.replace("%A%", mark_color)
    plate = ('<rect width="64" height="64" rx="14" fill="%s"/>' % tile) if tile else ""
    return (f'<g transform="translate({x},{y}) scale({s:.5f})">{plate}{inner}</g>')


def sheet(dark):
    bg = "#1b1b1d" if dark else "#ffffff"
    fg = "#e6edf3" if dark else "#1f2328"
    muted = "#9198a1" if dark else "#59636e"
    line = "#30363d" if dark else "#d1d9e0"
    H = 64 + len(b.SITES) * ROW + 16
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 {H}" width="680" height="{H}">',
           f'<rect width="680" height="{H}" fill="{bg}"/>',
           f'<text x="24" y="30" font-family="{FONT}" font-size="13" fill="{fg}">'
           f'tech-learning · Logo 检查表（{"深色" if dark else "浅色"}底）</text>']
    for i, (site_id, label, folder, k) in enumerate(b.SITES):
        entry = next(p for p in SPEC["palette"] if p["site"] == site_id)
        tile = entry["tileDark"] if dark else entry["tile"]
        y = 56 + i * ROW
        cy = y + 48
        out.append(f'<text x="24" y="{cy - 6}" font-family="{FONT}" font-size="12" fill="{fg}">{site_id}</text>')
        cap = entry["mark"] if entry.get("thirdParty") else tile
        out.append(f'<text x="24" y="{cy + 12}" font-family="{FONT}" font-size="10" fill="{muted}">{cap}</text>')
        if entry.get("thirdParty"):
            for idx, (cap, x, size) in enumerate(COLS):
                if idx == 5:
                    out.append(f'<text x="{x}" y="{cy}" font-family="{FONT}" font-size="10"'
                               f' fill="{muted}" dominant-baseline="central">—</text>')
                    continue
                name = "logo-dark.svg" if (dark and idx in (0, 2)) else "logo.svg"
                if idx == 4:
                    name = "logo-small.svg"
                out.append(nested(site_id, name, size, x, cy - size // 2))
            if i < len(b.SITES) - 1:
                out.append(f'<line x1="24" y1="{y + ROW - 6}" x2="656" y2="{y + ROW - 6}"'
                           f' stroke="{line}" stroke-width="0.5"/>')
            continue
        art_n = b.art_svg(site_id, "n", "#ffffff")
        art_s = b.art_svg(site_id, "s", "#ffffff")
        art_m = b.art_svg(site_id, "n", "#ffffff" if dark else "#1f2328")
        for idx, (cap, x, size) in enumerate(COLS):
            if idx == 4:
                g = group(art_s, size, x, cy - size // 2, tile, "#ffffff")
            elif idx == 5:
                g = group(art_m, size, x, cy - size // 2, None, "#ffffff" if dark else "#1f2328")
            else:
                g = group(art_n, size, x, cy - size // 2, tile, "#ffffff")
            out.append(g)
        if i < len(b.SITES) - 1:
            out.append(f'<line x1="24" y1="{y + ROW - 6}" x2="656" y2="{y + ROW - 6}"'
                       f' stroke="{line}" stroke-width="0.5"/>')
    out.append("</svg>")
    return "\n".join(out)


if __name__ == "__main__":
    import json
    with open(os.path.join(BRAND, "brand-spec.json"), encoding="utf-8") as f:
        SPEC = json.load(f)
    for dark in (False, True):
        name = "sheet-dark" if dark else "sheet-light"
        svg_path = os.path.join(BRAND, "out", name + ".svg")
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(sheet(dark))
        subprocess.run(["rsvg-convert", "-z", "1.4", svg_path, "-o",
                        os.path.join(BRAND, "out", name + ".png")], check=True)
        print("wrote", svg_path)
