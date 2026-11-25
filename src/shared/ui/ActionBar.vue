<script setup lang="ts">
// 行内动作：能不能点、为什么不能点，全看接口返回的 allowedActions。
export interface ActionItem {
  action: string
  label: string
  danger?: boolean
}

const props = defineProps<{
  actions: ActionItem[]
  allowed: { action: string; allowed: boolean; reason?: string }[]
}>()
const emit = defineEmits<{ run: [action: string] }>()

function stateOf(action: string) {
  return props.allowed.find((a) => a.action === action)
}
</script>

<template>
  <span class="app-action-bar">
    <template v-for="a in actions" :key="a.action">
      <el-tooltip
        v-if="stateOf(a.action)"
        :disabled="stateOf(a.action)?.allowed"
        :content="stateOf(a.action)?.reason ?? '当前不可用'"
        placement="top"
      >
        <!-- 禁用按钮不触发鼠标事件，套一层才能显示原因 -->
        <span>
          <el-button
            link
            :type="a.danger ? 'danger' : 'primary'"
            :disabled="!stateOf(a.action)?.allowed"
            :data-action="a.action"
            @click="emit('run', a.action)"
          >
            {{ a.label }}
          </el-button>
        </span>
      </el-tooltip>
    </template>
  </span>
</template>

<style>
.app-action-bar {
  display: inline-flex;
  gap: var(--app-space-3);
}
</style>
