<script setup lang="ts">
// 首页：待办计数、常用应用和最近访问、本角色的任务。任务卡片由接口按角色给，这里只管三种样子；没有接口的图表、日历先不放。
import { computed, onActivated, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, Briefcase, Document, MessageBox, Plus, RefreshRight, Right, Stamp, UserFilled } from '@element-plus/icons-vue'
import { ApiError } from '@/api/http'
import { useGetHomeSummary } from '@/api/generated/home/home'
import type { HomeItem } from '@/api/generated/model'
import { formatAmount } from '@/shared/money/amount'
import AppIcon from '@/shared/ui/AppIcon.vue'
import EmptyHint from '@/shared/ui/EmptyHint.vue'
import { useApps } from '../apps'
import { usePreferencesStore } from '../preferences.store'
import { useSessionStore } from '../session.store'

const session = useSessionStore()
const preferences = usePreferencesStore()
const router = useRouter()
const apps = useApps()

const summary = useGetHomeSummary()
const error = computed(() => (summary.error.value instanceof ApiError ? summary.error.value : null))
// 切回首页时刷新计数
let first = true
onActivated(() => {
  if (first) first = false
  else void summary.refetch()
})

/* ---------- 待办计数 ---------- */

const centers = computed(() => {
  const todos = summary.data.value?.todos
  return [
    { key: 'approval', label: '审批中心', count: todos?.approval, icon: Stamp, tone: 'blue' },
    { key: 'business', label: '业务中心', count: todos?.business, icon: Briefcase, tone: 'teal' },
    { key: 'warning', label: '预警中心', count: todos?.warning, icon: Bell, tone: 'orange' },
    { key: 'notice', label: '通知中心', count: todos?.notice, icon: MessageBox, tone: 'violet' },
  ]
})
const greeting = computed(() => {
  const todos = summary.data.value?.todos
  if (!todos) return ''
  return todos.approval > 0 ? `有 ${todos.approval} 条审批等你处理` : '没有等你处理的审批'
})

/* ---------- 本角色的任务 ---------- */

const cards = computed(() => summary.data.value?.cards ?? [])
/** 没权限的应用不能点过去 */
const canOpen = (t: HomeItem) => !!t.path && apps.value.some((a) => a.path === t.path)
function openTask(t: HomeItem) {
  if (t.path && canOpen(t)) void router.push(t.path)
}
const tones = ['teal', 'blue', 'orange', 'red', 'violet'] as const
/** 待提交单据默认看第一种有单据的 */
const draftKey = ref('')
function currentDraft(items: HomeItem[]): HomeItem | undefined {
  return items.find((i) => i.key === draftKey.value) ?? items.find((i) => (i.drafts ?? []).length > 0) ?? items[0]
}

/* ---------- 常用应用、最近访问 ---------- */

const appTab = ref<'favorites' | 'recent'>('favorites')
const pick = (paths: string[]) => paths.flatMap((p) => apps.value.find((a) => a.path === p) ?? [])
const favorites = computed(() => pick(preferences.apps.favorites ?? apps.value.slice(0, 8).map((a) => a.path)))
const recent = computed(() => pick(preferences.apps.recent ?? []))
const shown = computed(() => (appTab.value === 'favorites' ? favorites.value : recent.value))

const picking = ref(false)
const picked = ref<string[]>([])
function startPick() {
  picked.value = favorites.value.map((a) => a.path)
  picking.value = true
}
function savePick() {
  preferences.setFavorites(picked.value)
  picking.value = false
}
</script>

<template>
  <div class="home">
    <section class="home-card is-todo">
      <h2>消息处理中心</h2>
      <div class="home-todo">
        <span class="home-face"><el-icon :size="30"><UserFilled /></el-icon></span>
        <div class="home-hello">
          <b>{{ session.me?.name }}，你好</b>
          <p>{{ greeting }}</p>
        </div>
        <div class="home-centers">
          <div v-for="c in centers" :key="c.key" class="home-center" :class="`is-${c.tone}`" :data-center="c.key">
            <i><el-icon :size="18"><component :is="c.icon" /></el-icon></i>
            <span><b>{{ c.count ?? '—' }}</b>{{ c.label }}</span>
          </div>
        </div>
      </div>
      <el-button class="home-refresh" link :icon="RefreshRight" aria-label="刷新待办" title="刷新" @click="summary.refetch()" />
    </section>

    <section class="home-card is-apps">
      <header>
        <button type="button" :class="{ 'is-on': appTab === 'favorites' }" @click="appTab = 'favorites'">常用应用</button>
        <button type="button" :class="{ 'is-on': appTab === 'recent' }" @click="appTab = 'recent'">最近访问</button>
        <span class="home-gap" />
        <el-button v-if="appTab === 'favorites' && apps.length > 0" link :icon="Plus" aria-label="挑选常用应用" title="挑选常用应用" @click="startPick" />
      </header>
      <div v-if="shown.length > 0" class="home-apps">
        <RouterLink v-for="a in shown" :key="a.path" :to="a.path"><AppIcon :icon="a.icon" :tone="a.tone" :size="34" /><span>{{ a.title }}</span></RouterLink>
      </div>
      <EmptyHint v-else-if="apps.length === 0" title="没有可用的应用" note="请联系管理员开通" />
      <EmptyHint v-else-if="appTab === 'recent'" title="还没有访问记录" />
      <EmptyHint v-else title="还没有常用应用"><el-button @click="startPick">挑选</el-button></EmptyHint>
    </section>

    <section v-if="error || (!summary.isLoading.value && cards.length === 0)" class="home-card is-tasks">
      <h2>我的任务</h2>
      <EmptyHint v-if="error" title="没有取到任务" :note="error.message"><el-button @click="summary.refetch()">重新查询</el-button></EmptyHint>
      <EmptyHint v-else title="没有要办的任务" />
    </section>
    <template v-else>
      <section v-for="c in cards" :key="c.key" class="home-card" :class="`is-${c.type}`" :style="{ gridColumn: `span ${c.span}` }">
        <h2>{{ c.title }}</h2>
        <div v-if="c.type === 'metrics'" class="home-metrics">
          <div v-for="m in c.items" :key="m.key">
            <span>{{ m.label }}</span>
            <el-icon><Right /></el-icon>
            <b class="app-num">{{ formatAmount(m.value, 2) }}</b>
          </div>
        </div>
        <div v-else-if="c.type === 'counts'" class="home-tasks">
          <component :is="canOpen(t) ? 'button' : 'div'" v-for="t in c.items" :key="t.key" :type="canOpen(t) ? 'button' : undefined" @click="openTask(t)">
            <span>{{ t.label }}</span>
            <p><b>{{ t.value }}</b>{{ t.unit }}</p>
          </component>
        </div>
        <template v-else>
          <div class="home-drafts">
            <button
              v-for="(d, i) in c.items"
              :key="d.key"
              type="button"
              :class="[`is-${tones[i % tones.length]}`, { 'is-on': currentDraft(c.items)?.key === d.key }]"
              :aria-pressed="currentDraft(c.items)?.key === d.key"
              @click="draftKey = d.key"
            >
              <i><el-icon :size="17"><Document /></el-icon></i>
              <span>{{ d.label }}<em><b>{{ d.value }}</b>{{ d.unit }}</em></span>
            </button>
          </div>
          <div v-if="currentDraft(c.items)?.drafts?.length" class="home-draft-rows">
            <div v-for="r in currentDraft(c.items)?.drafts" :key="r.id">
              <span>{{ r.no }}</span><span>{{ r.party }}</span><span class="app-num">{{ formatAmount(r.amount, 2) }}</span><span>{{ r.date }}</span>
            </div>
          </div>
          <EmptyHint v-else :title="`没有待提交的${currentDraft(c.items)?.label ?? '单据'}`" />
        </template>
      </section>
    </template>

    <el-dialog v-model="picking" title="常用应用" width="640px" align-center append-to-body :close-on-click-modal="false">
      <el-checkbox-group v-model="picked" class="home-pick">
        <el-checkbox v-for="a in apps" :key="a.path" :value="a.path" :label="a.title" />
      </el-checkbox-group>
      <template #footer>
        <el-button type="primary" @click="savePick">保存</el-button>
        <el-button @click="picking = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style>
.home {
  box-sizing: border-box;
  min-height: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: max-content;
  gap: 8px;
  padding: 14px 40px 20px 32px;
  background: var(--app-home-bg);
}
.home-card {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  padding: 12px 14px;
  border-radius: var(--app-radius-card);
  background: var(--app-bg-container);
}
.home-card h2 {
  margin: 0;
  font-size: var(--app-font-section);
  line-height: 20px;
}
.home-card > .app-empty {
  margin-top: 44px;
}
.home-gap {
  flex: 1;
}
.home-todo {
  display: flex;
  align-items: center;
  margin-top: 22px;
}
.home-face {
  flex: none;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--app-avatar-bg);
  color: var(--app-avatar-fg);
}
.home-hello {
  flex: none;
  width: 160px;
  margin-left: 12px;
}
.home-hello b {
  font-size: var(--app-font-nav);
  font-weight: 400;
}
.home-hello p {
  min-height: 18px;
  margin: 2px 0 0;
  color: var(--el-text-color-secondary);
}
.home-centers {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: 0 4% 0 26px;
}
.home-center {
  height: 84px;
  display: flex;
  align-items: center;
  gap: 15px;
  padding-left: 14%;
  border-radius: var(--app-radius-card);
  white-space: nowrap;
}
.home-center i {
  flex: none;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--app-bg-container);
}
.home-center b {
  display: block;
  font-size: 20px;
  line-height: 24px;
  font-weight: 400;
}
.home-center.is-blue {
  background: var(--app-tone-blue-bg);
}
.home-center.is-blue i {
  background: var(--app-tone-blue);
}
.home-center.is-teal {
  background: var(--app-tone-teal-bg);
}
.home-center.is-teal i {
  background: var(--app-tone-teal);
}
.home-center.is-orange {
  background: var(--app-tone-orange-bg);
}
.home-center.is-orange i {
  background: var(--app-tone-orange);
}
.home-center.is-violet {
  background: var(--app-tone-violet-bg);
}
.home-center.is-violet i {
  background: var(--app-tone-violet);
}
.home-refresh.el-button {
  position: absolute;
  left: 12px;
  bottom: 8px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
.home-card.is-apps header {
  display: flex;
  align-items: center;
  gap: 24px;
}
.home-card.is-apps header > button:not(.el-button) {
  position: relative;
  padding: 0 0 4px;
  border: none;
  background: none;
  font-size: var(--app-font-section);
  font-weight: var(--app-font-bold);
  color: var(--el-text-color-secondary);
  cursor: pointer;
}
.home-card.is-apps header > button.is-on {
  color: var(--el-text-color-primary);
}
.home-card.is-apps header > button.is-on::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 24px;
  height: 2px;
  margin-left: -12px;
  background: var(--el-color-primary);
}
.home-apps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 4px;
  margin-top: 12px;
}
@media (min-width: 1900px) {
  .home-apps {
    grid-template-columns: repeat(8, 1fr);
  }
}
.home-apps a {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  line-height: 16px;
  text-align: center;
  text-decoration: none;
  color: var(--el-text-color-regular);
}
.home-apps a:hover {
  color: var(--app-accent);
}
.home-card.is-todo {
  grid-column: span 2;
  height: 184px;
}
.home-card.is-apps {
  min-height: 184px;
}
.home-card.is-tasks {
  grid-column: span 3;
  min-height: 184px;
}
.home-card.is-counts {
  min-height: 232px;
}
.home-card.is-drafts {
  min-height: 300px;
}
.home-metrics {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-top: 12px;
}
.home-metrics > div {
  position: relative;
  box-sizing: border-box;
  height: 104px;
  padding: 18px 14px;
  border-right: 3px solid var(--app-tone-blue);
  border-radius: 6px;
  background: var(--app-bg-query);
}
.home-metrics > div:nth-child(even) {
  border-right-color: var(--app-tone-green);
}
.home-metrics .el-icon {
  position: absolute;
  top: 18px;
  right: 14px;
  font-size: 18px;
  color: var(--app-tone-blue);
}
.home-metrics > div:nth-child(even) .el-icon {
  color: var(--app-tone-green);
}
.home-metrics b {
  display: block;
  margin-top: 26px;
  font-size: 20px;
  line-height: 26px;
  font-weight: 400;
}
.home-drafts {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin: 16px 16px 0;
}
.home-drafts button {
  height: 76px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 0 0 15px;
  border: none;
  border-radius: 6px;
  background: none;
  font-size: var(--app-font-section);
  text-align: left;
  color: var(--el-text-color-secondary);
  cursor: pointer;
}
.home-drafts button.is-on {
  background: var(--app-tone-blue-bg);
}
.home-drafts button.is-on b {
  color: var(--app-accent);
}
.home-drafts i {
  flex: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.home-drafts em {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  font-style: normal;
}
.home-drafts em b {
  margin-right: 3px;
  font-size: var(--app-font-figure);
  line-height: 30px;
  font-weight: 400;
  color: var(--el-text-color-primary);
}
.home-drafts .is-teal i {
  background: var(--app-tone-teal-bg);
  color: var(--app-tone-teal);
}
.home-drafts .is-blue i {
  background: var(--app-avatar-bg);
  color: var(--app-tone-blue);
}
.home-drafts .is-orange i {
  background: var(--app-tone-orange-bg);
  color: var(--app-tone-orange);
}
.home-drafts .is-red i {
  background: var(--app-tone-red-bg);
  color: var(--app-tone-red);
}
.home-drafts .is-violet i {
  background: var(--app-tone-violet-bg);
  color: var(--app-tone-violet);
}
.home-draft-rows {
  margin: 24px 16px 0;
}
.home-draft-rows > div {
  display: grid;
  grid-template-columns: 1.4fr 2fr 1fr 1fr;
  line-height: 32px;
  border-bottom: 1px solid var(--app-row-line);
}
.home-draft-rows .app-num {
  padding-right: 60px;
  text-align: right;
}
.home-tasks {
  display: flex;
  margin-top: 60px;
  padding-left: 32px;
}
.home-tasks > * {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
}
.home-tasks > button {
  cursor: pointer;
}
.home-tasks > button:hover span {
  color: var(--app-accent);
}
.home-tasks > * + * {
  padding-left: 22px;
  border-left: 1px solid var(--app-divider);
}
.home-tasks span {
  font-size: var(--app-font-section);
  color: var(--el-text-color-secondary);
}
.home-tasks p {
  margin: 10px 0 0;
  color: var(--el-text-color-secondary);
}
.home-tasks b {
  margin-right: 4px;
  font-size: var(--app-font-figure);
  line-height: 30px;
  font-weight: 400;
  color: var(--el-text-color-primary);
}
.home-pick {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 0;
  padding: 8px 4px;
}
</style>
