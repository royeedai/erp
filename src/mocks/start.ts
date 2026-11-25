import { network } from 'virtual:msw'
import { handlers } from './handlers'

export async function startMock() {
  network.configure({
    handlers,
    // 只盯 /api：漏写处理器要报出来；开发时的模块、样式请求放行
    onUnhandledFrame({ frame, defaults }) {
      if (frame.protocol !== 'http') return
      const { request } = frame.data as { request: Request }
      if (new URL(request.url).pathname.startsWith('/api/')) defaults.error()
    },
  })
  await network.enable()
}
