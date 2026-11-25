<script lang="ts">
export interface RefNode {
  id: string
  code: string
  name: string
  /** 已停用：默认不列出；已选中的停用项照常显示，标“已停用” */
  enabled?: boolean
  children?: RefNode[]
}
</script>

<script setup lang="ts">
// 档案参照（树，单选）：框里显示“编码 名称”，点开弹层搜索、看停用，写明候选范围；提交稳定 ID。
import { computed, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import EmptyHint from './EmptyHint.vue'

const props = withDefaults(
  defineProps<{
    nodes: RefNode[]
    /** 弹层标题，也用作占位文字，例如“项目组织” */
    title: string
    /** 候选范围，例如“有权维护的项目组织” */
    scope?: string
    required?: boolean
    disabled?: boolean
    invalid?: boolean
    loading?: boolean
    /** 一个都选不到时给的原因 */
    emptyNote?: string
  }>(),
  { scope: '', required: false, disabled: false, invalid: false, loading: false, emptyNote: '没有可选的，请联系管理员' },
)
// 弹层和输入框并列，外面给的 class 落到输入框上
defineOptions({ inheritAttrs: false })
const model = defineModel<string>({ required: true })
const emit = defineEmits<{ change: [node: RefNode] }>()

const open = ref(false)
const picked = ref('')
const query = ref('')
const showOff = ref(false)

function find(nodes: RefNode[], id: string): RefNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    const hit = find(n.children ?? [], id)
    if (hit) return hit
  }
  return undefined
}
const textOf = (n: RefNode) => `${n.code} ${n.name}${n.enabled === false ? '（已停用）' : ''}`
const label = computed(() => {
  const node = find(props.nodes, model.value)
  return node ? textOf(node) : ''
})

/** 命中的节点连同它的上级一起留下 */
function filter(nodes: RefNode[]): RefNode[] {
  const q = query.value.trim()
  return nodes.flatMap((n) => {
    if (n.enabled === false && !showOff.value) return []
    const children = filter(n.children ?? [])
    if (children.length === 0 && q !== '' && !textOf(n).includes(q)) return []
    return [{ ...n, children }]
  })
}
const shown = computed(() => filter(props.nodes))

function show() {
  if (props.disabled) return
  picked.value = model.value
  query.value = ''
  showOff.value = false
  open.value = true
}
function take() {
  const node = find(props.nodes, picked.value)
  open.value = false
  if (!node || node.id === model.value) return
  model.value = node.id
  emit('change', node)
}
</script>

<template>
  <el-input
    v-bind="$attrs"
    class="app-ref"
    :class="{ 'is-invalid': invalid }"
    :model-value="label"
    :placeholder="title"
    :aria-label="title"
    :disabled="disabled"
    readonly
    @click="show"
    @keydown.enter.stop="show"
  >
    <template v-if="required" #prefix><i class="app-star">*</i></template>
    <template #suffix>
      <button type="button" class="app-ref-btn" :disabled="disabled" :aria-label="`选择${title}`" @click.stop="show">
        <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true">
          <path d="M4.5 1.5h9M4.5 6h9M4.5 10.5h9" />
          <path d="M.6 1.5h1.6M.6 6h1.6M.6 10.5h1.6" stroke-width="1.6" />
        </svg>
      </button>
    </template>
  </el-input>
  <el-dialog v-model="open" :title="title" width="640px" align-center append-to-body :close-on-click-modal="false">
    <div class="app-ref-bar">
      <el-input v-model="query" :placeholder="`搜索${title}`" :aria-label="`搜索${title}`" :suffix-icon="Search" clearable />
      <el-checkbox v-model="showOff" label="显示停用" />
      <span v-if="scope">候选范围：{{ scope }}</span>
    </div>
    <div v-loading="loading" class="app-ref-list">
      <el-tree
        v-if="shown.length > 0"
        class="app-tree"
        :data="shown"
        node-key="id"
        default-expand-all
        highlight-current
        :current-node-key="picked"
        :expand-on-click-node="false"
        :indent="26"
        @node-click="(n: RefNode) => (picked = n.id)"
      >
        <template #default="{ data }">
          <span class="app-tree-node" @dblclick="take">{{ textOf(data as RefNode) }}</span>
        </template>
      </el-tree>
      <EmptyHint v-else-if="query.trim()" :title="`没有符合的${title}`" note="换个关键字，或勾上显示停用" />
      <EmptyHint v-else-if="!loading" :title="`没有${title}`" :note="emptyNote" />
    </div>
    <template #footer>
      <el-button type="primary" :disabled="!find(nodes, picked)" @click="take">确定</el-button>
      <el-button @click="open = false">取消</el-button>
    </template>
  </el-dialog>
</template>

<style>
.app-ref .el-input__inner {
  cursor: pointer;
  text-overflow: ellipsis;
}
.app-ref.is-disabled .el-input__inner {
  cursor: default;
}
.app-ref.is-invalid .el-input__wrapper {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}
.app-ref-btn {
  display: inline-flex;
  padding: 0;
  border: none;
  background: none;
  color: var(--el-disabled-text-color);
  cursor: pointer;
}
.app-ref-btn:hover:not(:disabled),
.app-ref-btn:focus-visible {
  color: var(--el-color-primary);
}
.app-ref-bar {
  display: flex;
  align-items: center;
  gap: 22px;
  color: var(--el-text-color-secondary);
}
.app-ref-bar .el-input {
  width: 190px;
}
.app-ref-list {
  height: 280px;
  overflow: auto;
}
.app-ref-list > .app-empty {
  height: 100%;
}
</style>
