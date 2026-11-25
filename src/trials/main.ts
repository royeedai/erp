import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory, RouterView } from 'vue-router'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import { installVxe } from '@/shared/ui/vxe'
import { tabKeyOf, useTabsStore } from '@/app/tabs/tabs.store'
import { installProbe, probe } from './probe'

installProbe()

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/edit', component: () => import('./TrialEdit.vue') },
    { path: '/amount', component: () => import('./TrialAmount.vue') },
    {
      path: '/',
      component: () => import('./TrialShell.vue'),
      children: [
        { path: 'bill/:id', component: () => import('./TrialBill.vue'), meta: { tab: true } },
        { path: 'blank', component: { template: '', render: () => null }, meta: { tab: true, title: '空白' } },
      ],
    },
  ],
})

const pinia = createPinia()
const app = createApp(RouterView)
app.use(pinia)
const tabs = useTabsStore(pinia)

router.beforeEach((to) => {
  if (to.meta.tab && !tabs.canOpen(tabKeyOf(to))) return false
})
router.afterEach((to, _from, failure) => {
  if (!failure && to.meta.tab) tabs.open(to)
})

app.use(router)
app.use(ElementPlus, { locale: zhCn })
installVxe(app)
probe.router = router
app.mount('#app')
