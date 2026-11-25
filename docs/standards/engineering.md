# 工程

## 技术栈

版本以 `package.json` 为准，全部写精确版本。

- Vue 只用 `<script setup lang="ts">`；TypeScript 留在 6.0.x，typescript-eslint 8.74 只支持 `<6.1.0`。
- 列表和明细统一用 vxe-table 免费版。区域选取、复制粘贴、查找替换、数据汇总是企业版收费功能，不用。
- 服务端数据用 Vue Query；Pinia 只放组织上下文、页签、用户偏好。
- 性能先只记录不优化；丢数据、丢焦点、算错金额必须停下来修（用户 2026-11-24 定）。

| 升级谁 | 必须做 |
|---|---|
| vxe-table | 单独走验证，重跑 `trial2 E` 连按测试：`EditTable` 用了类型声明里没有的 `isPos`；`useScrollSync` 补的固定列同步要重看 |
| Element Plus | 按 [motion.md](motion.md) 重看对比页；`src/theme/controls.css` 靠类名覆盖，逐屏看一遍 |
| ESLint、Stylelint 及插件 | `tests/guard` 全过，它会抓到悄悄失效的护栏 |

## 目录

```text
src/app/                   路由、权限码、会话、页签、布局
src/api/generated/         orval 产物，不手改
src/api/http.ts            唯一的请求出口
src/shared/ui/             组合封装
src/shared/entry/          录入逻辑，不含界面
src/shared/patterns/       页面模式（还没建）
src/features/<域>/<资源>/   业务目录：只写字段、规则、业务动作
src/theme/                 token 与动效，唯一一份
src/mocks/                 MSW 模拟接口，不进正式包
src/samples/               封装的样例页，只在模拟模式有
lint/、tests/guard/        护栏清单与回归
```

## 封装

- 不自研基础控件，每个封装只由 Element Plus 或 vxe-table 拼装。
- 至少两个真实页面出现同一需求，或参照站多个页面做法一致，才扩展封装。

| 规范名 | 现状 |
|---|---|
| `AppShell` | 有，在 `src/app/layout/` 和 `src/app/tabs/`；全部应用、应用搜索、面包屑、首页常用应用都取自路由的 `meta.nav`（业务域、模块、分组）、`icon`、`tone` |
| `PageHeader` | 有：图标、标题、`after` 插槽（组织、显示停用）、动作 |
| `QueryBar` `StatusTabs` | 有：查询方案、条件、查询、高级查询、更多、收起；状态页签在表格上方 |
| `DataTable` `ColumnSettings` `EmptyHint` | 有：勾选、序号、按类型排宽、操作列、合计行、列设置（含行高）、底部、五种空态 |
| `EditTable` | 有：单据明细和表内编辑共用；勾选、操作列、列设置、开关列、错误摘要 |
| `DetailBar` | 有：明细条，名称和行数、已选、动作、收起、全屏 |
| `TreeLayout` | 有：左树右表，树可收起，加载中不露空态，换节点前可先问 |
| `RefPicker` | 有树形单选：搜索、显示停用、候选范围；多选、列表型、包含下级还没有 |
| `useSubmit` `useEntryForm` `useEntryTable` | 有，在 `src/shared/entry/`：未保存、字段错误、幂等、冲突、连点，整页卡片、对话框、表内编辑共用 |
| `FormDialog` `ConflictDialog` | 有；对话框只管布局，逻辑在 `useEntryForm` |
| `AmountInput` `StatusTag` `ActionBar` `AppIcon` | 有 |
| `confirm` `confirmWithReason` `promptText` `alertError` `toast` | 有，在 `src/shared/ui/feedback.ts` |
| `BillPage` `SourcePicker` `AmountText` `ApprovalPanel` `DocTrace` `ChangeCompare` `ImportWizard` `BatchResult` `AttachmentList` | 还没有 |

列表封装没有真实页面在用，样子和端到端都在 `src/samples/`，只在模拟模式登记，正式包里没有。

## 页面：生成到什么程度

| 级别 | 页面 | 做法 |
|---|---|---|
| A | 档案、字典、树形分类、查询列表、台账、简单申请 | 直接生成 |
| B | 主子表单据、参照选单、对象卡片、待办与审批、批量与导入 | 生成骨架，再填业务 |
| C | 核销、对账、计划矩阵、分析报表 | 写专页，不进页面模式 |

页面模式五种：列表、表内编辑档案（可带左树）、整页卡片（档案和单据）、参照、工作台与审批。

## 配置与代码的边界

- **进配置**：字段、顺序、显隐、查询条件、校验、参照来源、权限码、动作标识。
- **写代码**：多步临时状态、协调两个数据集、金额分配、拉推单、外部回执。
- 规格用带类型的 TS 写，不做 JSON 低代码引擎。接口直接引用 orval 生成的函数，不写字符串。
- 生成文件可重建，人工扩展放独立文件，重复生成不覆盖人工代码。

## 护栏

`pnpm check` 依次跑类型检查、ESLint 与 Stylelint、单测（含护栏回归、路由与权限码唯一）、接口重新生成无漂移。

| 拦下 | 改用 | 放行的位置 |
|---|---|---|
| `vxe-table` 及其配套包、`<vxe-*>` | `DataTable` / `EditTable` | `src/shared/ui/` |
| `ElMessage`、`ElMessageBox`、`ElNotification`、`$message` 一类 | `toast` / `confirm` / `confirmWithReason` / `alertError` | `feedback.ts` |
| `el-table` | `DataTable` / `EditTable` | 无 |
| `el-input-number` | `AmountInput` | 无 |
| 颜色值（脚本、模板、`<style>`、`.css`） | CSS 变量 | `src/theme/` |
| 动画时长、`animate()` | `--app-dur-*` | `src/theme/` |
| `localStorage`、`sessionStorage` 等浏览器存储 | 接口；登录态和偏好归 `src/app/` | `src/app/` |
| `fetch`、`axios` 一类裸请求，`request()` | orval 生成的函数 | `src/api/http.ts` |
| Options API、`this`、Vue 2 写法、`.js` / `.tsx` | `<script setup lang="ts">` | 无 |
| 第二套 UI 库、没登记的组件 | Element Plus 和封装 | 无 |

- 以上对整个 `src/` 生效。业务目录再加两条：引入用白名单，注释关不掉规则。
- 清单只在 `lint/guard.js`、`lint/page-structure.js` 和 `stylelint.config.js`。业务目录要用新包、新组件，或专页要放行，先问用户，再改白名单。
- 误报就改清单，并在 `tests/guard/` 加一个样例；现有代码违规就改代码，不放宽规则。
- 页面用例覆盖：正常、空、403、字段错、版本冲突、重复点击、批量部分失败；金额覆盖零、负数、不同精度、含税尾差。
- `examples/`（样页原型）和 `element-theme/`（对比页）不在检查范围。

### 页面规则

业务目录和样例页另守下表。页面只填字段、列、动作和接口，外观由公共封装给；缺什么先补封装。

| 拦下 | 改用 |
|---|---|
| 没登记的 `el-*`，原生的标题、表格、按钮、输入框 | 公共封装；登记的在 `lint/guard.js` 的 `PAGE_COMPONENTS` |
| `<style>`、`.css`、`style`、不是 `app-` 开头的 class、`v-html` | 公共封装 |
| `*Page.vue` 没有标题行 | `PageHeader` 或 `BillPage`，最外层是 `app-page` |
| 两个实心主按钮、彩色按钮、逐个设大小和形状 | 一个主按钮，其余普通按钮 |
| “暂存”“确定”“确认” | 保存、保存新增、保存提交，或具体动作 |
| 表格单元格里的裸按钮 | `ActionBar` |
| 按状态判断能不能做、写死的权限码 | `allowedActions`、`PERM` |
| “暂无数据”、`el-empty`、`el-result` | `EmptyHint` |
| `Number()`、`parseFloat`、`toFixed`、一元 `+` | `src/shared/money/amount.ts`；页码用 `Number.parseInt(x, 10)` |
| `toLocaleString` 一类、`Intl` | 日期按接口给的字符串显示 |

- `tests/e2e/page-standard.spec.ts` 把全部应用里的页面逐个打开量：标题行、主按钮、行高、按钮高、字号字重、横向溢出、占位文字。新页面登记了路由就自动进来。
- 拦不住：普通下拉冒充参照；在脚本里按状态算好再传给按钮；编辑中、对话框打开后的样子（巡检只看刚打开的页面）。
