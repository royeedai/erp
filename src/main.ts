import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import { installVxe } from '@/shared/ui/vxe'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus, { locale: zhCn })
installVxe(app)
app.mount('#app')
