<script setup lang="ts">
// 全部应用：左边业务域卡片和模块，右边是选中模块的应用。从顶栏下沿盖住页面，顶栏保持可用。
import { computed, ref, watch, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowDown, Coin, Folder, Goods, Grid, OfficeBuilding, Setting, User, Wallet } from '@element-plus/icons-vue'
import AppIcon, { type AppTone } from '@/shared/ui/AppIcon.vue'
import { groupBy, useApps } from '../apps'

const open = defineModel<boolean>({ required: true })

const apps = useApps()
const route = useRoute()

/** 业务域的图标，没登记的用默认 */
const domainIcons: Record<string, { icon: Component; tone: AppTone }> = {
  项目管理: { icon: OfficeBuilding, tone: 'orange' },
  供应链: { icon: Goods, tone: 'blue' },
  财务会计: { icon: Coin, tone: 'red' },
  资金管理: { icon: Wallet, tone: 'violet' },
  人力资本: { icon: User, tone: 'orange' },
  基础平台: { icon: Setting, tone: 'slate' },
}
const iconOf = (domain: string) => domainIcons[domain] ?? { icon: Grid, tone: 'teal' as const }

const domains = computed(() =>
  groupBy(apps.value, (a) => a.domain).map(([name, list]) => ({ name, modules: groupBy(list, (a) => a.module).map(([module]) => module) })),
)
const closed = ref<string[]>([])
/** 不同业务域会有同名模块，选中项带上业务域 */
const current = ref<{ domain: string; module: string } | null>(null)

watch(open, (v) => {
  if (!v) return
  const here = apps.value.find((a) => a.path === route.path) ?? apps.value[0]
  current.value = here ? { domain: here.domain, module: here.module } : null
})

const isCurrent = (domain: string, module: string) => current.value?.domain === domain && current.value.module === module
const groups = computed(() => groupBy(apps.value.filter((a) => isCurrent(a.domain, a.module)), (a) => a.group))

function toggle(name: string) {
  closed.value = closed.value.includes(name) ? closed.value.filter((n) => n !== name) : [...closed.value, name]
}
</script>

<template>
  <el-drawer
    v-model="open"
    class="app-nav"
    modal-class="app-nav-overlay"
    title="全部应用"
    direction="ltr"
    size="89%"
    :with-header="false"
    :lock-scroll="false"
  >
    <template v-if="domains.length > 0">
      <div class="app-nav-domains">
        <section v-for="d in domains" :key="d.name" class="app-nav-card">
          <button type="button" class="app-nav-domain" :aria-expanded="!closed.includes(d.name)" @click="toggle(d.name)">
            <AppIcon v-bind="iconOf(d.name)" :size="16" />
            <b>{{ d.name }}</b>
            <el-icon :class="{ 'is-closed': closed.includes(d.name) }"><ArrowDown /></el-icon>
          </button>
          <div v-if="!closed.includes(d.name)" class="app-nav-modules">
            <button
              v-for="m in d.modules"
              :key="m"
              type="button"
              :class="{ 'is-on': isCurrent(d.name, m) }"
              :aria-pressed="isCurrent(d.name, m)"
              @click="current = { domain: d.name, module: m }"
            >
              {{ m }}
            </button>
          </div>
        </section>
      </div>
      <div class="app-nav-apps">
        <section v-for="[group, list] in groups" :key="group">
          <h2><el-icon><Folder /></el-icon>{{ group }}</h2>
          <div class="app-nav-grid">
            <RouterLink v-for="a in list" :key="a.path" :to="a.path" @click="open = false">{{ a.title }}</RouterLink>
          </div>
        </section>
      </div>
    </template>
    <el-empty v-else class="app-nav-empty" description="没有可用的应用，请联系管理员开通" :image-size="80" />
  </el-drawer>
</template>

<style>
.el-overlay.app-nav-overlay {
  top: var(--app-header-height);
  background: var(--app-mask);
}
.app-nav .el-drawer__body {
  display: flex;
  padding: 0;
  overflow: hidden;
  background: var(--app-bg-nav);
}
.app-nav-domains {
  box-sizing: border-box;
  width: 316px;
  flex: none;
  padding: 18px 10px;
  overflow: auto;
  scrollbar-width: thin;
}
.app-nav-card {
  margin-bottom: 10px;
  padding: 8px 8px 8px 10px;
  border-radius: 4px;
  background: var(--app-bg-container);
}
.app-nav-domain {
  width: 100%;
  height: 32px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0;
  border: none;
  background: none;
  font-size: var(--app-font-section);
  color: var(--el-text-color-primary);
  cursor: pointer;
}
.app-nav-domain b {
  flex: 1;
  text-align: left;
}
.app-nav-domain > .el-icon {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.app-nav-domain .is-closed {
  transform: rotate(-90deg);
}
.app-nav-modules {
  display: grid;
  grid-template-columns: 129px 1fr;
  padding-left: 18px;
}
.app-nav-modules button {
  height: 28px;
  margin-bottom: 2px;
  padding: 0 0 0 6px;
  border: none;
  border-left: 2px solid transparent;
  background: none;
  font-size: var(--app-font-nav);
  text-align: left;
  color: var(--el-text-color-regular);
  cursor: pointer;
  white-space: nowrap;
}
.app-nav-modules button:hover {
  color: var(--app-accent);
}
.app-nav-modules button.is-on {
  border-left-color: var(--app-accent);
  background: var(--app-accent-bg);
  color: var(--app-accent);
}
.app-nav-domain:focus-visible,
.app-nav-modules button:focus-visible,
.app-nav-grid a:focus-visible {
  outline: 2px solid var(--app-focus);
  outline-offset: 1px;
}
.app-nav-apps {
  flex: 1;
  min-width: 0;
  margin: 10px 10px 0 4px;
  padding: 26px 32px;
  overflow: auto;
  border-radius: 4px 4px 0 0;
  background: var(--app-bg-container);
}
.app-nav-apps section + section {
  margin-top: 22px;
}
.app-nav-apps h2 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 6px;
  font-size: var(--app-font-section);
  line-height: 28px;
  font-weight: var(--app-font-bold);
}
.app-nav-apps h2 .el-icon {
  color: var(--app-caret-fg);
}
.app-nav-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0 var(--app-space-4);
  padding-left: 21px;
}
.app-nav-grid a {
  font-size: var(--app-font-nav);
  line-height: 29px;
  color: var(--el-text-color-regular);
  text-decoration: none;
}
.app-nav-grid a:hover,
.app-nav-grid a.router-link-active {
  color: var(--app-accent);
}
.app-nav-empty {
  flex: 1;
}
</style>
