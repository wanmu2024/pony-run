@echo off
rem 小马快跑 · 关闭手机访问（只停 pony 隧道，不动 ngrok 进程本身更安全）
chcp 65001 >nul
echo === 关闭手机访问 ===
node -e "fetch('http://127.0.0.1:4040/api/tunnels/pony',{method:'DELETE'}).then(r=>{console.log(r.status===204?'  ✔ 隧道 pony 已关闭（域名已释放）':'  返回状态 '+r.status)}).catch(()=>console.log('  ngrok 没在跑，无需关闭'))"
timeout /t 2 >nul
pause
