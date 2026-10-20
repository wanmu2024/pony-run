// 用真实 Chrome 打开 demo，抓控制台报错 + 驱动交互，验证每个界面都真的渲染出来
// 用法: node _verify.mjs <html文件绝对路径>
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const file = process.argv[2];
if (!file) { console.error('用法: node _verify.mjs <html路径>'); process.exit(1); }

const profile = mkdtempSync(join(tmpdir(), 'ponyverify-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find(t => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('连不上 Chrome 调试口');
}

const ws = new WebSocket(await target());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const waiting = new Map();
const problems = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); return; }
  // 控制台报错 / 未捕获异常
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    problems.push('未捕获异常: ' + (d.exception?.description || d.text));
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    problems.push('console.error: ' + m.params.args.map(a => a.value ?? a.description).join(' '));
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    const e = m.params.entry;
    if (!/favicon|net::ERR_FILE_NOT_FOUND/.test(e.text)) problems.push('日志错误: ' + e.text);
  }
};
const send = (method, params = {}) => new Promise(res => {
  const i = ++id; waiting.set(i, res);
  ws.send(JSON.stringify({ id: i, method, params }));
});

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Page.navigate', { url: 'file:///' + file.replace(/\\/g, '/') });
await sleep(1200);

const evalJs = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) return { err: r.result.exceptionDetails.exception?.description };
  return { val: r.result?.result?.value };
};

// 检查：某个选择器/文案在页面上真的存在。失败时把当前页面文案打出来，方便判断是代码错还是测试错
async function expect(label, expr) {
  const { val, err } = await evalJs(expr);
  const ok = err ? false : !!val;
  console.log((ok ? '  ✅ ' : '  ❌ ') + label + (err ? '  → ' + err : ''));
  if (!ok) {
    const dump = await evalJs('document.body.innerText.replace(/\\n+/g," / ").slice(0,240)');
    console.log('     当前页面: ' + (dump.val || dump.err));
    problems.push('检查未通过: ' + label + (err ? ' (' + err + ')' : ''));
  }
}

// 注意：这些返回的是「要丢给浏览器求值的表达式字符串」，不是布尔值。
// 千万不能用 JS 的 && / ! 去拼它们 —— 那会退化成字符串运算，检查会假通过。
const has = t => `document.body.innerText.includes(${JSON.stringify(t)})`;
const not = t => `!document.body.innerText.includes(${JSON.stringify(t)})`;
const all = (...parts) => '(' + parts.join(' && ') + ')';

console.log('\n【门户】');
await expect('页面渲染出内容（不是黑屏）', 'document.querySelector("#screen").children.length > 0');
await expect('标题「小马快跑」', has('小马快跑'));
await expect('模块「多AI 协同」', has('多AI 协同'));
await expect('模块「CCRemote」', has('CCRemote'));
await expect('模块「规则与资料」', has('规则与资料'));

console.log('\n【多AI 协同 / 锁】');
await evalJs('go("loop")'); await sleep(150);
await expect('工作流列表渲染', has('登录模块重构'));
await expect('详情页渲染', has('与 GPT 的「登录重构」对话'));
await expect('锁条（自己持有）', has('正在操作'));
await expect('锁条有释放按钮', has('释放锁'));

console.log('\n【「怎么跑」抽屉】');
await evalJs('U.drawer=false; render()'); await sleep(150);
await expect('默认收起（看不到三步配置）', not('现在做什么'));
await expect('收起时摘要显示当前配置',
  all(has('怎么跑'), has('用户中心'), has('登录重构专项')));
await expect('对话是主体', has('对话'));
await evalJs('toggleDrawer()'); await sleep(180);
await expect('点开露出三步 + 自动提交', all(has('现在做什么'), has('在哪个项目里做'), has('给它一句提示词'), has('改完要不要自动提交')));
await evalJs('toggleDrawer()'); await sleep(180);
await expect('再点收起', not('现在做什么'));

console.log('\n【列表收起】');
await evalJs('U.listOpen=true; U.drawer=false; setMode("desktop"); render()'); await sleep(200);
await expect('电脑视图下列表可见', '(document.querySelector(".pane-list")||{offsetWidth:0}).offsetWidth > 0');
await evalJs('toggleList()'); await sleep(200);
await expect('收起后列表整栏隐藏', '(document.querySelector(".pane-list")||{offsetWidth:0}).offsetWidth === 0');
await expect('收起后详情占满', '(document.querySelector(".pane-detail")||{offsetWidth:0}).offsetWidth > 500');
await expect('顶部出现展开入口', has('»'));
await evalJs('toggleList()'); await sleep(200);
await expect('能再展开回来', '(document.querySelector(".pane-list")||{offsetWidth:0}).offsetWidth > 0');
await evalJs('setMode("phone"); render()'); await sleep(180);

console.log('\n【锁 · 切换持有方（模拟另一台设备）】');
await evalJs('cycleLock()'); await sleep(120);   // phone -> pc
await evalJs('setMode("phone")'); await sleep(150); // 回到手机视图（我=手机），锁在电脑手里
await expect('显示「电脑正在操作」', has('电脑正在操作'));
await expect('有抢锁按钮', has('抢锁'));
await expect('未持锁时输入框被禁用', '!!document.querySelector("#ci") && document.querySelector("#ci").disabled === true');
await evalJs('takeLock()'); await sleep(150);
await expect('抢锁后变成「你这台设备」', has('你这台设备（手机）正在操作'));

console.log('\n【CCRemote】');
await evalJs('go("remote"); U.conv="c1"; render()'); await sleep(150);
await expect('会话详情渲染', has('修好订单导出乱码'));
await expect('审批卡渲染', has('这个动作要不要放行'));
await expect('有允许/不允许', all(has('允许'), has('不允许')));
await evalJs('decide("allow")'); await sleep(150);
await expect('放行后审批卡消失、任务完成', all(has('已完成'), not('这个动作要不要放行')));

console.log('\n【规则与资料 · 四个页签】');
await evalJs('go("lib")'); await sleep(150);
for (const [k, label, probe] of [
  ['rules', '审批规则', '自动放行'],
  ['prompts', '提示词', '登录重构专项'],
  ['projects', '项目', '常用提示词'],
  ['commits', '版本记录', '看看改了什么'],
]) {
  await evalJs(`U.libTab="${k}"; render()`); await sleep(140);
  await expect(label + ' 页签', has(probe));
}
await evalJs('U.libTab="commits"; render()'); await sleep(140);
await expect('版本记录显示改了什么', has('把 session 校验拆成中间件'));
await expect('版本记录显示改了哪些文件', has('auth/middleware.js'));

console.log('\n【电脑视图】');
// 先切到一个有分栏的模块（工作流），再看两栏是不是同时显示
await evalJs('go("loop"); U.wf="login"; render(); setMode("desktop")'); await sleep(200);
await expect('电脑视图下两栏同时在 DOM', all('!!document.querySelector(".pane-list")','!!document.querySelector(".pane-detail")'));
await expect('电脑视图下列表栏可见', '(document.querySelector(".pane-list")||{}).offsetWidth > 0');
await expect('电脑视图下详情栏可见', '(document.querySelector(".pane-detail")||{}).offsetWidth > 0');
await evalJs('setMode("phone"); render()'); await sleep(200);
await expect('手机视图下详情页只显示一栏', '(document.querySelector(".pane-list")||{}).offsetWidth === 0');
await expect('手机视图正常', has('多AI 协同'));

console.log('\n【离线状态】');
await evalJs('toggleNet()'); await sleep(150);
await expect('离线提示', has('连不上电脑'));

console.log('\n──────────────');
if (problems.length) {
  console.log('❌ 共 ' + problems.length + ' 个问题：');
  [...new Set(problems)].forEach(p => console.log('   · ' + p));
} else {
  console.log('✅ 全部通过，无控制台报错');
}

ws.close();
chrome.kill();
await sleep(300);
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(problems.length ? 1 : 0);
