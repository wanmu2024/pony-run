@echo off
rem 小马快跑 · 开启手机访问（ngrok 隧道 → 本机 relay 8800）
chcp 65001 >nul
setlocal
set NGROK=D:AuraoraOsd	ools
grok
grok.exe
set CONF=D:AuraoraOsd	ools
grok
grok.yml
echo === 小马快跑 · 开启手机访问 ===
tasklist | findstr /i ngrok >nul
if errorlevel 1 (
  echo [启动] ngrok 隧道 pony  ^(本机 8800^) ...
  start "ngrok-pony" /min "%NGROK%" start pony --config "%CONF%" --log "%TEMP%
grok-pony.log"
  timeout /t 8 >nul
) else (
  echo [提示] ngrok 已在运行；若隧道里没有 pony，请先双击 stop-phone.cmd 再重试
  timeout /t 2 >nul
)
echo.
node "%~dp0tunnel-info.mjs"
echo.
pause
endlocal
