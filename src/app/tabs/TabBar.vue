<script setup lang="ts">
// 页签条：首页固定在最前；右边是页签列表、收起顶栏、全屏。
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Bottom, DArrowRight, FullScreen, House, Top } from '@element-plus/icons-vue'
import { useTabsStore } from './tabs.store'
import { useTabActions } from './useTabActions'

const headHidden = defineModel<boolean>('headHidden', { default: false })

const tabs = useTabsStore()
const { activate, close, closeMany } = useTabActions()

const full = ref(false)
const onFullChange = () => (full.value = document.fullscreenElement !== null)
onMounted(() => document.addEventListener('fullscreenchange', onFullChange))
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFullChange))
function toggleFull() {
  void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())
}

function onCommand(command: string) {
  if (command === 'close-others') void closeMany(tabs.keys.filter((k) => k !== tabs.activeKey))
  else if (command === 'close-all') void closeMany(tabs.keys)
  else void activate(command)
}
</script>

<template>
  <div class="app-tab-strip">
    <el-tabs
      class="app-tab-bar"
      type="card"
      :model-value="tabs.activeKey"
      @tab-change="(name) => activate(String(name))"
      @tab-remove="(name) => close(String(name))"
    >
      <el-tab-pane v-for="t in tabs.tabs" :key="t.key" :name="t.key" :closable="t.closable">
        <template #label>
          <span class="app-tab-label" :data-tab="t.key" :title="t.title">
            <el-icon v-if="!t.closable"><House /></el-icon>
            <span>{{ t.title }}</span>
            <i v-if="t.dirty" class="app-tab-dirty" title="未保存" />
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>
    <div class="app-tab-tools">
      <el-dropdown trigger="click" @command="onCommand">
        <button type="button" aria-label="页签列表" title="页签列表"><el-icon class="is-down"><DArrowRight /></el-icon></button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="t in tabs.tabs" :key="t.key" :command="t.key">{{ t.title }}</el-dropdown-item>
            <el-dropdown-item command="close-others" divided>关闭其他页签</el-dropdown-item>
            <el-dropdown-item command="close-all">关闭全部页签</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <i class="app-tab-sep" />
      <button type="button" :aria-label="headHidden ? '展开顶栏' : '收起顶栏'" :title="headHidden ? '展开顶栏' : '收起顶栏'" @click="headHidden = !headHidden">
        <el-icon><Bottom v-if="headHidden" /><Top v-else /></el-icon>
      </button>
      <button type="button" :aria-label="full ? '退出全屏' : '全屏'" :title="full ? '退出全屏' : '全屏'" @click="toggleFull">
        <el-icon><FullScreen /></el-icon>
      </button>
    </div>
  </div>
</template>

<style>
.app-tab-strip {
  box-sizing: border-box;
  height: var(--app-tabs-height);
  flex: none;
  display: flex;
  background: var(--app-bg-strip);
  box-shadow: inset 0 -2px var(--app-strip-line);
}
.app-tab-bar {
  flex: 1;
  min-width: 0;
  --el-tabs-header-height: var(--app-tabs-height);
}
.app-tab-bar > .el-tabs__content {
  display: none;
}
.app-tab-bar.el-tabs--card > .el-tabs__header {
  height: var(--app-tabs-height);
  margin: 0;
  border: none;
}
.app-tab-bar.el-tabs--card > .el-tabs__header .el-tabs__nav {
  border: none;
  border-radius: 0;
}
.app-tab-bar.el-tabs--card > .el-tabs__header .el-tabs__item,
.app-tab-bar.el-tabs--card > .el-tabs__header .el-tabs__item.is-closable:hover,
.app-tab-bar.el-tabs--card > .el-tabs__header .el-tabs__item.is-active.is-closable {
  position: relative;
  box-sizing: border-box;
  width: 129px;
  height: var(--app-tabs-height);
  padding: 0 9px 2px 10px;
  border: none;
  font-size: var(--app-font-nav);
  font-weight: 400;
  line-height: 26px;
  color: var(--el-text-color-secondary);
}
.app-tab-bar .el-tabs__item:not(.is-closable),
.app-tab-bar.el-tabs--card > .el-tabs__header .el-tabs__item:first-child {
  width: 80px;
  padding-left: 20px;
}
.app-tab-bar.el-tabs--card > .el-tabs__header .el-tabs__item:last-child {
  padding-right: 9px;
}
.app-tab-bar .el-tabs__item + .el-tabs__item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 5px;
  width: 1px;
  height: 15px;
  background: var(--app-strip-line);
}
.app-tab-bar .el-tabs__item.is-active::before,
.app-tab-bar .el-tabs__item.is-active + .el-tabs__item::before {
  display: none;
}
.app-tab-bar.el-tabs--card > .el-tabs__header .el-tabs__item.is-active,
.app-tab-bar.el-tabs--card > .el-tabs__header .el-tabs__item.is-active.is-closable {
  background: var(--app-tab-active-bg);
  color: var(--app-tab-active-fg);
  box-shadow: inset 0 -2px var(--app-tab-active-line);
}
.app-tab-bar .el-tabs__item:hover {
  color: var(--el-text-color-primary);
}
.app-tab-bar.el-tabs--card > .el-tabs__header .el-tabs__item .is-icon-close,
.app-tab-bar.el-tabs--card > .el-tabs__header .el-tabs__item.is-closable:hover .is-icon-close,
.app-tab-bar.el-tabs--card > .el-tabs__header .el-tabs__item.is-active.is-closable .is-icon-close {
  position: static;
  flex: none;
  width: 14px;
  height: 14px;
  margin-left: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.app-tab-label {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.app-tab-label > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-tab-dirty {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-primary);
}
.app-tab-tools {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--app-space-4);
  padding: 0 20px 2px 14px;
  font-size: 13px;
  box-shadow: -4px 0 6px -4px var(--el-border-color-hover);
}
.app-tab-tools button {
  display: inline-flex;
  padding: 0;
  border: none;
  background: none;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
}
.app-tab-tools button:hover {
  color: var(--el-color-primary);
}
.app-tab-tools .is-down {
  transform: rotate(90deg);
}
.app-tab-sep {
  width: 1px;
  height: 14px;
  background: var(--app-strip-line);
}
</style>
