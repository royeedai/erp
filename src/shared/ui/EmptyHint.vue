<script setup lang="ts">
// 空态的统一样子：图、一句话、说明、下一步。
defineProps<{ title: string; note?: string }>()
</script>

<template>
  <div class="app-empty">
    <svg width="22" height="26" viewBox="0 0 22 26" fill="none" aria-hidden="true">
      <rect class="is-paper" x="1.5" y="3.5" width="19" height="21" rx="2.5" />
      <rect class="is-clip" x="7" y="1" width="8" height="5" rx="1.5" />
      <path class="is-line" d="M6 11h10M6 15h10M6 19h6" />
    </svg>
    <div>
      <strong>{{ title }}</strong>
      <span v-if="note">{{ note }}</span>
      <div v-if="$slots.default" class="app-empty-next"><slot /></div>
    </div>
  </div>
</template>

<style>
.app-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-3);
  text-align: left;
  color: var(--el-text-color-secondary);
}
.app-empty strong {
  display: block;
  font-weight: 400;
  color: var(--el-text-color-regular);
}
.app-empty span {
  display: block;
}
.app-empty-next {
  margin-top: var(--app-space-2);
}
.app-empty .is-paper {
  fill: var(--app-bg-strip);
  stroke: var(--el-border-color);
}
.app-empty .is-clip {
  fill: var(--app-strip-line);
}
.app-empty .is-line {
  stroke: var(--el-border-color);
  stroke-width: 1.4;
}
</style>
