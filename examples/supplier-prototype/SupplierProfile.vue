<script setup lang="ts">
// 详情内容：抽屉（A、B）和停靠面板（C）共用。核心金额在前，资料、引用、变更在后。
import { computed } from 'vue'
import { CopyDocument } from '@element-plus/icons-vue'
import { Decimal, formatAmount, isNegative } from '@/shared/money/amount'
import { toast } from '@/shared/ui/feedback'
import { kindText, orgName, settleLabel, statusText, type Supplier } from './data'

const props = defineProps<{ supplier: Supplier }>()
const s = computed(() => props.supplier)

/** 剩余额度 = 信用额度 − 应付余额；不设额度时没有这个数 */
const remaining = computed(() =>
  s.value.creditLimit === null ? null : new Decimal(s.value.creditLimit).minus(s.value.payable).toFixed(2),
)
const over = computed(() => remaining.value !== null && isNegative(remaining.value))
const remainingText = computed(() => {
  if (remaining.value === null) return ''
  return formatAmount(over.value ? new Decimal(remaining.value).abs().toFixed(2) : remaining.value)
})

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`已复制 ${text}`)
  } catch {
    toast.warning('浏览器没有允许复制')
  }
}
</script>

<template>
  <div class="pf">
    <div class="pf-head">
      <h2>{{ s.name }}</h2>
      <div class="pf-meta">
        <span class="dot" :class="`is-${s.status}`">{{ statusText[s.status] }}</span>
        <span class="pf-code">{{ s.code }}<el-button link :icon="CopyDocument" :aria-label="`复制编码 ${s.code}`" @click="copy(s.code)" /></span>
        <span>{{ kindText[s.kind] }}</span>
      </div>
    </div>

    <div class="pf-figures">
      <div class="is-main">
        <span>应付余额</span>
        <b class="app-num" :class="{ 'is-negative': isNegative(s.payable) }">{{ formatAmount(s.payable) }}</b>
      </div>
      <div>
        <span>信用额度</span>
        <b class="app-num">{{ s.creditLimit === null ? '不设额度' : formatAmount(s.creditLimit) }}</b>
      </div>
      <div v-if="remaining !== null">
        <span>{{ over ? '已超额度' : '剩余额度' }}</span>
        <b class="app-num" :class="{ 'is-negative': over }">{{ remainingText }}</b>
      </div>
      <small>单位：元</small>
    </div>

    <dl class="pf-list">
      <div v-if="s.kind === 'domestic'"><dt>信用代码</dt><dd>{{ s.creditCode }}</dd></div>
      <template v-else>
        <div><dt>国家或地区</dt><dd>{{ s.country }}</dd></div>
        <div><dt>当地注册号</dt><dd>{{ s.regNo }}</dd></div>
      </template>
      <div><dt>结算方式</dt><dd>{{ settleLabel(s) }}<template v-if="s.settle === 'monthly'">，每月 {{ s.billDay }} 日对账</template></dd></div>
      <div><dt>适用范围</dt><dd>{{ s.scope === 'group' ? '集团通用' : s.orgIds.map(orgName).join('、') }}</dd></div>
      <div><dt>备注</dt><dd>{{ s.remark || '—' }}</dd></div>
    </dl>

    <h3>引用单据<small>{{ s.references.length }}</small></h3>
    <ul v-if="s.references.length" class="pf-refs">
      <li v-for="r in s.references" :key="r.no"><span>{{ r.type }}</span><b>{{ r.no }}</b><time>{{ r.date }}</time></li>
    </ul>
    <p v-else class="muted">没有单据引用</p>

    <h3>变更记录</h3>
    <ol class="pf-log">
      <li v-for="(l, i) in s.log" :key="i"><b>{{ l.text }}</b><span>{{ l.by }}</span><time>{{ l.at }}</time></li>
    </ol>
  </div>
</template>
