#!/bin/bash

# 端口检测脚本
# 用途：检查指定端口是否可用

PORT=$1

if [ -z "$PORT" ]; then
    echo "❌ 请提供端口号"
    echo "用法: ./check-port.sh 5173"
    exit 1
fi

echo "🔍 检查端口 $PORT ..."
echo ""

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  端口 $PORT 已被占用"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "占用详情："
    lsof -Pi :$PORT -sTCP:LISTEN
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 建议操作："
    echo "  1. 停止占用进程: kill -9 \$(lsof -ti:$PORT)"
    echo "  2. 使用备用端口: 5174, 5175, 5176"
    echo ""
    exit 1
else
    echo "✅ 端口 $PORT 可用"
    echo ""
    exit 0
fi
