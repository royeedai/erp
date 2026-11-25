/// <reference types="vite/client" />
/// <reference types="msw/vite/client" />

interface ImportMetaEnv {
  /** '1' 时启用 MSW 模拟接口；正式构建不设 */
  readonly VITE_MOCK?: string
}
