<script setup lang="ts">
// 提示信息：版式跟参照站；有改动才问，按钮写具体动作（这两条是我们自己的规则）。
import { ref } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'

const open = ref(false)
const info = ref({ title: '', message: '', ok: '确认', cancel: '取消' })
let resolve: ((v: boolean) => void) | null = null

function ask(next: Partial<typeof info.value> & { title: string; message: string }) {
  info.value = { ok: '确认', cancel: '取消', ...next }
  open.value = true
  return new Promise<boolean>((r) => (resolve = r))
}
function done(v: boolean) {
  open.value = false
  resolve?.(v)
  resolve = null
}
defineExpose({ ask })
</script>

<template>
  <el-dialog :model-value="open" title="提示信息" width="400px" align-center append-to-body :close-on-click-modal="false" @close="done(false)">
    <div class="r-confirm">
      <el-icon><WarningFilled /></el-icon>
      <div><h3>{{ info.title }}</h3><p>{{ info.message }}</p></div>
    </div>
    <template #footer>
      <el-button type="primary" @click="done(true)">{{ info.ok }}</el-button>
      <el-button @click="done(false)">{{ info.cancel }}</el-button>
    </template>
  </el-dialog>
</template>

<style>
.r-confirm { display: flex; gap: 12px; padding: 22px 30px 34px; }
.r-confirm .el-icon { font-size: 22px; color: #F6B41C; }
.r-confirm h3 { font-size: 16px; line-height: 22px; font-weight: 400; }
.r-confirm p { margin-top: 8px; color: #35353B; }
</style>
