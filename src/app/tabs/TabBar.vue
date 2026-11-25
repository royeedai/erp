<script setup lang="ts">
import { useTabsStore } from './tabs.store'
import { useTabActions } from './useTabActions'

const tabs = useTabsStore()
const { activate, close } = useTabActions()
</script>

<template>
  <el-tabs
    class="app-tab-bar"
    type="card"
    :model-value="tabs.activeKey"
    @tab-change="(name) => activate(String(name))"
    @tab-remove="(name) => close(String(name))"
  >
    <el-tab-pane v-for="t in tabs.tabs" :key="t.key" :name="t.key" :closable="t.closable">
      <template #label>
        <span :data-tab="t.key">{{ t.title }}<i v-if="t.dirty" class="app-tab-dirty" title="未保存" /></span>
      </template>
    </el-tab-pane>
  </el-tabs>
</template>

<style>
.app-tab-bar > .el-tabs__header {
  margin: 0;
}
.app-tab-bar > .el-tabs__content {
  display: none;
}
.app-tab-dirty {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 6px;
  border-radius: 50%;
  background: var(--el-color-primary);
  vertical-align: middle;
}
</style>
