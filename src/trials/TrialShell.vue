<script setup lang="ts">
import { useTabsStore } from '@/app/tabs/tabs.store'
import TabBar from '@/app/tabs/TabBar.vue'
import TabPages from '@/app/tabs/TabPages.vue'

const tabs = useTabsStore()
</script>

<template>
  <div class="shell">
    <TabBar />
    <div class="content"><TabPages /></div>
    <span hidden data-count>{{ tabs.tabs.length }}</span>
  </div>
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
}
.shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.content {
  flex: 1;
  min-height: 0;
}
</style>
