import { QueryClient } from '@tanstack/vue-query'
import { ApiError } from '@/api/http'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 只对“连不上”重试一次；业务错误、无权、超时都不重试
      retry: (count, error) => error instanceof ApiError && error.kind === 'network' && count < 1,
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
    // 写操作永不自动重发
    mutations: { retry: false },
  },
})
