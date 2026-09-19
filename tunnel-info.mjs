// 读取本机 ngrok 隧道信息，打印手机可用地址（供 start-phone.cmd 调用）
const PORTS = [4040, 4041];
const get = async (port) => {
  const r = await fetch(`http://127.0.0.1:${port}/api/tunnels`, { signal: AbortSignal.timeout(4000) });
  return r.json();
};
let data = null;
for (const p of PORTS) {
  try {
    data = await get(p);
    if (data && Array.isArray(data.tunnels)) break;
  } catch {
    /* 换下一个端口 */
  }
}
if (!data || !Array.isArray(data.tunnels) || data.tunnels.length === 0) {
  console.log("  ❌ 没读到隧道：ngrok 可能没在跑，或隧道还没建好（等几秒重试）");
  process.exit(1);
}
const relay = data.tunnels.find((t) => String((t.config && t.config.addr) || "").includes("8800")) || data.tunnels[0];
const base = String(relay.public_url).replace(/\/$/, "");
console.log("");
console.log("  ┌─────────────────────────────────────────────────────────────");
console.log("  │ 📱 手机（任意网络，不用连公司 WiFi）打开：");
console.log(`  │    门户     ${base}/pony`);
console.log(`  │    面板     ${base}/panel/        （首次要口令）`);
console.log(`  │    审批页   ${base}/`);
console.log("  ├─────────────────────────────────────────────────────────────");
console.log(`  │ 本地目标：${(relay.config && relay.config.addr) || "-"}（小马快跑 relay）`);
console.log("  │ 用完请双击 stop-phone.cmd 收回（公网暴露越短越安全）");
console.log("  └─────────────────────────────────────────────────────────────");
