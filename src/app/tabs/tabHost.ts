import {
  defineComponent,
  h,
  inject,
  onActivated,
  onBeforeUnmount,
  provide,
  ref,
  shallowReactive,
  type Component,
  type InjectionKey,
} from 'vue'
import { routeLocationKey, type RouteLocationNormalizedLoaded } from 'vue-router'
import { useTabsStore } from './tabs.store'

export interface TabContext {
  key: string
  setDirty(dirty: boolean): void
  setTitle(title: string): void
}

const tabContextKey: InjectionKey<TabContext> = Symbol('app-tab')

/** 页面里用它标记未保存、改页签标题 */
export function useTab(): TabContext {
  const ctx = inject(tabContextKey, null)
  if (!ctx) throw new Error('useTab() 只能在页签页面内使用')
  return ctx
}

export interface TabHost {
  component: Component
  syncRoute(route: RouteLocationNormalizedLoaded): void
}

/**
 * 给每个页签生成一个独立命名的外壳组件。
 *
 * KeepAlive 的 include 按“组件名”匹配，同一页面开两张单据时组件名相同，
 * 关掉一张会分不清该释放谁。外壳以页签键为组件名，include 就能精确到页签。
 *
 * 外壳还做两件事：
 * 1. 把 useRoute() 换成页签自己的路由。后台页签不会因为别的页签跳转而误触发监听。
 * 2. 记住页面滚动位置。KeepAlive 会把 DOM 移出文档，浏览器会把滚动条归零。
 */
export function createTabHost(key: string, inner: Component, initial: RouteLocationNormalizedLoaded): TabHost {
  const route = shallowReactive({ ...initial })

  const component = defineComponent({
    name: key,
    setup() {
      const tabs = useTabsStore()
      const el = ref<HTMLElement | null>(null)
      let top = 0
      let left = 0

      provide(routeLocationKey, route as RouteLocationNormalizedLoaded)
      provide(tabContextKey, {
        key,
        setDirty: (dirty) => tabs.setDirty(key, dirty),
        setTitle: (title) => tabs.setTitle(key, title),
      })

      onActivated(() => {
        if (el.value) {
          el.value.scrollTop = top
          el.value.scrollLeft = left
        }
      })
      onBeforeUnmount(() => {
        el.value = null
      })

      const onScroll = (e: Event) => {
        const target = e.target as HTMLElement
        if (target !== el.value) return
        top = target.scrollTop
        left = target.scrollLeft
      }

      return () => h('div', { ref: el, class: 'app-tab-page', onScrollPassive: onScroll }, [h(inner)])
    },
  })

  return {
    component,
    syncRoute: (next) => Object.assign(route, next),
  }
}
