# 小马快跑（pony-run）

GPT ⇄ Claude Code 工具台的统一入口。把三个各干各活的模块收到一个页面上：**看一眼状态，点一下就进去**。

## 三个模块（都在 `d:\Al_Learning\` 下，原地不动）

| 卡片 | 模块 | 目录 | 干什么 | 端口 |
|---|---|---|---|---|
| ① 权限中枢 | claude-permission-manager | `claude-permission-manager\` | 风险规则与审批策略（VS Code 扩展，无独立网页） | — |
| ② 循环引擎 | gpt-cc-loop | `gpt-cc-loop\` | GPT 下指令 → Claude Code 执行 → 自动回传，直到停止词 | 8765（面板）/ 9223（Chrome） |
| ③ 远程通道 | cc-remote (CCRemote) | `CCRemote\` | 手机远程操控与审批，也是手机端网络通路 | 8800（手机页）/ 7800（agent） |

## 怎么用

### 电脑上
双击 `pony-run\index.html` 即可（纯静态页，不用起服务）。页面会自动检测三个模块的在线状态。

### 手机上
1. 先确保「远程通道」的 relay 在跑（见下方启动顺序）
2. 手机连同一个局域网，浏览器打开：`http://本机IP:8800/pony`
   - 本机 IP 查看：`ipconfig`（看 IPv4 地址，如 10.254.9.122）
3. 门户里的链接会自动用局域网地址（无需手动改配置）

### 手机上打开「循环引擎」面板（公网/手机访问）
手机访问门户时会先要一次**门户密码**（初始 947618，配置在 `CCRemote\.env` 的 `CCREMOTE_PORTAL_PASSWORD`）。
登录后当天内免输，且从门户点进面板、审批页都不再要密码。

公网访问（手机与电脑不同网络）：
1. 电脑双击 `pony-run\start-phone.cmd` → 打印手机地址
2. 手机打开 https://xxx.ngrok-free.dev/pony → 输密码 → 进门户
3. 用完双击 `pony-run\stop-phone.cmd` 收回公网入口

### 一键启动（推荐）
双击 `pony-run\start.cmd`：自动检查并拉起三个模块，然后打开门户。

### 启动顺序（手动）
```
1) 远程通道（agent + relay）——两行都要跑，且不要关
   node d:\Al_Learning\CCRemote\agent\src\index.js
   node d:\Al_Learning\CCRemote\relay\src\index.js

2) 循环引擎
   双击 d:\Al_Learning\gpt-cc-loop\start.cmd   （或 node loop.mjs serve）

3) 浏览器：双击 pony-run\index.html（电脑）或 http://本机IP:8800/pony（手机）
```
> 注意：不要用 `CCRemote\start-local.cmd` 一键脚本——它会在 agent 端口已被占用时整包退出；分别启动两个进程更稳。

## 常见问题

| 现象 | 原因 / 处理 |
|---|---|
| 门户上「循环引擎」显示离线 | 面板没起（`node loop.mjs serve`）；或手机打开时面板仍是"仅本机"模式——属预期，见下 |
| 手机上「循环引擎」点了打不开 | 面板默认只监听本机（127.0.0.1）。需要手机访问时，在 gpt-cc-loop 配置里开启局域网监听 |
| 手机上「远程通道」打不开 | relay 没起；或手机和电脑不在同一局域网 |
| 状态点一直"检测中…" | 浏览器私网访问策略拦截（部分 Chrome 版本）——属降级，链接仍可点 |

## 已知边界（写在明处，避免误判为故障）

- **状态检测是"尽力而为"**：静态页没有后端，用浏览器探测端口近似判断"在线/离线"，不是权威心跳。
- **私网访问策略**：从 http 页面探测 `127.0.0.1` 端口，个别 Chrome 版本会拦截，表现为卡片长时间"检测中…"。
- **手机端打开面板**需要额外开启（默认关闭），这是安全取舍：面板能直接操控 Claude Code。

## 设计原则

- 门户**只做入口**：不复制模块代码、不建 monorepo、不改模块内部实现（除三处已确认的小改动）
- 单文件交付：`index.html` 自带样式与脚本，零依赖、`file://` 直接可用
- 手机通路**复用** CCRemote 的 relay，不重造
