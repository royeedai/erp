<script setup lang="ts">
// 底部：已选在左，分页在右。
import { computed, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'

const props = defineProps<{ total: number; picked: number }>()
const page = defineModel<number>('page', { default: 1 })
const size = defineModel<number>('size', { default: 50 })
const last = computed(() => Math.max(1, Math.ceil(props.total / size.value)))
const jump = ref('')
watch(last, (n) => {
  if (page.value > n) page.value = n
})
function go(n: number) {
  page.value = Math.min(last.value, Math.max(1, n))
}
function onJump() {
  const n = Number.parseInt(jump.value, 10)
  if (n) go(n)
  jump.value = ''
}
</script>

<template>
  <div class="r-foot">
    <span>已选 {{ picked }} 条</span>
    <i />
    <span>共 {{ total }} 条</span>
    <button type="button" :disabled="page === 1" aria-label="第一页" @click="go(1)"><el-icon><DArrowLeft /></el-icon></button>
    <button type="button" :disabled="page === 1" aria-label="上一页" @click="go(page - 1)"><el-icon><ArrowLeft /></el-icon></button>
    <button v-for="n in last" :key="n" type="button" :class="{ 'is-on': n === page }" :aria-current="n === page" @click="go(n)">{{ n }}</button>
    <button type="button" :disabled="page === last" aria-label="下一页" @click="go(page + 1)"><el-icon><ArrowRight /></el-icon></button>
    <button type="button" :disabled="page === last" aria-label="最后一页" @click="go(last)"><el-icon><DArrowRight /></el-icon></button>
    <el-select v-model="size" class="r-foot-size" aria-label="每页条数"><el-option v-for="n in [20, 50, 100, 200]" :key="n" :value="n" :label="n" /></el-select>
    <span>条</span><span>跳至</span>
    <el-input v-model="jump" class="r-foot-jump" aria-label="跳至" @keydown.enter="onJump" />
    <span>页</span>
  </div>
</template>

<style>
.r-foot { flex: none; box-sizing: border-box; height: 42px; display: flex; align-items: center; gap: 8px; padding: 0 43px 0 30px; border-top: 1px solid var(--r-row-line); background: #FFFFFF; color: #35353B; }
.r-foot > i:not(.el-icon) { flex: 1; }
.r-foot button { min-width: 18px; height: 18px; padding: 0 3px; border: none; border-radius: 3px; background: none; font-size: 12px; line-height: 18px; color: #55555C; cursor: pointer; }
.r-foot button .el-icon { vertical-align: -2px; }
.r-foot button:disabled { color: #C2C0C8; cursor: default; }
.r-foot button.is-on { background: #A9AEBA; color: #FFFFFF; }
.r-foot-size { width: 70px; margin-left: 6px; }
.r-foot-size .el-select__wrapper, .r-foot-jump .el-input__wrapper { min-height: 22px; height: 22px; line-height: 20px; }
.r-foot-jump { width: 50px; }
</style>
