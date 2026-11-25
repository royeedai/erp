// 参照原型（PROTOTYPE）：布局、尺寸、密度、配色按参照站截图量出来的值做，供定稿前看效果。
// 商标、图标、插画没有拿参照站的；数据全部虚构，只在内存里，刷新即复位。
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import { installVxe } from '@/shared/ui/vxe'
import '@/theme/motion.css'
import { installMotion } from '@/theme/motion'
import App from './App.vue'
import './theme.css'

installMotion()
const app = createApp(App)
app.use(ElementPlus, { locale: zhCn })
installVxe(app)
app.mount('#app')
