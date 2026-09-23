#!/bin/bash
# 一键启动：自动安装依赖并同时拉起后端(3001)与前端(5173)
set -e
cd "$(dirname "$0")"

# 首次运行自动生成后端环境变量文件（管理员验证码等，按需修改）
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "==> 已生成 backend/.env（请编辑 ADMIN_CODE 设置管理员验证码）"
fi

echo "==> 安装后端依赖..."
(cd backend && npm install)

echo "==> 安装前端依赖..."
(cd frontend && npm install)

echo "==> 启动后端 http://localhost:3001 ..."
(cd backend && npm start) &
BACK_PID=$!

echo "==> 启动前端 http://localhost:5173 ..."
(cd frontend && npm run dev) &
FRONT_PID=$!

echo ""
echo "✅ 启动完成，浏览器打开 http://localhost:5173"
echo "   （手机端可用同一局域网 IP:5173 访问）"
echo "   按 Ctrl+C 停止全部服务"
echo ""

trap 'kill $BACK_PID $FRONT_PID 2>/dev/null' EXIT
wait
