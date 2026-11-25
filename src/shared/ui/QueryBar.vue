<script lang="ts">
export interface QueryScheme {
  key: string
  label: string
  /** 用户自己存的，可以删 */
  own?: boolean
}
</script>

<script setup lang="ts">
// 查询行：查询方案、一排常用条件、查询、高级查询、更多、收起。回车或点查询才查。
// 条件由页面放进默认插槽；给了 advanced 插槽才出现高级查询。
import { ref } from 'vue'
import { ArrowDown, DArrowLeft, MoreFilled, Search } from '@element-plus/icons-vue'
import { promptText } from './feedback'

defineProps<{ schemes?: QueryScheme[] }>()
const scheme = defineModel<string>('scheme', { default: '' })
const emit = defineEmits<{ search: []; reset: []; 'save-scheme': [label: string]; 'remove-scheme': [key: string] }>()
const slots = defineSlots<{ default(): unknown; advanced?(): unknown }>()

const open = ref(true)
const advanced = ref(false)

function onEnter(e: KeyboardEvent) {
  // 输入法选词时的回车不算；开着下拉时回车是选项
  const target = e.target as HTMLElement
  if (e.isComposing || target.getAttribute('aria-expanded') === 'true') return
  emit('search')
}
function searchAdvanced() {
  advanced.value = false
  emit('search')
}
async function onScheme(command: string) {
  if (command !== '+') {
    scheme.value = command
    return
  }
  const label = await promptText({ title: '另存为查询方案', message: '把现在的条件存成一个方案，下次直接选。', confirmText: '保存', label: '方案名称' })
  if (label) emit('save-scheme', label)
}
function onMore(command: string) {
  if (command === 'reset') emit('reset')
  else emit('remove-scheme', scheme.value)
}
</script>

<template>
  <div class="app-query-bar">
    <el-dropdown v-if="schemes?.length" trigger="click" @command="onScheme">
      <button type="button" class="app-query-scheme">
        {{ schemes.find((s) => s.key === scheme)?.label ?? '快速查询' }}<el-icon><ArrowDown /></el-icon>
      </button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item v-for="s in schemes" :key="s.key" :command="s.key">{{ s.label }}{{ s.key === scheme ? ' ✓' : '' }}</el-dropdown-item>
          <el-dropdown-item command="+" divided>另存为查询方案</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    <template v-if="open">
      <div class="app-query-fields" @keydown.enter="onEnter"><slot /></div>
      <button type="button" class="app-query-go" aria-label="查询" title="查询" @click="emit('search')"><el-icon><Search /></el-icon></button>
      <el-button v-if="slots.advanced" class="app-icon-btn" aria-label="高级查询" title="高级查询" @click="advanced = true">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
          <path d="M6 13.4H2.6a1 1 0 0 1-1-1V2.6a1 1 0 0 1 1-1h8.8a1 1 0 0 1 1 1V6M4 4.6h6.4M4 7.4h3" />
          <circle cx="9.8" cy="9.8" r="2.4" />
          <path d="m11.6 11.6 2 2" />
        </svg>
      </el-button>
      <el-dropdown trigger="click" @command="onMore">
        <el-button class="app-icon-btn" :icon="MoreFilled" aria-label="更多查询操作" title="更多" />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="reset">清空条件</el-dropdown-item>
            <el-dropdown-item v-if="schemes?.find((s) => s.key === scheme)?.own" command="remove">删除这个查询方案</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </template>
    <button type="button" class="app-query-fold" :class="{ 'is-closed': !open }" :aria-label="open ? '收起条件' : '展开条件'" :title="open ? '收起' : '展开'" @click="open = !open">
      <el-icon><DArrowLeft /></el-icon>
    </button>
    <el-dialog v-if="slots.advanced" v-model="advanced" title="高级查询" width="640px" align-center append-to-body :close-on-click-modal="false">
      <div @keydown.enter="onEnter"><slot name="advanced" /></div>
      <template #footer>
        <el-button type="primary" @click="searchAdvanced">查询</el-button>
        <el-button @click="emit('reset')">清空条件</el-button>
        <el-button @click="advanced = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style>
.app-query-bar {
  box-sizing: border-box;
  height: var(--app-query-height);
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px;
  background: var(--app-bg-query);
}
.app-query-scheme {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-right: 6px;
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  line-height: 26px;
  color: var(--el-text-color-primary);
  cursor: pointer;
  white-space: nowrap;
}
.app-query-fields {
  display: flex;
  gap: 5px;
  min-width: 0;
}
.app-query-fields > * {
  flex: 0 1 auto;
  width: 232px;
  min-width: 0;
}
.app-query-fields > .is-wide {
  width: 296px;
}
@media (min-width: 2200px) {
  .app-query-fields > * {
    width: 296px;
  }
}
@media (max-width: 1500px) {
  .app-query-fields > * {
    width: 176px;
  }
  .app-query-fields > .is-wide {
    width: 236px;
  }
}
.app-query-go {
  flex: none;
  width: 32px;
  height: var(--app-control-height);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: var(--app-radius-control);
  background: var(--app-search-bg);
  color: var(--app-bg-container);
  font-size: 15px;
  cursor: pointer;
}
.app-query-go:hover {
  background: var(--el-color-primary);
}
.app-query-go svg {
  stroke: currentColor;
  stroke-width: 40px;
}
.app-query-bar .app-icon-btn.el-button {
  flex: none;
  width: 28px;
  margin: 0;
}
.app-query-fold {
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: none;
  font-size: 13px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transform: rotate(90deg);
}
.app-query-fold.is-closed {
  transform: rotate(-90deg);
}
.app-query-scheme:focus-visible,
.app-query-go:focus-visible,
.app-query-fold:focus-visible {
  outline: 2px solid var(--app-focus);
  outline-offset: 1px;
}
/* 必填的日期框：星号在框内最左 */
.app-dates.is-required::before {
  content: '*';
  position: relative;
  top: 5px;
  margin-left: -5px;
  font: 700 20px/14px Arial, sans-serif;
  color: var(--app-required);
}
</style>
