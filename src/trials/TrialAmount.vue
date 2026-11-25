<script setup lang="ts">
// 试验三的页面：正式封装 AmountInput，加一个“边输边加千分位”的对照组
import { ref } from 'vue'
import AmountInput from '@/shared/ui/AmountInput.vue'
import { formatAmount } from '@/shared/money/amount'

const value = ref<string | null>(null)
const limited = ref<string | null>(null)
const invalid = ref('')
const changes = ref<(string | null)[]>([])

// 对照组：el-input 的 formatter / parser，边输边加千分位
const live = ref('')
const liveFormatter = (v: string) => v.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const liveParser = (v: string) => v.replace(/,/g, '')

;(window as unknown as Record<string, unknown>).__amount = {
  get: () => value.value,
  set: (v: string | null) => (value.value = v),
  getLimited: () => limited.value,
  invalid: () => invalid.value,
  clearInvalid: () => (invalid.value = ''),
  changes: () => [...changes.value],
  getLive: () => live.value,
  format: formatAmount,
}
</script>

<template>
  <div style="padding: 24px; width: 360px">
    <p>AmountInput</p>
    <AmountInput
      v-model="value"
      data-test="amount"
      @invalid="(r) => (invalid = r)"
      @change="(v) => changes.push(v)"
    />
    <p>不允许负数、整数最多 6 位</p>
    <AmountInput v-model="limited" data-test="limited" :allow-negative="false" :max-integer="6" @invalid="(r) => (invalid = r)" />
    <p>对照：formatter/parser 边输边加千分位</p>
    <el-input v-model="live" data-test="live" :formatter="liveFormatter" :parser="liveParser" />
    <p><el-button data-test="elsewhere">别处</el-button></p>
  </div>
</template>
