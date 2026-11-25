<script setup lang="ts">
import { ref } from 'vue'

const rows = ref([
  { id: '1', code: 'GW001', name: '项目经理' },
  { id: '2', code: 'GW002', name: '造价工程师' },
])
</script>

<template>
  <el-button type="primary">Element Plus</el-button>
  <vxe-table :data="rows">
    <vxe-column field="code" title="编码" />
    <vxe-column field="name" title="名称" />
  </vxe-table>
</template>
