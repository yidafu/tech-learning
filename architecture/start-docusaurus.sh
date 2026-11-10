#!/bin/bash
# 启动 Docusaurus 阅读站点（端口 8081；站点根 = 仓库根，配置在根目录）
#
# 用法:
#   ./start-docusaurus.sh        前台启动，Ctrl+C 停止
#   ./start-docusaurus.sh -b     启动并自动打开浏览器
#   ./start-docusaurus.sh -o     不启动，只打开浏览器（站点已在别处运行时用）
set -euo pipefail

SITE_DIR="$(cd "$(dirname "$0")" && pwd)"
URL="http://localhost:8081"

open_browser() { open "$URL"; }

# 站点已在运行：只提示/打开浏览器，不重复起服务
if curl -s -o /dev/null --connect-timeout 2 "$URL"; then
  echo "Docusaurus 阅读站点已在运行: $URL"
  [ "${1:-}" = "-b" ] || [ "${1:-}" = "-o" ] && open_browser
  exit 0
fi

if [ "${1:-}" = "-o" ]; then
  echo "站点未运行（$URL 无响应），先启动: ./start-docusaurus.sh"
  exit 1
fi

# 首次使用需安装依赖
if [ ! -d "$SITE_DIR/node_modules" ]; then
  echo "首次运行，安装依赖（npmmirror 镜像）..."
  (cd "$SITE_DIR" && npm install)
fi

# 后台延时打开浏览器（-b 时），不阻塞服务启动
if [ "${1:-}" = "-b" ]; then
  ( sleep 6; open_browser ) &
fi

echo "启动 Docusaurus 阅读站点: $URL （Ctrl+C 停止）"
cd "$SITE_DIR"
exec npm run dev
