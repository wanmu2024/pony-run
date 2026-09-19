@echo off
rem 小马快跑（pony-run）一键启动：检查并拉起三个模块，然后打开门户
chcp 65001 >nul
setlocal
set ROOT=D:Al_Learning
echo === 小马快跑 · 启动检查 ===
echo.
rem 1) 远程通道：agent(7800) + relay(8800)
netstat -ano | findstr ":7800 " | findstr LISTENING >/dev/null || (echo [启动] CCremote agent ... & start "ccremote-agent" /min cmd /c "cd /d %ROOT%CCRemoteagent && node srcindex.js")
netstat -ano | findstr ":8800 " | findstr LISTENING >/dev/null || (echo [启动] CCremote relay ... & start "ccremote-relay" /min cmd /c "cd /d %ROOT%CCRemoteelay && node srcindex.js")
rem 2) 循环引擎面板(8765)
netstat -ano | findstr ":8765 " | findstr LISTENING >/dev/null || (echo [启动] gpt-cc-loop 面板 ... & start "gpt-cc-loop" /min cmd /c "cd /d %ROOT%gpt-cc-loop && node loop.mjs serve")
timeout /t 4 >nul
echo.
echo 打开门户（本机）...
start "" "%~dp0index.html"
echo.
echo 完成。手机访问： http://本机IP:8800/pony    （本机IP 用 ipconfig 查看）
echo 提示：面板默认仅本机；要手机看面板见 README。
endlocal
pause
