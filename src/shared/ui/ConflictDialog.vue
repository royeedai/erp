<script lang="ts">
export interface ConflictField {
  label: string
  mine: string
  latest: string
}
export interface ConflictGroup {
  /** 表内编辑一次会冲突多行，写明是哪一行 */
  title?: string
  fields: ConflictField[]
  note?: string
}
</script>

<script setup lang="ts">
// 409：并列显示“你的值 / 最新值”，由用户决定，不自动覆盖。
import { computed } from 'vue'

const props = defineProps<{ message: string; groups: ConflictGroup[] }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ 'use-latest': []; 'keep-mine': [] }>()

const shown = computed(() => props.groups.map((g) => ({ ...g, fields: g.fields.filter((f) => f.mine !== f.latest) })))
</script>

<template>
  <el-dialog v-model="open" title="数据已被他人修改" width="640px" append-to-body align-center :close-on-click-modal="false">
    <p class="app-conflict-note">{{ message }}。下面是你填的值和最新值，请选择以哪一份为准。</p>
    <div class="app-conflict-list">
      <section v-for="(g, i) in shown" :key="i">
        <h3 v-if="g.title">{{ g.title }}</h3>
        <el-descriptions v-if="g.fields.length > 0" :column="1" border>
          <el-descriptions-item v-for="f in g.fields" :key="f.label" :label="f.label" label-class-name="app-conflict-label">
            <div>你的值：{{ f.mine || '—' }}</div>
            <div class="app-conflict-latest">最新值：{{ f.latest || '—' }}</div>
          </el-descriptions-item>
        </el-descriptions>
        <p v-else>{{ g.note ?? '你填的内容与最新值一致。' }}</p>
      </section>
    </div>
    <template #footer>
      <el-button type="primary" @click="emit('keep-mine')">保留我的值，重新保存</el-button>
      <el-button @click="emit('use-latest')">改用最新值</el-button>
    </template>
  </el-dialog>
</template>

<style>
.app-conflict-note {
  margin: 0 0 var(--app-space-3);
}
.app-conflict-list {
  max-height: 50vh;
  overflow: auto;
}
.app-conflict-list section + section {
  margin-top: var(--app-space-3);
}
.app-conflict-list h3 {
  margin: 0 0 var(--app-space-1);
  font-size: 12px;
}
.app-conflict-list p {
  margin: 0;
}
.app-conflict-label.el-descriptions__label {
  width: 120px;
}
.app-conflict-latest {
  color: var(--app-accent);
}
</style>
