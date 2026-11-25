<script setup lang="ts">
// 状态：只有五种语义，颜色来自 token，业务不传颜色。
// 常态（草稿·关闭、完成）用圆点，要引起注意的（处理中、关注、失败）用底色标签。
defineProps<{ tone: 'draft' | 'doing' | 'done' | 'watch' | 'fail'; text: string }>()
</script>

<template>
  <span class="app-status-tag" :class="`is-${tone}`">{{ text }}</span>
</template>

<style>
.app-status-tag {
  display: inline-block;
  padding: 0 var(--app-space-2);
  border-radius: var(--app-radius-control);
  font-size: var(--app-font-sm);
  line-height: 20px;
}
.app-status-tag.is-draft,
.app-status-tag.is-done {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-size: inherit;
  line-height: 22px;
  vertical-align: top;
}
.app-status-tag.is-draft::before,
.app-status-tag.is-done::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.app-status-tag.is-draft {
  color: var(--el-text-color-secondary);
}
.app-status-tag.is-done {
  color: var(--el-text-color-regular);
}
.app-status-tag.is-done::before {
  background: var(--app-status-done-fg);
}
.app-status-tag.is-doing {
  color: var(--app-status-doing-fg);
  background: var(--app-status-doing-bg);
}
.app-status-tag.is-watch {
  color: var(--app-status-watch-fg);
  background: var(--app-status-watch-bg);
}
.app-status-tag.is-fail {
  color: var(--app-status-fail-fg);
  background: var(--app-status-fail-bg);
}
</style>
