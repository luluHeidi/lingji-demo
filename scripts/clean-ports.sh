#!/bin/bash

# 端口清理脚本
# 用途：清理灵机系统占用的旧端口（8080, 8081, 8082）

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🧹 灵机系统端口清理工具"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 检查灵机系统占用的旧端口..."
echo ""

PORTS_TO_CHECK=(8080 8081 8082)
CLEANED_COUNT=0
SKIPPED_COUNT=0

for PORT in "${PORTS_TO_CHECK[@]}"; do
    PID=$(lsof -ti:$PORT 2>/dev/null)
    if [ ! -z "$PID" ]; then
        PROCESS=$(ps -p $PID -o comm= 2>/dev/null)
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "发现: 端口 $PORT 被占用"
        echo "  进程ID: $PID"
        echo "  进程名: $PROCESS"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        read -p "是否停止该进程？(y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill -9 $PID 2>/dev/null
            if [ $? -eq 0 ]; then
                echo "✅ 已停止端口 $PORT 的占用进程"
                CLEANED_COUNT=$((CLEANED_COUNT + 1))
            else
                echo "❌ 停止失败，可能需要管理员权限"
            fi
        else
            echo "⏭️  跳过端口 $PORT"
            SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
        fi
        echo ""
    else
        echo "✓ 端口 $PORT 未被占用"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ 清理完成！"
echo "  已清理: $CLEANED_COUNT 个端口"
echo "  已跳过: $SKIPPED_COUNT 个端口"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
