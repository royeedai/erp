<script setup lang="ts" generic="Node extends { id: string; children: Node[] }">
// 左树右表：左边的树可收起，右边放明细条和表格。换节点前可以先问，例如有没保存的内容。
import { ref, useTemplateRef } from 'vue'
import { DArrowLeft } from '@element-plus/icons-vue'
import type { TreeInstance } from 'element-plus'
import FolderIcon from './FolderIcon.vue'

const props = withDefaults(
  defineProps<{
    /** 树的名称，例如“分类” */
    noun: string
    nodes: Node[]
    label: (node: Node) => string
    loading?: boolean
    /** 换节点之前先问；返回 false 就留在原来的节点 */
    beforeSelect?: () => Promise<boolean>
    /** 右边全屏时，树和收起按钮都不显示 */
    full?: boolean
  }>(),
  { loading: false, beforeSelect: undefined, full: false },
)
/** 选中的节点 */
const model = defineModel<string>({ required: true })
defineSlots<{
  default(): unknown
  /** 没有节点时写明原因和下一步；加载中不显示 */
  empty?(): unknown
}>()

const open = ref(true)
const treeRef = useTemplateRef<TreeInstance>('treeRef')

async function select(node: Node) {
  if (node.id === model.value) return
  if (props.beforeSelect && !(await props.beforeSelect())) {
    treeRef.value?.setCurrentKey(model.value)
    return
  }
  model.value = node.id
}
</script>

<template>
  <div class="app-page-body">
    <aside v-show="open && !full" v-loading="loading" class="app-tree-side">
      <el-tree
        v-if="nodes.length > 0"
        ref="treeRef"
        class="app-tree"
        :data="nodes"
        node-key="id"
        highlight-current
        :default-expanded-keys="nodes.map((n) => n.id)"
        :current-node-key="model"
        :expand-on-click-node="false"
        :indent="26"
        @node-click="(n) => select(n as Node)"
      >
        <template #default="{ data, node }">
          <span class="app-tree-node"><FolderIcon v-if="!node.isLeaf" :open="node.expanded" />{{ label(data as Node) }}</span>
        </template>
      </el-tree>
      <slot v-else-if="!loading" name="empty" />
    </aside>
    <div class="app-page-main">
      <button v-if="!full" type="button" class="app-tree-fold" :class="{ 'is-closed': !open }" :aria-label="open ? `收起${noun}树` : `展开${noun}树`" @click="open = !open">
        <el-icon><DArrowLeft /></el-icon>
      </button>
      <slot />
    </div>
  </div>
</template>

<style>
.app-tree-side {
  flex: none;
  width: 22%;
  min-width: 240px;
  max-width: 509px;
  overflow: auto;
  border-right: 1px solid var(--app-panel-border);
  background: var(--app-bg-tree);
}
.app-tree-side > .app-empty {
  padding-top: 80px;
}
.app-tree-fold {
  position: absolute;
  z-index: 8;
  left: -12px;
  top: 18px;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--app-bg-container);
  box-shadow: var(--app-shadow-float);
  font-size: 12px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
}
.app-tree-fold:focus-visible {
  outline: 2px solid var(--app-focus);
}
.app-tree-fold.is-closed {
  left: -8px;
}
.app-tree-fold.is-closed .el-icon {
  transform: rotate(180deg);
}
</style>
