<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { PERM_NAMES, type PermissionCode } from '../permissions'

const route = useRoute()
const permission = computed(() => {
  const code = String(route.query.permission ?? '')
  return code ? `${PERM_NAMES[code as PermissionCode] ?? ''}（${code}）` : ''
})
</script>

<template>
  <el-result icon="error" title="没有权限" :sub-title="permission ? `缺少权限：${permission}` : '请联系管理员开通。'">
    <template #extra>
      <el-button type="primary" @click="$router.replace('/home')">回到工作台</el-button>
    </template>
  </el-result>
</template>
