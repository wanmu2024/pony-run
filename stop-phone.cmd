@echo off
rem 小马快跑 · 关闭手机访问（只停 pony 隧道并归还域名，不杀 ngrok 进程）
chcp 65001 >nul
echo === 关闭手机访问 ===
node "%~dp0tunnel-stop.mjs"
timeout /t 2 >nul
pause
