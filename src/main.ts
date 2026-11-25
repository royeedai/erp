import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import { installVxe } from '@/shared/ui/vxe'
import '@/theme/theme.css'
import '@/theme/tokens.css'
import '@/theme/motion.css'
import '@/theme/controls.css'
import { installMotion } from '@/theme/motion'
import { configureHttp } from '@/api/http'
import { queryClient } from '@/app/query'
import { router } from '@/app/router'
import { useSessionStore } from '@/app/session.store'
import { useTabsStore } from '@/app/tabs/tabs.store'
import App from './App.vue'

async function start() {
  // 模拟接口只在开发和 mock 构建里启用，正式构建会整段剔除
  if (import.meta.env.VITE_MOCK === '1') {
    const { startMock } = await import('@/mocks/start')
    await startMock()
  }

  installMotion()
  const app = createApp(App)
  app.use(createPinia())

  const session = useSessionStore()
  configureHttp({
    getToken: () => session.token,
    onUnauthorized: () => {
      session.clear()
      useTabsStore().reset()
      queryClient.clear()
      void router.replace({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    },
  })

  app.use(VueQueryPlugin, { queryClient })
  app.use(router)
  app.use(ElementPlus, { locale: zhCn })
  installVxe(app)
  app.mount('#app')
}

void start()
