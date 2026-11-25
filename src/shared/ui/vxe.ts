// 全工程唯一允许 import vxe-table 的位置是 src/shared/ui/。
import type { App } from 'vue'
import VxeTable, { VxeUI } from 'vxe-table'
import VxeUIPluginRenderElement from '@vxe-ui/plugin-render-element'
import 'vxe-table/es/style.css'

export function installVxe(app: App) {
  VxeUI.setConfig({
    table: {
      border: 'inner',
      stripe: false,
      showOverflow: 'title',
      showHeaderOverflow: 'title',
      rowConfig: { keyField: 'id', isHover: true },
      columnConfig: { resizable: true },
      virtualYConfig: { enabled: true, gt: 60 },
    },
  })
  // 让 el-select / el-date-picker 等浮层里的点击不会被 vxe 误判成“点到表格外”
  VxeUI.use(VxeUIPluginRenderElement)
  app.use(VxeTable)
}
