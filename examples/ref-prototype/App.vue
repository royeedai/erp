<script setup lang="ts">
// 外壳：顶栏（全部应用、面包屑、应用搜索、通知、日期、头像）+ 页签条 + 页面。
import { computed, defineAsyncComponent, onMounted, reactive, ref, watch, type Component } from 'vue'
import { ArrowDown, Bell, Calendar, Close, DArrowRight, FullScreen, HomeFilled, House, Search, Top, UserFilled, Menu } from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { dialogTransition } from '@/theme/motion'
import { toast } from '@/shared/ui/feedback'
import AppNav from './AppNav.vue'
import { APPS, PAGES } from './data'

const components: Record<string, Component> = {
  home: defineAsyncComponent(() => import('./pages/HomePage.vue')),
  'project-role': defineAsyncComponent(() => import('./pages/ProjectRole.vue')),
  'change-reason': defineAsyncComponent(() => import('./pages/ChangeReason.vue')),
  'change-order': defineAsyncComponent(() => import('./pages/ChangeOrder.vue')),
  supplier: defineAsyncComponent(() => import('./pages/SupplierPage.vue')),
  purchase: defineAsyncComponent(() => import('./pages/PurchasePage.vue')),
}

const tabs = reactive<{ key: string; title: string }[]>([{ key: 'home', title: '首页' }])
const active = ref('home')
const navOpen = ref(false)

function open(key: string, title = '') {
  navOpen.value = false
  if (!components[key]) {
    toast.warning(`原型里没有做“${title}”，能点开的是：${PAGES.map((x) => x.title).join('、')}`)
    return
  }
  const page = PAGES.find((x) => x.key === key)
  if (!tabs.some((t) => t.key === key)) tabs.push({ key, title: page?.title ?? title })
  active.value = key
}
function close(key: string) {
  const i = tabs.findIndex((t) => t.key === key)
  tabs.splice(i, 1)
  if (active.value === key) active.value = (tabs[i] ?? tabs[i - 1])!.key
}
watch(active, (k) => history.replaceState(null, '', `#${k}`))
onMounted(() => {
  const key = location.hash.slice(1)
  if (key && key !== 'home') open(key)
})

const current = computed(() => PAGES.find((x) => x.key === active.value))
const crumbs = computed(() => (current.value ? [...current.value.path, current.value.title] : []))

/* ---------- 应用搜索 ---------- */
const keyword = ref('')
const searchOpen = ref(false)
const hits = computed(() => {
  const q = keyword.value.trim()
  return q ? APPS.filter((a) => a.title.includes(q)).slice(0, 12) : []
})
function parts(title: string) {
  const q = keyword.value.trim()
  const i = title.indexOf(q)
  return i < 0 ? [title, '', ''] : [title.slice(0, i), q, title.slice(i + q.length)]
}
function pick(a: (typeof APPS)[number]) {
  searchOpen.value = false
  open(a.key, a.title)
}
const today = '2026-11-25'
</script>

<template>
  <el-config-provider :locale="zhCn" :dialog="{ transition: dialogTransition }" :message="{ max: 3 }">
    <div class="r-app">
      <header class="r-head" :class="{ 'is-dim': navOpen }">
        <button type="button" class="r-logo" aria-label="全部应用" :aria-expanded="navOpen" @click="navOpen = !navOpen"><el-icon><Menu /></el-icon></button>
        <template v-if="active === 'home'">
          <button type="button" class="r-desk is-on"><i class="is-orange"><el-icon><HomeFilled /></el-icon></i>采购员工作台</button>
          <button type="button" class="r-desk"><i class="is-blue"><el-icon><HomeFilled /></el-icon></i>集团默认工作台</button>
          <span class="r-brand">ERP 管理平台</span>
        </template>
        <nav v-else class="r-crumbs" aria-label="面包屑">
          <a href="#home" @click.prevent="active = 'home'">首页<el-icon><ArrowDown /></el-icon></a>
          <template v-for="(c, i) in crumbs" :key="i"><i>/</i><span>{{ c }}</span></template>
        </nav>
        <span class="r-gap" />
        <div class="r-search">
          <span class="r-search-kind">应用<el-icon><ArrowDown /></el-icon></span>
          <el-icon><Search /></el-icon>
          <input v-model="keyword" aria-label="搜索应用" placeholder="请输入应用" @focus="searchOpen = true" @blur="searchOpen = false" @keydown.enter="hits[0] && pick(hits[0])" />
          <button v-if="keyword" type="button" class="r-search-x" aria-label="清空" @mousedown.prevent="keyword = ''"><el-icon><Close /></el-icon></button>
          <div v-if="searchOpen && keyword.trim()" class="r-search-pop">
            <div class="r-search-more">搜索“<b>{{ keyword.trim() }}</b>”相关的更多结果</div>
            <div class="r-search-group">应用({{ hits.length }})</div>
            <button v-for="a in hits" :key="a.path.join() + a.title" type="button" @mousedown.prevent="pick(a)">
              {{ parts(a.title)[0] }}<b>{{ parts(a.title)[1] }}</b>{{ parts(a.title)[2] }}
            </button>
            <p v-if="hits.length === 0">没有叫“{{ keyword.trim() }}”的应用</p>
          </div>
        </div>
        <button type="button" class="r-head-btn" aria-label="通知"><el-icon :size="18"><Bell /></el-icon></button>
        <span class="r-date"><el-icon :size="17"><Calendar /></el-icon>{{ today }}</span>
        <span class="r-avatar"><el-icon :size="18"><UserFilled /></el-icon></span>
      </header>

      <div class="r-strip" role="tablist">
        <div v-for="t in tabs" :key="t.key" class="r-tab" :class="{ 'is-on': t.key === active, 'is-home': t.key === 'home' }" role="tab" tabindex="0" :aria-selected="t.key === active" :data-tab="t.key" @click="active = t.key" @keydown.enter="active = t.key">
          <el-icon v-if="t.key === 'home'"><House /></el-icon>
          <span>{{ t.title }}</span>
          <button v-if="t.key !== 'home'" type="button" :aria-label="`关闭${t.title}`" @click.stop="close(t.key)"><el-icon><Close /></el-icon></button>
        </div>
        <i />
        <div class="r-strip-tools">
          <el-icon class="is-down"><DArrowRight /></el-icon><b /><el-icon><Top /></el-icon><el-icon><FullScreen /></el-icon>
        </div>
      </div>

      <main class="r-content">
        <div v-for="t in tabs" v-show="t.key === active" :key="t.key" class="r-pane"><component :is="components[t.key]" @open="open" /></div>
      </main>
      <AppNav v-model="navOpen" :current="current" @open="open" />
    </div>
  </el-config-provider>
</template>

<style>
.r-app { height: 100%; display: flex; flex-direction: column; }
.r-head { position: relative; flex: none; box-sizing: border-box; height: 40px; display: flex; align-items: center; padding-right: 28px; background: #FFFFFF; border-bottom: 1px solid #F1EFF4; }
.r-head.is-dim::after { content: ''; position: absolute; inset: 0 0 0 42px; background: rgba(0, 0, 0, 0.2); }
.r-gap { flex: 1; }
.r-logo { width: 42px; height: 39px; padding: 0; border: none; background: none; font-size: 21px; color: var(--r-primary); cursor: pointer; }
.r-logo .el-icon { vertical-align: middle; }
.r-desk { display: inline-flex; align-items: center; gap: 6px; height: 26px; margin-left: 12px; padding: 0 5px; border: none; border-radius: 3px; background: none; font-size: 12px; color: #35353B; cursor: pointer; }
.r-desk.is-on { background: #F0EEF2; }
.r-desk i { width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; color: #FFFFFF; font-size: 10px; }
.r-desk i.is-orange { background: #F3A04A; }
.r-desk i.is-blue { background: #4B8BF0; }
.r-brand { position: absolute; left: 50%; transform: translateX(-50%); font-size: 17px; font-weight: 700; color: var(--r-primary); letter-spacing: 1px; }
.r-crumbs { display: flex; align-items: center; margin-left: 16px; color: var(--r-text-3); }
.r-crumbs a { display: inline-flex; align-items: center; gap: 6px; color: var(--r-text-3); text-decoration: none; }
.r-crumbs a:hover { color: var(--r-primary); }
.r-crumbs a .el-icon { margin-right: 3px; font-size: 9px; color: #6F6E76; }
.r-crumbs a .el-icon svg { stroke: currentColor; stroke-width: 90px; }
.r-crumbs > i { margin: 0 9px; font-style: normal; color: #C7C5CC; }
.r-search { position: relative; box-sizing: border-box; width: 262px; height: 28px; display: flex; align-items: center; gap: 7px; padding: 0 12px; border: 1px solid #DBD9E0; border-radius: 14px; color: var(--r-text-4); }
.r-search:focus-within { border-color: var(--r-focus); }
.r-search-kind { display: inline-flex; align-items: center; gap: 5px; padding-right: 8px; border-right: 1px solid #E6E4EA; line-height: 16px; color: var(--r-text-2); white-space: nowrap; }
.r-search input { flex: 1; min-width: 0; border: none; outline: none; background: none; font: inherit; color: var(--r-text); }
.r-search input::placeholder { color: var(--r-placeholder); }
.r-search-x { width: 14px; height: 14px; padding: 0; border: none; border-radius: 50%; background: #A9AEBA; color: #FFFFFF; font-size: 9px; line-height: 14px; cursor: pointer; }
.r-search-pop { position: absolute; z-index: 30; top: 31px; left: 0; width: 262px; box-sizing: border-box; padding: 8px 0; background: #FFFFFF; box-shadow: var(--app-shadow-float); border-radius: 4px; color: var(--r-text); }
.r-search-pop b { font-weight: 400; color: var(--r-primary); }
.r-search-more { padding: 0 12px; line-height: 30px; border-bottom: 1px solid var(--r-row-line); }
.r-search-group { margin: 4px 8px; padding: 0 6px; line-height: 26px; background: #F4F3F7; font-weight: 700; }
.r-search-pop > button { display: block; width: 100%; padding: 0 12px; border: none; background: none; font-size: 12px; line-height: 30px; text-align: left; cursor: pointer; }
.r-search-pop > button:hover { background: #EEEDF1; }
.r-search-pop p { padding: 0 12px; line-height: 30px; color: var(--r-text-3); }
.r-head-btn { margin-left: 20px; padding: 0; border: none; background: none; color: #35353B; cursor: pointer; line-height: 1; }
.r-date { display: inline-flex; align-items: center; gap: 5px; margin: 0 16px 0 20px; color: #45454C; }
.r-avatar { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: #E7ECFA; color: #5E7BC4; }

.r-strip { flex: none; box-sizing: border-box; height: 28px; display: flex; background: var(--r-strip); border-bottom: 2px solid #DCDBE1; }
.r-strip > i { flex: 1; }
.r-tab { position: relative; box-sizing: border-box; width: 129px; height: 26px; display: flex; align-items: center; gap: 5px; padding: 0 9px 0 10px; font-size: 13px; color: var(--r-text-3); cursor: pointer; outline: none; }
.r-tab::before { content: ''; position: absolute; left: 0; top: 5px; height: 15px; width: 1px; background: #DDDBE2; }
.r-tab.is-home { width: 80px; padding-left: 20px; gap: 4px; }
.r-tab.is-home::before, .r-tab.is-on::before, .r-tab.is-on + .r-tab::before { display: none; }
.r-tab > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r-tab > button { padding: 0; border: none; background: none; color: #77767D; font-size: 12px; line-height: 1; cursor: pointer; }
.r-tab > button:hover { color: var(--r-primary); }
.r-tab:hover { color: #35353B; }
.r-tab.is-on { height: 28px; margin-bottom: -2px; padding-bottom: 2px; background: var(--r-tab-on); color: var(--r-primary); border-bottom: 2px solid #E6CBD3; }
.r-tab:focus-visible { outline: 1px solid var(--r-focus); outline-offset: -2px; }
.r-strip-tools { display: flex; align-items: center; gap: 18px; padding: 0 20px 0 14px; color: #77767D; font-size: 13px; box-shadow: -4px 0 6px -4px rgba(60, 60, 90, 0.35); }
.r-strip-tools b { width: 1px; height: 14px; background: #DDDBE2; }
.r-strip-tools .is-down { transform: rotate(90deg); }
.r-content { flex: 1; min-height: 0; }
.r-pane { height: 100%; }
</style>
