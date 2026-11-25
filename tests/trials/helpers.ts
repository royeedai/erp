import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { CDPSession, Page } from '@playwright/test'

export async function cdpOf(page: Page): Promise<CDPSession> {
  const client = await page.context().newCDPSession(page)
  await client.send('Performance.enable')
  await client.send('HeapProfiler.enable')
  return client
}

export async function throttle(client: CDPSession, rate: number) {
  await client.send('Emulation.setCPUThrottlingRate', { rate })
}

export interface MemorySample {
  heapMB: number
  nodes: number
  listeners: number
}

/** 连续强制回收后取数，避免把“还没回收”算成泄漏 */
export async function memory(page: Page, client: CDPSession): Promise<MemorySample> {
  for (let i = 0; i < 4; i++) {
    await client.send('HeapProfiler.collectGarbage')
    await page.waitForTimeout(150)
  }
  const { metrics } = await client.send('Performance.getMetrics')
  const get = (name: string) => metrics.find((m) => m.name === name)?.value ?? 0
  return {
    heapMB: Math.round((get('JSHeapUsedSize') / 1024 / 1024) * 100) / 100,
    nodes: get('Nodes'),
    listeners: get('JSEventListeners'),
  }
}

export interface Stat {
  n: number
  p50: number
  p95: number
  max: number
}

export function stat(values: number[]): Stat {
  const sorted = [...values].sort((a, b) => a - b)
  // 取最近秩法：P95 是第 ceil(0.95n) 个
  const at = (q: number) => sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)] ?? Number.NaN
  const round = (v: number) => Math.round(v * 10) / 10
  return { n: sorted.length, p50: round(at(0.5)), p95: round(at(0.95)), max: round(sorted.at(-1) ?? Number.NaN) }
}

const outDir = fileURLToPath(new URL('./results', import.meta.url))

export function saveResult(name: string, data: unknown) {
  mkdirSync(outDir, { recursive: true })
  writeFileSync(`${outDir}/${name}.json`, `${JSON.stringify(data, null, 2)}\n`)
}
