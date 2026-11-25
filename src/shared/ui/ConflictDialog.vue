<script setup lang="ts">
// 409：并列显示“你的值 / 最新值”，由用户决定，不自动覆盖。
import { computed } from 'vue'

export interface ConflictField {
  label: string
  mine: string
  latest: string
}

const props = defineProps<{ modelValue: boolean; message: string; fields: ConflictField[] }>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; 'use-latest': []; 'keep-mine': [] }>()

const changed = computed(() => props.fields.filter((f) => f.mine !== f.latest))
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="数据已被他人修改"
    width="640px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <p class="app-conflict-note">{{ message }}。下面是你填的值和最新值，请选择以哪一份为准。</p>
    <el-descriptions v-if="changed.length > 0" :column="1" border>
      <el-descriptions-item v-for="f in changed" :key="f.label" :label="f.label">
        <div>你的值：{{ f.mine || '—' }}</div>
        <div class="app-conflict-latest">最新值：{{ f.latest || '—' }}</div>
      </el-descriptions-item>
    </el-descriptions>
    <p v-else>你填的内容与最新值一致。</p>
    <template #footer>
      <el-button @click="emit('use-latest')">改用最新值</el-button>
      <el-button type="primary" @click="emit('keep-mine')">保留我的值，重新保存</el-button>
    </template>
  </el-dialog>
</template>

<style>
.app-conflict-note {
  margin: 0 0 var(--app-space-3);
}
.app-conflict-latest {
  color: var(--el-color-primary);
}
</style>
