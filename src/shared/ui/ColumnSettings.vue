<script setup lang="ts">
// 表格设置：抽屉，左边待添加、右边已添加，可搜索、可重置；点字段在两栏之间移动。行高也在这里切。
import { computed, inject, ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { DEFAULT_DENSITY, DENSITIES, DENSITY_TEXT, densityKey, type Density } from './columns'

const props = defineProps<{ columns: { key: string; label: string }[]; shown: string[]; defaults: string[] }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ save: [keys: string[]] }>()

const density = inject(densityKey, ref<Density>(DEFAULT_DENSITY))
const draft = ref<string[]>([])
const draftDensity = ref<Density>(DEFAULT_DENSITY)
const findWaiting = ref('')
const findAdded = ref('')

watch(open, (v) => {
  if (!v) return
  draft.value = [...props.shown]
  draftDensity.value = density.value
  findWaiting.value = ''
  findAdded.value = ''
})

const labelOf = (key: string) => props.columns.find((c) => c.key === key)?.label ?? key
const waiting = computed(() => props.columns.filter((c) => !draft.value.includes(c.key) && c.label.includes(findWaiting.value.trim())))
const added = computed(() => draft.value.filter((k) => labelOf(k).includes(findAdded.value.trim())))

function reset() {
  draft.value = [...props.defaults]
  draftDensity.value = DEFAULT_DENSITY
}
function save() {
  density.value = draftDensity.value
  emit('save', [...draft.value])
  open.value = false
}
</script>

<template>
  <el-drawer v-model="open" class="app-cols" modal-class="app-cols-mask" title="表格设置" size="800px" append-to-body :with-header="false" :lock-scroll="false">
    <div class="app-cols-head">
      <span>表格设置</span>
      <span class="app-cols-gap" />
      <el-radio-group v-model="draftDensity" aria-label="行高">
        <el-radio-button v-for="d in DENSITIES" :key="d" :value="d">行高{{ DENSITY_TEXT[d] }}</el-radio-button>
      </el-radio-group>
      <el-button-group>
        <el-button type="primary" :disabled="draft.length === 0" @click="save">保存</el-button>
        <el-button @click="reset">重置字段</el-button>
      </el-button-group>
      <el-button @click="open = false">取消</el-button>
    </div>
    <div class="app-cols-body">
      <section>
        <header>待添加<el-input v-model="findWaiting" placeholder="请输入字段名称" aria-label="搜索待添加" :suffix-icon="Search" /></header>
        <div class="app-cols-list is-one">
          <button v-for="c in waiting" :key="c.key" type="button" @click="draft.push(c.key)">{{ c.label }}</button>
        </div>
      </section>
      <section class="is-main">
        <header>已添加<el-input v-model="findAdded" placeholder="请输入字段名称" aria-label="搜索已添加" :suffix-icon="Search" /></header>
        <div class="app-cols-list">
          <button v-for="k in added" :key="k" type="button" @click="draft = draft.filter((x) => x !== k)">{{ labelOf(k) }}</button>
        </div>
      </section>
    </div>
  </el-drawer>
</template>

<style>
.el-overlay.app-cols-mask {
  top: calc(var(--app-header-height) + var(--app-tabs-height));
}
.app-cols .el-drawer__body {
  display: flex;
  flex-direction: column;
  padding: 0;
}
.app-cols-head {
  flex: none;
  height: 41px;
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  padding: 0 28px 0 15px;
  background: var(--app-bg-panel-head);
  font-size: var(--app-font-nav);
}
.app-cols-gap {
  flex: 1;
}
.app-cols-head .el-button + .el-button {
  margin-left: 0;
}
.app-cols-head .el-radio-group {
  --el-radio-button-checked-bg-color: var(--app-segment-on);
  --el-radio-button-checked-text-color: var(--app-accent-deep);
  --el-radio-button-checked-border-color: var(--el-border-color);
}
.app-cols-head .el-radio-button__inner {
  padding: 5px 10px;
  font-size: 12px;
}
.app-cols-body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.app-cols-body section {
  width: 240px;
  flex: none;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--app-divider);
}
.app-cols-body section.is-main {
  flex: 1;
  width: auto;
  border: none;
}
.app-cols-body header {
  height: 39px;
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  padding: 0 8px 0 15px;
  border-bottom: 1px solid var(--app-divider);
  white-space: nowrap;
}
.app-cols-body header .el-input {
  width: 172px;
}
.app-cols-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-content: start;
  padding: 16px 29px;
  overflow: auto;
}
.app-cols-list.is-one {
  grid-template-columns: 1fr;
}
.app-cols-list button {
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  line-height: 39px;
  text-align: left;
  color: var(--el-text-color-primary);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-cols-list button:hover,
.app-cols-list button:focus-visible {
  color: var(--el-color-primary);
}
</style>
