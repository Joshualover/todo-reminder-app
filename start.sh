#!/bin/bash

echo "🚀 启动待办清单应用..."
echo ""
echo "应用信息："
echo "  📁 位置: /root/.openclaw/workspace/todo-reminder-app"
echo "  🌐 访问: http://localhost:8000"
echo "  ⏹️  停止: Ctrl+C"
echo ""
echo "================================"
echo ""

cd /root/.openclaw/workspace/todo-reminder-app
python3 -m http.server 8000
