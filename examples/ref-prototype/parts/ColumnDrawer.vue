<script setup lang="ts">
// 表格设置：抽屉，左待添加、右已添加，可搜索、可重置；点字段在两栏间移动。
import { computed, ref, watch } from 'vue'
import { QuestionFilled, Search } from '@element-plus/icons-vue'

const props = defineProps<{ cols: { key: string; title: string }[] }>()
const open = defineModel<boolean>({ required: true })
const shown = defineModel<string[]>('shown', { required: true })

const draft = ref<string[]>([])
const q1 = ref('')
const q2 = ref('')
watch(open, (v) => {
  if (!v) return
  draft.value = [...shown.value]
  q1.value = q2.value = ''
})
const titleOf = (key: string) => props.cols.find((c) => c.key === key)?.title ?? key
const waiting = computed(() => props.cols.filter((c) => !draft.value.includes(c.key) && c.title.includes(q1.value.trim())))
const added = computed(() => draft.value.filter((k) => titleOf(k).includes(q2.value.trim())))
function save() {
  shown.value = [...draft.value]
  open.value = false
}
</script>

<template>
  <el-drawer v-model="open" class="r-cols" modal-class="r-under-head" size="800px" :with-header="false" :lock-scroll="false" title="表格设置" append-to-body>
    <div class="r-cols-head">
      <span>表格设置</span><el-icon title="点字段在两栏之间移动"><QuestionFilled /></el-icon>
      <i />
      <el-button-group><el-button type="primary" :disabled="draft.length === 0" @click="save">保存</el-button><el-button @click="draft = cols.map((c) => c.key)">重置字段</el-button></el-button-group>
      <el-button @click="open = false">取消</el-button>
    </div>
    <div class="r-cols-body">
      <section>
        <header>待添加<el-input v-model="q1" placeholder="请输入字段名称" :suffix-icon="Search" /></header>
        <div class="r-cols-list is-one"><button v-for="c in waiting" :key="c.key" type="button" @click="draft.push(c.key)">{{ c.title }}</button></div>
      </section>
      <section class="is-main">
        <header>已添加<el-input v-model="q2" placeholder="请输入字段名称" :suffix-icon="Search" /></header>
        <div class="r-cols-list"><button v-for="k in added" :key="k" type="button" @click="draft = draft.filter((x) => x !== k)">{{ titleOf(k) }}</button></div>
      </section>
    </div>
  </el-drawer>
</template>

<style>
.el-overlay.r-under-head { top: 68px; }
.r-cols .el-drawer__body { display: flex; flex-direction: column; padding: 0; }
.r-cols-head { flex: none; height: 41px; display: flex; align-items: center; gap: 8px; padding: 0 28px 0 15px; background: #EFEEF4; font-size: 13px; }
.r-cols-head .el-icon { color: #5C86B8; }
.r-cols-head > i:not(.el-icon) { flex: 1; }
.r-cols-head .el-button + .el-button { margin-left: 0; }
.r-cols-body { flex: 1; min-height: 0; display: flex; }
.r-cols-body section { width: 240px; flex: none; border-right: 1px solid var(--r-line-2); display: flex; flex-direction: column; }
.r-cols-body section.is-main { flex: 1; width: auto; border: none; }
.r-cols-body header { height: 39px; display: flex; align-items: center; gap: 8px; padding: 0 8px 0 15px; border-bottom: 1px solid var(--r-line-2); white-space: nowrap; }
.r-cols-body header .el-input { width: 172px; }
.r-cols-list { display: grid; grid-template-columns: repeat(4, 1fr); padding: 16px 29px; overflow: auto; }
.r-cols-list.is-one { grid-template-columns: 1fr; }
.r-cols-list button { padding: 0; border: none; background: none; font-size: 12px; line-height: 39px; text-align: left; color: var(--r-text); cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r-cols-list button:hover { color: var(--r-primary); }
</style>
