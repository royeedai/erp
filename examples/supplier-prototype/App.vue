<script setup lang="ts">
// 外壳只为还原真实密度：顶栏 48、侧栏 216、页签栏。导航项除当前页外都是占位。
import { ref } from 'vue'
import { Close, Coin, Document, Grid, OfficeBuilding, Tickets, User, Wallet } from '@element-plus/icons-vue'
import { dialogTransition } from '@/theme/motion'
import { toast } from '@/shared/ui/feedback'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { pageState, resetData, showRules, variant } from './data'
import SupplierPage from './SupplierPage.vue'

const variants = [
  { label: '现版', value: '0' },
  { label: 'A 单行工具条', value: 'A' },
  { label: 'B 指标在前', value: 'B' },
  { label: 'C 列表加详情', value: 'C' },
]
const menuKey = ref(0)
function onMenu(index: string) {
  if (index === 'supplier') return
  toast.warning('样页只做了供应商档案')
  menuKey.value++ // 让选中态回到供应商档案
}
</script>

<template>
  <el-config-provider
    :locale="zhCn"
    :dialog="{ transition: dialogTransition }"
    :message="{ max: 3, grouping: true }"
  >
    <div class="shell">
      <div class="shell-top">
        <div class="shell-brand"><el-icon><Grid /></el-icon>ERP 前端基座</div>
        <div class="proto-bar" aria-label="样页控制">
          <el-segmented v-model="variant" :options="variants" size="small" aria-label="版本" />
          <el-select v-model="pageState" size="small" style="width: 100px" aria-label="页面状态">
            <el-option label="正常" value="normal" />
            <el-option label="没有数据" value="empty" />
            <el-option label="查询失败" value="error" />
            <el-option label="没有权限" value="forbidden" />
          </el-select>
          <el-checkbox v-model="showRules" size="small">规则标注</el-checkbox>
          <el-button size="small" text @click="resetData">恢复数据</el-button>
        </div>
        <div class="shell-user">
          <span><el-icon><OfficeBuilding /></el-icon>示例集团</span>
          <span><span class="shell-avatar" aria-hidden="true">甲</span>示例经办甲</span>
        </div>
      </div>
      <div class="shell-body">
        <div class="shell-side">
          <el-menu :key="menuKey" default-active="supplier" @select="onMenu">
            <el-menu-item-group title="基础档案">
              <el-menu-item index="supplier"><el-icon><OfficeBuilding /></el-icon>供应商档案</el-menu-item>
              <el-menu-item index="role"><el-icon><User /></el-icon>项目岗位</el-menu-item>
              <el-menu-item index="bank"><el-icon><Wallet /></el-icon>银行账户</el-menu-item>
            </el-menu-item-group>
            <el-menu-item-group title="应付管理">
              <el-menu-item index="ap"><el-icon><Document /></el-icon>应付台账</el-menu-item>
              <el-menu-item index="pay"><el-icon><Coin /></el-icon>付款申请</el-menu-item>
              <el-menu-item index="check"><el-icon><Tickets /></el-icon>应付核销</el-menu-item>
            </el-menu-item-group>
          </el-menu>
        </div>
        <div class="shell-main">
          <div class="shell-tabs">
            <span class="shell-tab">首页</span>
            <span class="shell-tab is-active">供应商档案<el-icon><Close /></el-icon></span>
          </div>
          <SupplierPage />
        </div>
      </div>
    </div>
  </el-config-provider>
</template>
