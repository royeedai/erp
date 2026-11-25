<script setup lang="ts">
// 参照框：框内右侧是列表图标，点了开弹层；必填的星号在框内最左。
import RefIcon from './RefIcon.vue'

defineProps<{ placeholder?: string; required?: boolean; disabled?: boolean }>()
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ open: [] }>()
</script>

<template>
  <el-input v-model="model" class="r-ref" :placeholder="placeholder" :disabled="disabled" autocomplete="off">
    <template v-if="required" #prefix><i class="r-star">*</i></template>
    <template #suffix>
      <button type="button" class="r-ref-btn" :disabled="disabled" :aria-label="`选择${placeholder ?? ''}`" @click="emit('open')"><RefIcon /></button>
    </template>
  </el-input>
</template>

<style>
.r-ref-btn { display: inline-flex; padding: 0; border: none; background: none; color: #6F6E76; cursor: pointer; }
.r-ref-btn:hover:not(:disabled) { color: var(--r-primary); }
.r-ref-btn:disabled { color: #A09EA6; cursor: default; }
.r-ref .el-input__prefix-inner > :last-child { margin-right: 1px; }
</style>
