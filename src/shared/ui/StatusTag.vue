<script setup lang="ts">
// 状态标签：只有五种语义，颜色来自 token，业务不传颜色。
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
.app-status-tag.is-draft {
  color: var(--app-status-draft-fg);
  background: var(--app-status-draft-bg);
}
.app-status-tag.is-doing {
  color: var(--app-status-doing-fg);
  background: var(--app-status-doing-bg);
}
.app-status-tag.is-done {
  color: var(--app-status-done-fg);
  background: var(--app-status-done-bg);
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
