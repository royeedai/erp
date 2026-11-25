import { test, type CDPSession, type Page } from '@playwright/test'
import { cdpOf, saveResult, stat, throttle } from './helpers'

interface TrialWindow {
  __trial: { lastPaint: { key: string; at: number } | null; lastPointer: number; router: { push(to: string): Promise<unknown> } }
}

async function metricsOf(client: CDPSession) {
  const { metrics } = await client.send('Performance.getMetrics')
  const get = (n: string) => (metrics.find((m) => m.name === n)?.value ?? 0) * 1000
  return { script: get('ScriptDuration'), layout: get('LayoutDuration'), style: get('RecalcStyleDuration'), task: get('TaskDuration') }
}

/** 点页签，返回“按下鼠标 → 目标页首次绘制完成” */
async function switchTo(page: Page, id: number): Promise<number> {
  await page.locator(`[data-tab="/bill/${id}"]`).click()
  return page.evaluate(
    (i) =>
      new Promise<number>((resolve, reject) => {
        const giveUp = performance.now() + 8000
        const tick = () => {
          const t = (window as unknown as TrialWindow).__trial
          if (t.lastPaint?.key === String(i) && t.lastPaint.at >= t.lastPointer) return resolve(t.lastPaint.at - t.lastPointer)
          if (performance.now() > giveUp) return reject(new Error('did not settle'))
          requestAnimationFrame(tick)
        }
        tick()
      }),
    id,
  )
}

test('切换耗时分解', async ({ page }) => {
  const client = await cdpOf(page)
  await page.goto('/trials.html#/bill/1')
  await page.locator('[data-bill="1"] .vxe-body--row').first().waitFor()
  for (let id = 2; id <= 8; id++) {
    await page.evaluate((i) => (window as unknown as TrialWindow).__trial.router.push(`/bill/${i}`), id)
    await page.locator(`[data-bill="${id}"] .vxe-body--row`).first().waitFor()
  }
  const out: Record<string, unknown> = {}
  for (const rate of [1, 4]) {
    await throttle(client, rate)
    const times: number[] = []
    const before = await metricsOf(client)
    let id = 1
    for (let i = 0; i < 100; i++) {
      id = (id % 8) + 1
      times.push(await switchTo(page, id))
    }
    const after = await metricsOf(client)
    out[`cpu${rate}x`] = {
      paint: stat(times),
      perSwitchMs: Object.fromEntries(
        (['script', 'layout', 'style', 'task'] as const).map((k) => [k, Math.round(((after[k] - before[k]) / 100) * 10) / 10]),
      ),
    }
    console.log(rate, JSON.stringify(out[`cpu${rate}x`]))
  }
  await throttle(client, 1)

  await client.send('Profiler.enable')
  await client.send('Profiler.setSamplingInterval', { interval: 200 })
  await client.send('Profiler.start')
  for (const id of [2, 3, 4, 5, 6, 7, 8, 1]) await switchTo(page, id)
  const { profile } = await client.send('Profiler.stop')
  const self = new Map<number, number>()
  profile.samples!.forEach((nodeId, i) => self.set(nodeId, (self.get(nodeId) ?? 0) + (profile.timeDeltas![i] ?? 0)))
  const rows = new Map<string, number>()
  for (const n of profile.nodes) {
    const f = n.callFrame
    const key = `${f.functionName || '(anonymous)'} ${f.url.split('/').at(-1)}:${f.lineNumber + 1}`
    rows.set(key, (rows.get(key) ?? 0) + (self.get(n.id) ?? 0))
  }
  out.topSelfMsPerSwitch = [...rows]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([k, v]) => `${(v / 1000 / 8).toFixed(1)}ms ${k}`)
  saveResult('trial1-diagnose', out)
  console.log(JSON.stringify(out.topSelfMsPerSwitch, null, 1))
})
