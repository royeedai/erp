<script setup lang="ts">
// 规则标注：只在样页里用，打开“规则标注”后显示编号，悬停看规则和出处
import { ruleList, showRules, type RuleKey } from './data'

const props = defineProps<{ rule: RuleKey }>()
const item = ruleList[props.rule]
</script>

<template>
  <el-tooltip v-if="showRules" placement="top">
    <template #content>
      <div class="rule-tip">{{ item.text }}<br /><small>出处：{{ item.from }}</small></div>
    </template>
    <span class="rule-mark" tabindex="0" :aria-label="`规则 ${item.n}：${item.text}`">{{ item.n }}</span>
  </el-tooltip>
</template>
