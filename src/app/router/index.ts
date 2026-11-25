import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { toast } from '@/shared/ui/feedback'
import { PERM, type PermissionCode } from '../permissions'
import { useSessionStore } from '../session.store'
import { MAX_TABS, tabKeyOf, useTabsStore } from '../tabs/tabs.store'

declare module 'vue-router' {
  interface RouteMeta {
    /** 页签与菜单标题 */
    title?: string
    /** 进入所需权限码 */
    permission?: PermissionCode
    /** 在页签里打开 */
    tab?: boolean
    /** 固定页签，不能关闭 */
    affix?: boolean
    /** 菜单分组；没有则不进菜单 */
    menuGroup?: string
    /** 登录前可访问 */
    public?: boolean
  }
}

export const tabRoutes: RouteRecordRaw[] = [
  {
    path: '/home',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
    meta: { title: '工作台', tab: true, affix: true, menuGroup: '' },
  },
  {
    path: '/project/roles',
    name: 'project-roles',
    component: () => import('@/features/project/role/ProjectRolePage.vue'),
    meta: { title: '项目岗位', tab: true, permission: PERM.projectRoleView, menuGroup: '项目管理' },
  },
]

export const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../layout/AppShell.vue'),
    redirect: '/home',
    children: [
      ...tabRoutes,
      { path: '/forbidden', name: 'forbidden', component: () => import('../pages/ForbiddenPage.vue') },
      { path: '/:rest(.*)*', name: 'not-found', component: () => import('../pages/NotFoundPage.vue') },
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
  document.title = to.meta.title ? `${to.meta.title} - ERP` : 'ERP'
})
