#!/usr/bin/env python3
"""将六份大型 React 学习大纲按 ## 章节拆分为目录 + 分章文件。
- 目录(## 目录)章节丢弃，由各目录 README.md 替代
- 超过 MAX_LINES 的章节再按 ### 二次拆分
- 拆分前做无损校验（重建 == 原文），失败则中止
- 改写跨文件链接 react-XXX.md -> ../react-XXX/README.md
"""
import os, re

WS = os.path.dirname(os.path.abspath(__file__))
MAX_LINES = 1800
DOCS = [
    "react-学习大纲.md",
    "react-进阶大纲-复杂场景.md",
    "react-高阶场景全景图.md",
    "react-高阶场景-第二辑.md",
    "react-组件库实战大纲.md",
    "react-源码复刻大纲.md",
]
BACKUP_DIR = "完整版备份"


def sanitize(name: str) -> str:
    name = re.sub(r"[^\w\u4e00-\u9fff]+", "-", name, flags=re.UNICODE)
    name = re.sub(r"-{2,}", "-", name).strip("-")
    return name[:40].rstrip("-") or "未命名"


FENCE_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})([^\n]*)$")


def fence_state_walker(lines, level_re):
    """CommonMark 规则的有状态围栏解析。
    在围栏内的所有行都是普通内容；只有同字符、长度不小于开栏、且行尾无其他内容的行才关闭围栏。
    逐行 yield (行, 是否标题, 标题文本)；level_re 只在围栏外匹配。"""
    open_char, open_len = None, 0
    for ln in lines:
        m = FENCE_RE.match(ln)
        if open_char is not None:
            if (m and m.group(1)[0] == open_char and len(m.group(1)) >= open_len
                    and m.group(2).strip() == ""):
                open_char = None
            yield ln, False, None
            continue
        if m and "`" not in m.group(2):
            open_char, open_len = m.group(1)[0], len(m.group(1))
            yield ln, False, None
            continue
        hm = re.match(level_re, ln)
        if hm:
            yield ln, True, hm.group(1).strip()
        else:
            yield ln, False, None


def parse_sections(lines, level_re):
    """按标题正则切分（围栏感知）。返回 [(heading_text, [含标题行的 body])]；首个标题前内容丢弃。"""
    sections, cur_head, cur_body = [], None, []
    for ln, is_head, htext in fence_state_walker(lines, level_re):
        if is_head:
            if cur_head is not None:
                sections.append((cur_head, cur_body))
            cur_head, cur_body = htext, [ln]
        else:
            cur_body.append(ln)
    if cur_head is not None:
        sections.append((cur_head, cur_body))
    return sections


def reconstruct(pre_lines, secs, original_lines):
    rebuilt = pre_lines[:]
    for _h, body in secs:
        rebuilt.extend(body)
    return rebuilt == original_lines


def link_fix(text: str) -> str:
    return re.sub(r"\((react-[^)#\s]+?)\.md(#[^)]*)?\)", r"(../\1/README.md)", text)


LEVELS = ["##", "###", "####"]


def build_blocks(head_text, display, body, level_idx, doc, parent_display=None):
    """body 以 head_text 对应的标题行开头，level_idx 指其在 LEVELS 中的层级。
    超过 MAX_LINES 且下一级标题 >= 2 个时，按下一级标题递归拆分。
    返回 [(key, display, body_lines, parent_display_or_None)]；
    parent_display 仅用于给续篇块生成"上一部分"引导语。"""
    if len(body) <= MAX_LINES or level_idx >= len(LEVELS) - 1:
        return [(head_text, display, body, parent_display)]
    next_re = rf"^{LEVELS[level_idx + 1]} (.+?)\s*$"
    subs = parse_sections(body[1:], next_re)
    if len(subs) < 2:
        return [(head_text, display, body, parent_display)]
    # 首个下级标题之前的导语内容并入第一子块，保证无损
    leading = []
    for ln, is_head, _t in fence_state_walker(body[1:], next_re):
        if is_head:
            break
        leading.append(ln)
    rebuilt = [body[0]] + leading
    for _sh, sb in subs:
        rebuilt.extend(sb)
    assert rebuilt == body, f"{doc}/{head_text}: 递归重建校验失败"
    out = [(head_text, f"{display} · {subs[0][0]}（本节起）",
            [body[0]] + leading + subs[0][1], parent_display)]
    for sh, sb in subs[1:]:
        # 文件名 key 只取末级标题（编号前缀 + 重名后缀保证唯一），display 保留完整层级链
        out.extend(build_blocks(sh, f"{display} · {sh}",
                                sb, level_idx + 1, doc, parent_display=display))
    return out


def main():
    report = []
    for doc in DOCS:
        path = os.path.join(WS, doc)
        with open(path, encoding="utf-8") as f:
            lines = f.read().splitlines(keepends=True)

        secs = parse_sections(lines, r"^## (.+?)\s*$")
        # preamble：第一个围栏外 ## 标题之前的内容
        pre_lines = []
        for ln, is_head, _t in fence_state_walker(lines, r"^## (.+?)\s*$"):
            if is_head:
                break
            pre_lines.append(ln)
        assert reconstruct(pre_lines, secs, lines), f"{doc}: ## 级重建校验失败"

        body_secs = [(h, b) for h, b in secs if h != "目录"]
        assert len(body_secs) == len(secs) - 1, f"{doc}: 未找到目录章节"

        # 组装最终块：(key 用于文件名, display 用于 README, body, parent_display)
        # 超长章节沿 ##→###→#### 递归下钻
        final = []
        for h, b in body_secs:
            final.extend(build_blocks(h, h, b, 0, doc))

        # 生成文件名
        used_names = set()
        items = []  # (fname, display, body, parent_display)
        for key, display, body, parent_display in final:
            fname = f"{len(items)+1:02d}-{sanitize(key)}.md"
            n = 1
            while fname in used_names:
                n += 1
                fname = f"{len(items)+1:02d}-{sanitize(key)}-{n}.md"
            used_names.add(fname)
            items.append((fname, display, body, parent_display))

        outdir = os.path.join(WS, doc[:-3])
        os.makedirs(outdir, exist_ok=True)
        for i, (fname, _display, body, parent_display) in enumerate(items):
            text = "".join(body)
            # 续篇块：在开头补"上一部分"真实链接
            if parent_display and not text.startswith("> 本文是"):
                prev_fname = items[i - 1][0]
                note = (
                    f"> 本文是《{parent_display}》按小节拆分后的续篇，"
                    f"上一部分见 [{prev_fname}]({prev_fname})。\n\n"
                )
                text = note + text
            text = link_fix(text)
            if not text.endswith("\n"):
                text += "\n"
            with open(os.path.join(outdir, fname), "w", encoding="utf-8") as f:
                f.write(text)

        # README（新目录）
        title = pre_lines[0].lstrip("# ").strip() if pre_lines and pre_lines[0].startswith("#") else doc[:-3]
        intro = "".join(pre_lines[1:]).strip()
        toc = [f"# {title}\n\n"]
        if intro:
            toc.append(intro + "\n\n")
        toc.append(
            f"> 本文档原为单文件（{len(lines)} 行），已按章节拆分为 {len(items)} 个文件，从下方目录按顺序阅读。"
            f"完整原件见 [完整版备份](../{BACKUP_DIR}/{doc})，更早的精简大纲见 [大纲原件备份](../大纲原件备份/)。\n\n"
            "## 分章目录\n\n"
        )
        for fname, display, _b, parent_display in items:
            if parent_display and not display.endswith("（本节起）"):
                toc.append(f"   - [{fname}]({fname}) — {display}\n")
            else:
                toc.append(f"- [{fname}]({fname}) — {display}\n")
        with open(os.path.join(outdir, "README.md"), "w", encoding="utf-8") as f:
            f.write("".join(toc))
        report.append(f"{doc} -> {doc[:-3]}/ : {len(items)} 个分章文件")

    print("\n".join(report))


if __name__ == "__main__":
    main()
