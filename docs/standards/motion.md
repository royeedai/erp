# 动效

用一层覆盖解决，不换库、不改组件：`src/theme/motion.css` + `src/theme/motion.ts`。参数已由用户看对比页定稿（`--app-zoom-from: .2`）。

1. 时长只用三档变量：`--app-dur-fast` 120ms、`--app-dur-mid` 200ms、`--app-dur-slow` 300ms；缓动用 `--app-ease-*`。
2. 关闭永远比打开快。
3. 键盘触发、或点击后超过 500ms 才打开的对话框（先请求数据），从默认位置展开。
4. 系统设了“减少动态效果”时自动近乎关闭；远程桌面把 `--app-motion-scale` 设为 0.01，做成用户偏好。
5. 表格行、数字、页签切换不加动画。
6. 确认框统一走 `confirm()`，它负责记录展开位置。

| 组件 | 效果 |
|---|---|
| 对话框、确认框 | 从点击位置 0.2→1 展开；开 300ms，关 200ms |
| 抽屉 | 只动位移和透明度；开 300ms 缓出，关 200ms |
| 全局提示 | 白底浮层，短位移 20px；入 300ms，离 200ms |
| 下拉 | 从 0.8 展开；开 200ms，关 120ms |
| 按钮 | 点击扩散一圈 |

**升级 Element Plus 时**：Dialog 用的是官方 `transition` 配置；Drawer、MessageBox、Message 靠类名覆盖，要重看对比页 `element-theme/index.html`。`element-theme/` 的副本删掉之前，改动效要同步它。
