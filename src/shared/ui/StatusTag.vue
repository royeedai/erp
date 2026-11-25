<script setup lang="ts">
// 状态：只有五种语义，颜色来自 token，业务不传颜色。
// 常态（草稿·关闭、处理中、完成）只显示文字，要引起注意的（关注、失败）带底色。
defineProps<{ tone: 'draft' | 'doing' | 'done' | 'watch' | 'fail'; text: string }>()
</script>

<template>
  <span class="app-status-tag" :class="`is-${tone}`">{{ text }}</span>
</template>

<style>
.app-status-tag.is-watch,
.app-status-tag.is-fail {
  display: inline-block;
  padding: 0 6px;
  border-radius: var(--app-radius-control);
  line-height: 18px;
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
