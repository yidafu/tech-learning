#!/usr/bin/env python3
"""把 11 个标记注入 landing/index.html 的卡片（幂等，可重复执行）。"""

import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BRAND = os.path.join(ROOT, "shared", "brand")
import importlib.util

spec = importlib.util.spec_from_file_location("build", os.path.join(BRAND, "build.py"))
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)

with open(os.path.join(BRAND, "brand-spec.json"), encoding="utf-8") as f:
    SPEC = json.load(f)

MARK_RE = re.compile(r'\n\s*<span class="mark"[\s\S]*?</span>')
CARD_RE = re.compile(r'(<a class="card" href="([a-z-]+)/">)')


def main():
    path = os.path.join(ROOT, "landing", "index.html")
    with open(path, encoding="utf-8") as f:
        html = f.read()

    html = MARK_RE.sub("", html)

    def inject(m):
        slug = m.group(2)
        entry = next(p for p in SPEC["palette"] if p["dir"].split("/")[0] == slug)
        if entry.get("thirdParty"):
            # 官方标志：原样引用，不加底板、不改色
            with open(os.path.join(BRAND, "sites", entry["site"], "logo.svg"), encoding="utf-8") as f:
                svg = f.read().strip()
            svg = svg.replace('width="64" height="64"', 'width="36" height="36"', 1)
        else:
            art = b.art_svg(entry["site"], "s", "#ffffff")
            svg = (f'<svg viewBox="0 0 64 64" width="36" height="36">'
                   f'<rect width="64" height="64" rx="14" fill="{entry["tile"]}"/>{art}</svg>')
        return m.group(1) + f'\n      <span class="mark" aria-hidden="true">{svg}</span>'


    html, n = CARD_RE.subn(inject, html)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"注入 {n} 个卡片标记")


if __name__ == "__main__":
    main()
