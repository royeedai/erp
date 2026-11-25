<script setup lang="ts">
// 行内动作：能不能点、为什么不能点，全看接口返回的 allowedActions。最多平铺 2 个，其余进“更多”。
// 一页几十行都有它：提示悬停时才挂，“更多”的菜单点了才挂，否则首屏渲染会慢一截。
import { computed, nextTick, ref, shallowRef, useTemplateRef } from 'vue'
import type { DropdownInstance } from 'element-plus'

export interface ActionItem {
  action: string
  label: string
  danger?: boolean
}

const props = defineProps<{
  actions: ActionItem[]
  allowed: { action: string; allowed: boolean; reason?: string }[]
}>()
const emit = defineEmits<{
  run: [action: string]
  /** 点了“更多”里不可用的动作：页面给出原因和替代动作 */
  blocked: [action: string, reason: string]
}>()

const MAX_INLINE = 2

/** 接口没返回的动作不显示 */
const shown = computed(() =>
  props.actions.flatMap((a) => {
    const state = props.allowed.find((s) => s.action === a.action)
    return state ? [{ ...a, allowed: state.allowed, reason: state.reason ?? '当前不可用' }] : []
  }),
)
const inline = computed(() => shown.value.slice(0, MAX_INLINE))
const more = computed(() => shown.value.slice(MAX_INLINE))

const hovered = ref('')
const hoverTarget = shallowRef<HTMLElement>()
function onHover(action: string, e: MouseEvent) {
  hoverTarget.value = e.currentTarget as HTMLElement
  hovered.value = action
}

const menuMounted = ref(false)
const menuRef = useTemplateRef<DropdownInstance>('menuRef')
const rootRef = useTemplateRef<HTMLElement>('rootRef')

async function openMenu() {
  menuMounted.value = true
  await nextTick()
  // 按钮换成了菜单自己的触发按钮，焦点要跟过去
  rootRef.value?.querySelector<HTMLElement>('[data-action="more"]')?.focus({ preventScroll: true })
  menuRef.value?.handleOpen()
}

function pick(action: string) {
  const item = more.value.find((a) => a.action === action)
  if (!item) return
  if (item.allowed) emit('run', action)
  else emit('blocked', action, item.reason)
}
</script>

<template>
  <span ref="rootRef" class="app-action-bar">
    <template v-for="a in inline" :key="a.action">
      <el-button
        v-if="a.allowed"
        link
        :data-action="a.action"
        @click="emit('run', a.action)"
      >
        {{ a.label }}
      </el-button>
      <!-- 禁用按钮不触发鼠标事件，套一层才能显示原因；提示悬停时才挂 -->
      <span v-else class="app-action-off" @mouseenter="onHover(a.action, $event)" @mouseleave="hovered = ''">
        <el-button link disabled :data-action="a.action">{{ a.label }}</el-button>
        <el-tooltip v-if="hovered === a.action" :visible="true" :virtual-ref="hoverTarget" virtual-triggering :content="a.reason" placement="top" />
      </span>
    </template>
    <template v-if="more.length > 0">
      <el-dropdown v-if="menuMounted" ref="menuRef" trigger="click" @command="pick">
        <el-button link data-action="more">更多</el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="a in more"
              :key="a.action"
              :command="a.action"
              :class="!a.allowed ? 'app-action-blocked' : a.danger ? 'app-action-danger' : ''"
            >
              <span :data-action="a.action">
                {{ a.label }}<small v-if="!a.allowed">{{ a.reason }}</small>
              </span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button v-else link data-action="more" aria-haspopup="menu" @click="openMenu">更多</el-button>
    </template>
  </span>
</template>

<style>
.app-action-bar {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-3);
}
.app-action-bar .el-button {
  padding: 0;
}
.app-action-off {
  display: inline-flex;
}
.app-action-bar .el-button + .el-button {
  margin-left: 0;
}
.app-action-danger {
  color: var(--el-color-danger);
}
.app-action-blocked {
  color: var(--el-text-color-secondary);
}
.app-action-blocked small {
  margin-left: var(--app-space-2);
}
</style>
