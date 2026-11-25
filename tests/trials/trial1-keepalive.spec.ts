import { expect, test, type Page } from '@playwright/test'
import { cdpOf, memory, saveResult, stat, throttle } from './helpers'

interface PageLog {
  mounted: number
  unmounted: number
  activated: number
  deactivated: number
  routeChanges: number
}
interface TrialWindow {
  __trial: {
    pages: Record<string, PageLog>
    lastPaint: { key: string; at: number } | null
    lastPointer: number
    alive(): number
    router: { push(to: string): Promise<unknown> }
  }
  __switch: Promise<{ paint: number; stable: number }>
}

async function push(page: Page, path: string) {
  await page.evaluate((p) => (window as unknown as TrialWindow).__trial.router.push(p), path)
}

async function open(page: Page, id: number) {
  await push(page, `/bill/${id}`)
  await page.locator(`[data-bill="${id}"] .vxe-body--row`).first().waitFor()
}

const body = (id: number) => `[data-bill="${id}"] .vxe-table--body-inner-wrapper`

async function clickTab(page: Page, id: number) {
  await page.locator(`[data-tab="/bill/${id}"]`).click()
}

async function closeTab(page: Page, path: string) {
  // 非当前页签的关闭图标悬停才出现
  const item = page.locator('.el-tabs__item').filter({ has: page.locator(`[data-tab="${path}"]`) })
  await item.hover()
  await item.locator('.is-icon-close').click()
}

/** 页面内计时：从按下鼠标到“目标页签已绘制、表格滚动位置已恢复、对应行可见” */
async function armSwitch(page: Page, id: number, top: number) {
  await page.evaluate(
    ({ id, top }) => {
      const w = window as unknown as TrialWindow
      const startedPointer = w.__trial.lastPointer
      w.__switch = new Promise((resolve, reject) => {
        const giveUp = performance.now() + 8000
        const tick = () => {
          if (performance.now() > giveUp) return reject(new Error('switch did not settle'))
          const t = w.__trial
          const scroller = document.querySelector(`[data-bill="${id}"] .vxe-table--body-inner-wrapper`)
          const row = document.querySelector(`[data-bill="${id}"] tr[rowid="r${Math.floor(top / 36) + 3}"]`)
          const ready =
            t.lastPointer !== startedPointer &&
            t.lastPaint?.key === String(id) &&
            t.lastPaint.at >= t.lastPointer &&
            scroller !== null &&
            Math.abs(scroller.scrollTop - top) <= 1 &&
            row !== null
          if (!ready) {
            requestAnimationFrame(tick)
            return
          }
          const paint = t.lastPaint!.at - t.lastPointer
          resolve({ paint, stable: Math.max(paint, performance.now() - t.lastPointer) })
        }
        requestAnimationFrame(tick)
      })
    },
    { id, top },
  )
}

test('A 切换：状态与耗时', async ({ page }) => {
  const client = await cdpOf(page)
  await page.goto('/trials.html#/blank')
  // 空白页签也占一个，先关掉它，让 8 个页签全是单据
  for (let id = 1; id <= 7; id++) await open(page, id)
  await closeTab(page, '/blank')
  await open(page, 8)
  await expect(page.locator('.el-tabs__item')).toHaveCount(8)

  const expected: Record<number, { vendor: string; amount: string; pageTop: number; tableTop: number }> = {}
  for (let id = 1; id <= 8; id++) {
    await clickTab(page, id)
    const bill = page.locator(`[data-bill="${id}"]`)
    await bill.locator('input[data-field="vendor"]').fill(`供应商-${id}`)
    await bill.locator('input[data-field="amount"]').fill(`${id}234567.8`)
    await bill.locator('input[data-field="vendor"]').click()
    // 先在明细里改一格并确认
    await bill.locator('.vxe-body--row').first().locator('td').nth(2).click()
    await page.waitForTimeout(150)
    await page.keyboard.type(`改名-${id}`)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(150)
    await page.keyboard.press('Escape')
    const box = (await page.locator(body(id)).first().boundingBox())!
    await page.mouse.move(box.x + 300, box.y + 60)
    await page.mouse.wheel(0, 360 + id * 180)
    await page.waitForTimeout(300)
    await page.evaluate((i) => (document.querySelector(`[data-bill="${i}"]`)!.parentElement!.scrollTop = 40 + i * 10), id)
    await page.waitForTimeout(150)
    expected[id] = {
      vendor: `供应商-${id}`,
      amount: `${id},234,567.80`,
      pageTop: await page.evaluate((i) => document.querySelector(`[data-bill="${i}"]`)!.parentElement!.scrollTop, id),
      tableTop: await page.evaluate((s) => document.querySelector(s)!.scrollTop, body(id)),
    }
  }

  await throttle(client, 4)
  const paints: number[] = []
  const stables: number[] = []
  const losses: string[] = []
  let current = 8
  let seed = 7
  for (let i = 0; i < 160; i++) {
    seed = (seed * 48271) % 2147483647
    let next = (seed % 8) + 1
    if (next === current) next = (next % 8) + 1
    current = next
    const want = expected[next]!
    await armSwitch(page, next, want.tableTop)
    await clickTab(page, next)
    const timing = await page
      .evaluate(() => (window as unknown as TrialWindow).__switch)
      .catch((e: Error) => {
        losses.push(`#${i} 页签 ${next}：${e.message.slice(0, 80)}`)
        return null
      })
    if (timing) {
      paints.push(timing.paint)
      stables.push(timing.stable)
    }
    const got = await page.evaluate(
      ({ i, s }) => {
        const bill = document.querySelector(`[data-bill="${i}"]`)!
        return {
          vendor: bill.querySelector<HTMLInputElement>('input[data-field="vendor"]')!.value,
          amount: bill.querySelector<HTMLInputElement>('input[data-field="amount"]')!.value,
          pageTop: bill.parentElement!.scrollTop,
          tableTop: document.querySelector(s)!.scrollTop,
        }
      },
      { i: next, s: body(next) },
    )
    for (const k of ['vendor', 'amount'] as const) {
      if (got[k] !== want[k]) losses.push(`#${i} 页签 ${next} ${k}: ${got[k]} 应为 ${want[k]}`)
    }
    for (const k of ['pageTop', 'tableTop'] as const) {
      if (Math.abs(got[k] - want[k]) > 1) losses.push(`#${i} 页签 ${next} ${k}: ${got[k]} 应为 ${want[k]}`)
    }
  }
  await throttle(client, 1)

  // 明细里改过的值
  const renamed: string[] = []
  for (let id = 1; id <= 8; id++) {
    await clickTab(page, id)
    await page.evaluate((s) => document.querySelector(s)!.scrollTo({ top: 0 }), body(id))
    await page.waitForTimeout(250)
    renamed.push((await page.locator(`[data-bill="${id}"] .vxe-body--row`).first().locator('td').nth(2).innerText()).trim())
  }
  const result = { expected, paint: stat(paints), stable: stat(stables), lossCount: losses.length, losses: losses.slice(0, 20), renamed }
  saveResult('trial1-switch', result)
  console.log(JSON.stringify(result, null, 1))
})

test('B 关闭、误伤、上限、路由隔离、编辑态', async ({ page }) => {
  await page.goto('/trials.html#/bill/1')
  await page.locator('[data-bill="1"] .vxe-body--row').first().waitFor()
  for (let id = 2; id <= 8; id++) await open(page, id)
  const pages = () => page.evaluate(() => (window as unknown as TrialWindow).__trial.pages)
  const out: Record<string, unknown> = {}

  // 第 9 个应被拦下
  await push(page, '/bill/9')
  await page.waitForTimeout(300)
  out.ninthBlocked =
    (await page.locator('.el-tabs__item').count()) === 8 && (await page.locator('[data-bill="9"]').count()) === 0

  // 给 2、4 填值，关掉后台的 3，再关掉当前的 8
  for (const id of [2, 4]) {
    await clickTab(page, id)
    await page.locator(`[data-bill="${id}"] input[data-field="vendor"]`).fill(`保留-${id}`)
  }
  await closeTab(page, '/bill/3')
  await page.waitForTimeout(300)
  const afterClose3 = await pages()
  out.closedBackgroundUnmounted = afterClose3['3']!.unmounted === 1
  out.othersUntouched = Object.entries(afterClose3)
    .filter(([k]) => k !== '3')
    .every(([, v]) => v.unmounted === 0 && v.mounted === 1)
  await clickTab(page, 8)
  await closeTab(page, '/bill/8')
  await page.waitForTimeout(400)
  out.closedActiveUnmounted = (await pages())['8']!.unmounted === 1
  out.activeAfterClosing8 = await page.locator('[data-bill]').getAttribute('data-bill')
  for (const id of [2, 4]) {
    await clickTab(page, id)
    out[`value${id}Kept`] =
      (await page.locator(`[data-bill="${id}"] input[data-field="vendor"]`).inputValue()) === `保留-${id}`
  }
  // 重新打开 3 应是全新页面
  await open(page, 3)
  out.reopenedFresh =
    (await page.locator('[data-bill="3"] input[data-field="vendor"]').inputValue()) === '' &&
    (await pages())['3']!.mounted === 2
  // 后台页面不应收到别的页签的路由变化
  out.routeChanges = Object.fromEntries(Object.entries(await pages()).map(([k, v]) => [k, v.routeChanges]))

  // 编辑态：输入到一半，鼠标点别的页签
  const cell = (id: number) => page.locator(`[data-bill="${id}"] .vxe-body--row`).first().locator('td').nth(2)
  await clickTab(page, 1)
  await cell(1).click()
  await page.waitForTimeout(200)
  await page.keyboard.type('鼠标切换')
  await clickTab(page, 2)
  await page.waitForTimeout(300)
  await clickTab(page, 1)
  await page.waitForTimeout(300)
  out.editByMouse = {
    editing: await page.locator('[data-bill="1"] .app-edit-cell').count(),
    text: (await cell(1).innerText()).trim(),
  }
  // 编辑态：输入到一半，程序跳转（如点通知、快捷键）
  await cell(1).click()
  await page.waitForTimeout(200)
  await page.keyboard.type('程序切换')
  await open(page, 2)
  await page.waitForTimeout(300)
  await open(page, 1)
  await page.waitForTimeout(300)
  out.editByRouter = {
    editing: await page.locator('[data-bill="1"] .app-edit-cell').count(),
    inputValue: await page
      .locator('[data-bill="1"] .app-edit-cell input')
      .inputValue({ timeout: 1000 })
      .catch(() => null),
    text: (await cell(1).innerText()).trim(),
  }
  saveResult('trial1-close', out)
  console.log(JSON.stringify(out, null, 1))
})

test('C 内存', async ({ page }) => {
  const client = await cdpOf(page)
  await page.goto('/trials.html#/blank')
  await page.locator('.el-tabs__item').first().waitFor()
  const out: Record<string, unknown> = {}
  out.start = await memory(page, client)
  for (let id = 1; id <= 7; id++) await open(page, id)
  out.sevenBills = await memory(page, client)
  await closeTab(page, '/blank')
  await open(page, 8)
  out.eightBills = await memory(page, client)
  await closeTab(page, '/bill/1')
  await push(page, '/blank')
  for (let id = 2; id <= 8; id++) await closeTab(page, `/bill/${id}`)
  await page.waitForTimeout(500)
  out.allClosed = await memory(page, client)
  out.aliveAfterAllClosed = await page.evaluate(() => (window as unknown as TrialWindow).__trial.alive())

  const cycle = async (id: number) => {
    await open(page, id)
    await closeTab(page, `/bill/${id}`)
    await page.waitForTimeout(50)
  }
  for (let i = 0; i < 5; i++) await cycle(100 + i)
  out.cycleBase = await memory(page, client)
  const series: unknown[] = []
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 10; i++) await cycle(200 + round * 10 + i)
    series.push(await memory(page, client))
  }
  out.cycleSeries = series
  out.aliveAfterCycles = await page.evaluate(() => (window as unknown as TrialWindow).__trial.alive())
  saveResult('trial1-memory', out)
  console.log(JSON.stringify(out, null, 1))
})
