// 关闭 pony 隧道（DELETE 归还域名，不杀 ngrok 进程）
for (const port of [4040, 4041]) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/tunnels/pony`, { method: "DELETE", signal: AbortSignal.timeout(4000) });
    if (r.status === 204 || r.ok) {
      console.log("  ✔ 隧道 pony 已关闭（域名已归还）");
      process.exit(0);
    }
    console.log("  返回状态：" + r.status + "（可能本来就没有 pony 隧道）");
    process.exit(0);
  } catch {
    /* 换下一个端口 */
  }
}
console.log("  ngrok 没在运行，无需关闭");
