import { defineConfig } from 'orval'

// 正式 OpenAPI 到位后只改 input；产物 src/api/generated 禁止手改。
// 不要在 override.query 里写 useQuery: true：那会把 POST/PUT/DELETE 也生成成查询，挂载即自动执行、失败自动重试。
export default defineConfig({
  erp: {
    input: './openapi/mock-contract.yaml',
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/api/generated/model',
      client: 'vue-query',
      httpClient: 'fetch',
      clean: true,
      indexFiles: true,
      // 把契约里的请求头（幂等标识）放进函数签名，漏传编译不过
      headers: true,
      override: {
        fetch: { includeHttpResponseReturnType: false },
        mutator: { path: './src/api/http.ts', name: 'request' },
      },
    },
  },
})
