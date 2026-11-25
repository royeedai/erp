<template>
  <el-result icon="warning" title="页面不存在" sub-title="地址有误，或该功能尚未开放。">
    <template #extra>
      <el-button type="primary" @click="$router.replace('/home')">回到首页</el-button>
    </template>
  </el-result>
</template>
