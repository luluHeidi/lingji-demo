#!/bin/bash

# 开发服务器启动脚本
# 用途：自动选择可用端口并启动开发服务器

DEFAULT_PORT=5173
MAX_PORT=5180
PROJECT_NAME="灵机系统"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 $PROJECT_NAME - 开发服务器"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查可用端口
PORT=$DEFAULT_PORT
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; do
    echo "⚠️  端口 $PORT 已被占用，尝试下一个端口..."
    PORT=$((PORT + 1))
    if [ $PORT -gt $MAX_PORT ]; then
        echo ""
        echo "❌ 所有预定端口 ($DEFAULT_PORT-$MAX_PORT) 都被占用"
        echo ""
        echo "建议操作："
        echo "  1. 运行清理脚本: ./scripts/clean-ports.sh"
        echo "  2. 手动停止占用进程"
        echo "  3. 检查是否有僵尸进程"
        echo ""
        exit 1
    fi
done

echo "✅ 使用端口: $PORT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📍 访问地址: http://localhost:$PORT"
echo "  ⏹  停止服务: Ctrl + C"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 启动开发服务器
if [ -f "package.json" ]; then
    # 如果是Node项目
    if command -v npm &> /dev/null; then
        echo "🟢 启动 npm 开发服务器..."
        npm run dev -- --port $PORT --host
    else
        echo "❌ 未找到 npm，请先安装 Node.js"
        exit 1
    fi
elif command -v python3 &> /dev/null; then
    # 静态HTML项目，使用Python服务器
    echo "🟢 启动 Python HTTP 服务器..."
    python3 -m http.server $PORT
elif command -v npx &> /dev/null; then
    # 使用npx serve
    echo "🟢 启动 npx serve..."
    npx serve -l $PORT
else
    echo "❌ 未找到可用的服务器工具"
    echo ""
    echo "请安装以下工具之一："
    echo "  - Python 3: brew install python3"
    echo "  - Node.js: brew install node"
    exit 1
fi
