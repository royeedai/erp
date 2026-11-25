<script setup lang="ts">
// 查询行：查询方案、一排条件、查询、高级查询、更多、收起。
import { ref } from 'vue'
import { ArrowDown, DArrowLeft, MoreFilled, Search } from '@element-plus/icons-vue'

const emit = defineEmits<{ search: []; reset: [] }>()
const open = ref(true)
</script>

<template>
  <div class="r-query" :class="{ 'is-closed': !open }">
    <el-dropdown trigger="click">
      <span class="r-query-scheme">快速查询<el-icon><ArrowDown /></el-icon></span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item>快速查询</el-dropdown-item>
          <el-dropdown-item>本月待我处理</el-dropdown-item>
          <el-dropdown-item divided>另存为查询方案</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    <div v-show="open" class="r-query-fields" @keydown.enter="emit('search')"><slot /></div>
    <button v-show="open" type="button" class="r-query-go" aria-label="查询" @click="emit('search')"><el-icon><Search /></el-icon></button>
    <el-button v-show="open" class="r-icon-btn" aria-label="高级查询" title="高级查询">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
        <path d="M6 13.4H2.6a1 1 0 0 1-1-1V2.6a1 1 0 0 1 1-1h8.8a1 1 0 0 1 1 1V6M4 4.6h6.4M4 7.4h3" />
        <circle cx="9.8" cy="9.8" r="2.4" /><path d="m11.6 11.6 2 2" />
      </svg>
    </el-button>
    <el-dropdown v-show="open" trigger="click">
      <el-button class="r-icon-btn" :icon="MoreFilled" aria-label="更多" />
      <template #dropdown>
        <el-dropdown-menu><el-dropdown-item @click="emit('reset')">清空条件</el-dropdown-item></el-dropdown-menu>
      </template>
    </el-dropdown>
    <button type="button" class="r-query-fold" :aria-label="open ? '收起' : '展开'" @click="open = !open"><el-icon><DArrowLeft /></el-icon></button>
    <slot name="end" />
  </div>
</template>

<style>
.r-query { flex: none; box-sizing: border-box; height: 38px; display: flex; align-items: center; gap: 6px; padding: 0 20px; background: var(--r-query); }
.r-query-scheme { display: inline-flex; align-items: center; gap: 5px; margin-right: 6px; line-height: 26px; color: var(--r-text); cursor: pointer; white-space: nowrap; outline: none; }
.r-query-fields { display: flex; gap: 5px; min-width: 0; }
.r-query-fields > * { width: 232px; flex: 0 1 auto; }
.r-query-fields > .is-wide { width: 296px; }
@media (min-width: 2200px) { .r-query-fields > * { width: 296px; } }
@media (max-width: 1500px) { .r-query-fields > * { width: 176px; } .r-query-fields > .is-wide { width: 236px; } }
.r-query .r-icon-btn.el-button { margin: 0; width: 28px; }
.r-query-fold { width: 22px; height: 22px; padding: 0; border: none; background: none; cursor: pointer; color: #35353B; font-size: 13px; transform: rotate(90deg); }
.r-query.is-closed .r-query-fold { transform: rotate(-90deg); }
</style>
