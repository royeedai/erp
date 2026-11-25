<script setup lang="ts">
// 全部应用：左边业务域卡片和模块，右边选中模块的应用。从顶栏下沿盖住页面，宽约九成。
import { computed, ref, watch } from 'vue'
import { ArrowDown, Box, Coin, Connection, Folder, Goods, OfficeBuilding, Setting, User, Wallet } from '@element-plus/icons-vue'
import { APPS, type AppItem } from './data'
import AppIcon from './parts/AppIcon.vue'

const props = defineProps<{ current?: AppItem }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ open: [key: string, title: string] }>()

const icons = [
  { icon: OfficeBuilding, tone: 'orange' as const },
  { icon: Box, tone: 'teal' as const },
  { icon: Goods, tone: 'blue' as const },
  { icon: Coin, tone: 'red' as const },
  { icon: Wallet, tone: 'violet' as const },
  { icon: User, tone: 'orange' as const },
  { icon: Setting, tone: 'slate' as const },
]
const uniq = (list: string[]) => [...new Set(list)]
const domains = uniq(APPS.map((a) => a.path[0])).map((name, i) => ({
  name,
  ...(icons[i] ?? { icon: Connection, tone: 'blue' as const }),
  modules: uniq(APPS.filter((a) => a.path[0] === name).map((a) => a.path[1])),
}))
const closed = ref<string[]>([])
const on = ref({ domain: domains[0]!.name, module: domains[0]!.modules[0]! })
watch(open, (v) => {
  if (v && props.current) on.value = { domain: props.current.path[0], module: props.current.path[1] }
})
const groups = computed(() => {
  const list = APPS.filter((a) => a.path[0] === on.value.domain && a.path[1] === on.value.module)
  return uniq(list.map((a) => a.path[2])).map((name) => ({ name, apps: list.filter((a) => a.path[2] === name) }))
})
const toggle = (name: string) => (closed.value = closed.value.includes(name) ? closed.value.filter((x) => x !== name) : [...closed.value, name])
</script>

<template>
  <el-drawer v-model="open" class="r-nav" modal-class="r-nav-mask" direction="ltr" size="89%" title="全部应用" :with-header="false" :lock-scroll="false">
    <div class="r-nav-left">
      <section v-for="d in domains" :key="d.name" class="r-nav-card">
        <button type="button" class="r-nav-domain" :aria-expanded="!closed.includes(d.name)" @click="toggle(d.name)">
          <AppIcon :icon="d.icon" :tone="d.tone" :size="16" /><b>{{ d.name }}</b><el-icon :class="{ 'is-closed': closed.includes(d.name) }"><ArrowDown /></el-icon>
        </button>
        <div v-if="!closed.includes(d.name)" class="r-nav-mods">
          <button v-for="m in d.modules" :key="m" type="button" :class="{ 'is-on': on.domain === d.name && on.module === m }" @click="on = { domain: d.name, module: m }">{{ m }}</button>
        </div>
      </section>
    </div>
    <div class="r-nav-right">
      <section v-for="g in groups" :key="g.name">
        <h3><el-icon><Folder /></el-icon>{{ g.name }}</h3>
        <div class="r-nav-apps">
          <button v-for="a in g.apps" :key="a.title" type="button" :class="{ 'is-on': current?.title === a.title }" @click="emit('open', a.key, a.title)">{{ a.title }}</button>
        </div>
      </section>
    </div>
  </el-drawer>
</template>

<style>
.el-overlay.r-nav-mask { top: 40px; background: rgba(0, 0, 0, 0.2); }
.r-nav .el-drawer__body { display: flex; padding: 0; overflow: hidden; background: #F2F1F7; }
.r-nav-left { flex: none; box-sizing: border-box; width: 316px; padding: 18px 10px; overflow: auto; scrollbar-width: thin; }
.r-nav-card { margin-bottom: 10px; padding: 8px 8px 8px 10px; border-radius: 4px; background: #FFFFFF; }
.r-nav-domain { width: 100%; display: flex; align-items: center; gap: 9px; height: 32px; padding: 0; border: none; background: none; font-size: 14px; color: #1F1F25; cursor: pointer; }
.r-nav-domain b { flex: 1; text-align: left; }
.r-nav-domain > .el-icon { font-size: 12px; color: #8E8D95; }
.r-nav-domain .is-closed { transform: rotate(-90deg); }
.r-nav-mods { display: grid; grid-template-columns: 129px 1fr; padding-left: 18px; }
.r-nav-mods button { height: 28px; margin-bottom: 2px; padding: 0 0 0 6px; border: none; border-left: 2px solid transparent; background: none; font-size: 13px; text-align: left; color: #35353B; cursor: pointer; white-space: nowrap; }
.r-nav-mods button:hover { color: var(--r-blue); }
.r-nav-mods button.is-on { border-left-color: var(--r-blue); background: #EEF2FD; color: var(--r-blue); }
.r-nav-right { flex: 1; min-width: 0; margin: 10px 10px 0 4px; padding: 26px 32px; overflow: auto; border-radius: 4px 4px 0 0; background: #FFFFFF; }
.r-nav-right section + section { margin-top: 22px; }
.r-nav-right h3 { display: flex; align-items: center; gap: 7px; margin: 0 0 6px; font-size: 14px; line-height: 28px; color: #1F1F25; }
.r-nav-right h3 .el-icon { color: #5C6B93; }
.r-nav-apps { display: grid; grid-template-columns: repeat(4, 1fr); padding-left: 21px; }
.r-nav-apps button { padding: 0; border: none; background: none; font-size: 13px; line-height: 29px; text-align: left; color: #35353B; cursor: pointer; }
.r-nav-apps button:hover, .r-nav-apps button.is-on { color: var(--r-blue); }
</style>
