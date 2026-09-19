@echo off
rem 小马快跑 · 开启手机访问（ngrok 隧道 → 本机 relay 8800）
chcp 65001 >nul
setlocal
set NGROK=D:\AuraoraOsd\tools\ngrok\ngrok.exe
set CONF=D:\AuraoraOsd\tools\ngrok\ngrok.yml
set LOG=%TEMP%\ngrok-pony.log

echo === 小马快跑 · 开启手机访问 ===

tasklist | findstr /i ngrok.exe >nul
if errorlevel 1 (
  echo [启动] 拉起 ngrok 隧道 pony ^(指向本机 8800^) ...
  start "ngrok-pony" /min "%NGROK%" start pony --config "%CONF%" --log "%LOG%"
) else (
  echo [检测] ngrok 已在运行，检查隧道 ...
  curl -s -m 3 http://127.0.0.1:4040/api/tunnels | findstr /c:"public_url" >nul
  if errorlevel 1 (
    echo [重启] 当前没有隧道，重启 ngrok 并加载 pony 隧道 ...
    taskkill /f /im ngrok.exe >nul 2>&1
    timeout /t 2 >nul
    start "ngrok-pony" /min "%NGROK%" start pony --config "%CONF%" --log "%LOG%"
  )
)

timeout /t 8 >nul
node "%~dp0tunnel-info.mjs"
echo.
pause
endlocal
