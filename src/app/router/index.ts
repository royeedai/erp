import type { Component } from 'vue'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { Goods, UserFilled } from '@element-plus/icons-vue'
import type { AppTone } from '@/shared/ui/AppIcon.vue'
import { toast } from '@/shared/ui/feedback'
import { PERM, type PermissionCode } from '../permissions'
import { usePreferencesStore } from '../preferences.store'
import { useSessionStore } from '../session.store'
import { MAX_TABS, tabKeyOf, useTabsStore } from '../tabs/tabs.store'

declare module 'vue-router' {
  interface RouteMeta {
    /** 页签、面包屑和应用的名称 */
    title?: string
    /** 进入所需权限码 */
    permission?: PermissionCode
    /** 在页签里打开 */
    tab?: boolean
    /** 固定页签，不能关闭 */
    affix?: boolean
    /** 在全部应用里的位置：业务域、模块、分组；没有则不进应用目录 */
    nav?: [domain: string, module: string, group: string]
    /** 应用图标，标题行、首页常用应用用同一个 */
    icon?: Component
    tone?: AppTone
    /** 登录前可访问 */
    public?: boolean
  }
}

export const tabRoutes: RouteRecordRaw[] = [
  {
    path: '/home',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
    meta: { title: '首页', tab: true, affix: true },
  },
  {
    path: '/project/roles',
    name: 'project-roles',
    component: () => import('@/features/project/role/ProjectRolePage.vue'),
    meta: {
      title: '项目岗位',
      tab: true,
      permission: PERM.projectRoleView,
      nav: ['项目管理', '基础设置', '项目人员'],
      icon: UserFilled,
      tone: 'blue',
    },
  },
]

// 样例页：列表封装的全套样子，只在模拟模式下有，正式构建会整段剔除
if (import.meta.env.VITE_MOCK === '1') {
  tabRoutes.push({
    path: '/samples/list',
    name: 'sample-list',
    component: () => import('@/samples/ListSample.vue'),
    meta: { title: '列表样例', tab: true, nav: ['样例', '封装', '列表'], icon: Goods, tone: 'violet' },
  })
}

export const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../layout/AppShell.vue'),
    redirect: '/home',
    children: [
      ...tabRoutes,
      {
        path: '/forbidden',
        name: 'forbidden',
        component: () => import('../pages/ForbiddenPage.vue'),
        meta: { title: '没有权限' },
      },
      {
        path: '/:rest(.*)*',
        name: 'not-found',
        component: () => import('../pages/NotFoundPage.vue'),
        meta: { title: '页面不存在' },
      },
    ],
  },
]

export const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to) => {
  const session = useSessionStore()
  if (to.meta.public) return session.isLoggedIn && to.name === 'login' ? { name: 'home' } : true
  if (!session.isLoggedIn) return { name: 'login', query: { redirect: to.fullPath } }

  try {
    await session.restore()
  } catch {
    session.clear()
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.permission && !session.has(to.meta.permission)) {
    return { name: 'forbidden', query: { permission: to.meta.permission } }
  }

  const tabs = useTabsStore()
  for (const r of tabRoutes) if (r.meta?.affix) tabs.pin(r.path, r.meta.title ?? r.path)
  if (to.meta.tab && !tabs.canOpen(tabKeyOf(to))) {
    toast.warning(`最多打开 ${MAX_TABS} 个页签，请先关闭一个`)
    return false
  }
  return true
})

router.afterEach((to, _from, failure) => {
  if (failure) return
  if (to.meta.tab) useTabsStore().open(to)
  if (to.meta.nav) usePreferencesStore().visit(to.path)
  document.title = to.meta.title ? `${to.meta.title} - ERP` : 'ERP'
})
