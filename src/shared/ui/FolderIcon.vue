<script setup lang="ts">
// 树里的分类图标，自己画的。
defineProps<{ open?: boolean }>()
</script>

<template>
  <svg class="app-folder" width="17" height="14" viewBox="0 0 17 14" aria-hidden="true">
    <path class="is-back" d="M1 2.4C1 1.6 1.6 1 2.4 1h3.7l1.6 1.9h6.9c.8 0 1.4.6 1.4 1.4v7.3c0 .8-.6 1.4-1.4 1.4H2.4C1.6 13 1 12.4 1 11.6z" />
    <path v-if="open" class="is-front" d="M3.1 5.6h13.2c.5 0 .8.5.7.9l-1.5 5.6c-.1.5-.6.9-1.1.9H1.8c-.5 0-.8-.5-.7-.9l1.2-5.7c.1-.5.4-.8.8-.8z" />
    <path v-else class="is-front" d="M1 4.8h15v6.8c0 .8-.6 1.4-1.4 1.4H2.4C1.6 13 1 12.4 1 11.6z" />
  </svg>
</template>

<style>
.app-folder .is-back {
  fill: var(--app-folder-back);
}
.app-folder .is-front {
  fill: var(--app-folder);
}
</style>
