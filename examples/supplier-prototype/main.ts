// 样页（PROTOTYPE，用完即弃）：把微盟走查里采纳的规则放进一张增删改查页，供定稿前看效果。
// 数据全部虚构，只在内存里，刷新即复位。
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import { installVxe } from '@/shared/ui/vxe'
import '@/theme/theme.css'
import '@/theme/tokens.css'
import '@/theme/motion.css'
import { installMotion } from '@/theme/motion'
import App from './App.vue'
import './page.css'

installMotion()
const app = createApp(App)
app.use(ElementPlus, { locale: zhCn })
installVxe(app)
app.mount('#app')
