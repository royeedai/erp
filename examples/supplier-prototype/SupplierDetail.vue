<script setup lang="ts">
// 查看：抽屉只放只读内容，要改就关掉抽屉去对话框
import { formatAmount, isNegative } from '@/shared/money/amount'
import { kindText, orgName, settleLabel, statusText, type Supplier } from './data'

defineProps<{ supplier: Supplier | null }>()
const visible = defineModel<boolean>({ required: true })
const emit = defineEmits<{ edit: [supplier: Supplier] }>()
const statusClass = { enabled: 'is-done', frozen: 'is-watch', disabled: 'is-draft' } as const
</script>

<template>
  <el-drawer v-model="visible" size="560">
    <template #header>
      <span v-if="supplier" class="el-drawer__title">
        {{ supplier.code }} <span class="status" :class="statusClass[supplier.status]">{{ statusText[supplier.status] }}</span>
      </span>
    </template>
    <div v-if="supplier" class="detail">
      <h3>{{ supplier.name }}</h3>
      <dl class="detail-grid">
        <div><dt>供应商类型</dt><dd>{{ kindText[supplier.kind] }}</dd></div>
        <div v-if="supplier.kind === 'domestic'"><dt>统一社会信用代码</dt><dd>{{ supplier.creditCode }}</dd></div>
        <div v-else><dt>国家或地区 / 注册号</dt><dd>{{ supplier.country }} / {{ supplier.regNo }}</dd></div>
        <div><dt>结算方式</dt><dd>{{ settleLabel(supplier) }}<template v-if="supplier.settle === 'monthly'">，每月 {{ supplier.billDay }} 日对账</template></dd></div>
        <div><dt>信用额度（元）</dt><dd class="app-num">{{ formatAmount(supplier.creditLimit) }}</dd></div>
        <div><dt>应付余额（元）</dt><dd class="app-num" :class="{ 'is-negative': isNegative(supplier.payable) }">{{ formatAmount(supplier.payable) }}</dd></div>
        <div><dt>适用范围</dt><dd>{{ supplier.scope === 'group' ? '集团通用' : supplier.orgIds.map(orgName).join('、') }}</dd></div>
        <div class="is-wide"><dt>备注</dt><dd>{{ supplier.remark || '—' }}</dd></div>
      </dl>

      <h4>引用单据 <small>{{ supplier.references.length }} 张</small></h4>
      <table v-if="supplier.references.length" class="mini">
        <thead><tr><th>单据类型</th><th>单号</th><th>业务日期</th></tr></thead>
        <tbody>
          <tr v-for="r in supplier.references" :key="r.no"><td>{{ r.type }}</td><td>{{ r.no }}</td><td>{{ r.date }}</td></tr>
        </tbody>
      </table>
      <p v-else class="muted">没有单据引用这个供应商</p>

      <h4>变更记录</h4>
      <ul class="log">
        <li v-for="(l, i) in supplier.log" :key="i"><time>{{ l.at }}</time><span>{{ l.by }}</span><span>{{ l.text }}</span></li>
      </ul>
    </div>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" @click="supplier && emit('edit', supplier)">编辑</el-button>
    </template>
  </el-drawer>
</template>
