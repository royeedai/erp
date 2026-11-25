# ERP 前端基座

给 ERP 后台用的前端基座：外壳、列表和录入封装，加一套能用命令检查的页面规范。目标是任何人用任何 AI，都能在这里生成符合规范的页面。

数据全是模拟的，后端接口还没确认。

## 启动

需要 Node 24.15 以上（25 以下）和 pnpm 10.28.2，版本不对会拒绝安装。

```sh
pnpm install
pnpm dev
```

打开 <http://127.0.0.1:5173>（用 `127.0.0.1`，不要用 `localhost`）。要用 Chrome、Edge 这类完整的浏览器，编辑器自带的预览窗口可能装不了模拟接口，会白屏。

账号和密码在 [src/mocks/users.json](src/mocks/users.json)：

| 账号 | 能看到什么 |
|---|---|
| `admin` | 全部，能维护 |
| `viewer` | 全部，只读 |
| `nobody` | 没有权限的样子 |

## 先看哪里

| 页面 | 看什么 |
|---|---|
| 首页 | 待办、常用应用、任务卡片 |
| 项目岗位 | 左树右表、表内编辑：选“GC 工程类”，点“增行” |
| 列表样例 | 查询、状态页签、合计、列设置：先选采购组织再查询；供应商填“出错”或“无权”看另外两种空态 |

参照原型是样子的依据，不用登录：

```sh
pnpm exec vite --config examples/ref-prototype/vite.config.ts
```

打开 <http://127.0.0.1:5184>，共六页。整页卡片在“工程变更申请单维护”和“供应商-集团”里点“新增”。原型和规范不一致的按规范。

## 做页面之前

1. 读 [AGENTS.md](AGENTS.md)，按要做的事读 [docs/standards/](docs/standards/) 里对应的那一份。
2. 业务页面不写样式，只用登记过的组件，清单见 [engineering.md](docs/standards/engineering.md#页面规则)。
3. 写完跑 `pnpm check`，报错就改代码。

## 命令

| 命令 | 做什么 |
|---|---|
| `pnpm check` | 类型、代码和样式规则、单测、接口有没有漂移 |
| `pnpm build` | 正式构建，不带模拟数据 |
| `pnpm e2e` | 端到端，要装 Chrome；端口被占用时设 `E2E_PORT` |
| `pnpm gen:api` | 按 `openapi/` 里的契约重新生成接口函数 |

## 现状

- 封装有哪些、缺哪些：[engineering.md](docs/standards/engineering.md#封装)。
- 做到哪一步、哪些没核实：[任务记录/进度.md](任务记录/进度.md) 的最后一条。
