<script setup lang="ts">
import { RouterView } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { dialogTransition } from '@/theme/motion'
</script>

<template>
  <el-config-provider
    :locale="zhCn"
    :dialog="{ transition: dialogTransition }"
    :message="{ max: 3, grouping: true }"
  >
    <RouterView />
  </el-config-provider>
</template>
