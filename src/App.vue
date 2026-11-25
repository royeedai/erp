<script setup lang="ts">
import { provide } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { usePreferencesStore } from '@/app/preferences.store'
import { densityKey } from '@/shared/ui/columns'
import { dialogTransition } from '@/theme/motion'

provide(densityKey, storeToRefs(usePreferencesStore()).density)
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
