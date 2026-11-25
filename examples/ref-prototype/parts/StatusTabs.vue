<script setup lang="ts">
defineProps<{ tabs: { key: string; label: string; count?: number }[] }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="r-status" role="tablist">
    <button v-for="t in tabs" :key="t.key" type="button" role="tab" :aria-selected="model === t.key" :class="{ 'is-on': model === t.key }" @click="model = t.key">
      {{ t.label }}<template v-if="t.count !== undefined"> ({{ t.count }})</template>
    </button>
    <i />
    <slot />
  </div>
</template>

<style>
.r-status { flex: none; height: 35px; display: flex; align-items: center; gap: 24px; padding: 0 20px 0 18px; }
.r-status > i:not(.el-icon) { flex: 1; }
.r-status > button { position: relative; height: 35px; padding: 4px 0 0; border: none; background: none; font-size: 12px; color: var(--r-text-2); cursor: pointer; }
.r-status > button:hover { color: var(--r-text); }
.r-status > button.is-on { font-weight: 700; color: var(--r-text); }
.r-status > button.is-on::after { content: ''; position: absolute; left: 50%; bottom: 0; width: 24px; height: 2px; margin-left: -12px; background: #D9343F; }
.r-status .el-button-group .el-button { height: 25px; }
.r-status .el-button-group .el-button.is-on { background: #D7DDF5; color: #2A3A78; }
</style>
