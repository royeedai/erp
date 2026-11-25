import { test, type Page } from '@playwright/test'
import { cdpOf, saveResult, stat, throttle } from './helpers'

interface AmountWindow {
  __amount: {
    get(): string | null
    set(v: string | null): void
    getLimited(): string | null
    invalid(): string
    clearInvalid(): void
    changes(): (string | null)[]
    getLive(): string
  }
  __timer: Promise<number>
}

const input = (page: Page, name: 'amount' | 'limited' | 'live') => page.locator(`input[data-test="${name}"]`)
const model = (page: Page) => page.evaluate(() => (window as unknown as AmountWindow).__amount.get())
const invalid = (page: Page) => page.evaluate(() => (window as unknown as AmountWindow).__amount.invalid())
const blurAway = (page: Page) => page.locator('[data-test="elsewhere"]').click()

async function set(page: Page, v: string | null) {
  await blurAway(page)
  await page.evaluate((x) => {
    const a = (window as unknown as AmountWindow).__amount
    a.set(x)
    a.clearInvalid()
  }, v)
  await page.waitForTimeout(20)
}

/** 合成粘贴事件，不碰系统剪贴板 */
async function paste(page: Page, text: string, range?: [number, number]) {
  await input(page, 'amount').evaluate(
    (el, { text, range }) => {
      const i = el as HTMLInputElement
      i.focus()
      if (range) i.setSelectionRange(range[0], range[1])
      const dt = new DataTransfer()
      dt.setData('text/plain', text)
      i.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
    },
    { text, range },
  )
  await page.waitForTimeout(30)
}

const caret = (page: Page) =>
  input(page, 'amount').evaluate((el) => {
    const i = el as HTMLInputElement
    return { value: i.value, start: i.selectionStart, end: i.selectionEnd }
  })

test.beforeEach(async ({ page }) => {
  await page.goto('/trials.html#/amount')
  await input(page, 'amount').waitFor()
})

test('A 键入与失焦', async ({ page }) => {
  const cases: [keys: string, want: string | null, shown: string][] = [
    ['12345678901234567890.12', '12345678901234567890.12', '12,345,678,901,234,567,890.12'],
    ['-12345678901234567890.12', '-12345678901234567890.12', '-12,345,678,901,234,567,890.12'],
    ['123456789012345678901', '12345678901234567890.00', '12,345,678,901,234,567,890.00'],
    ['0', '0.00', '0.00'],
    ['-0', '0.00', '0.00'],
    ['007', '7.00', '7.00'],
    ['.5', '0.50', '0.50'],
    ['5.', '5.00', '5.00'],
    ['1.239', '1.23', '1.23'],
    ['1a2b3', '123.00', '123.00'],
    ['1,234', '1234.00', '1,234.00'],
    ['１２３．４', '123.40', '123.40'],
    ['-', null, ''],
    ['.', null, ''],
    ['1-2', '12.00', '12.00'],
    ['0.1', '0.10', '0.10'],
    ['9007199254740993', '9007199254740993.00', '9,007,199,254,740,993.00'],
  ]
  const fails: string[] = []
  for (const [keys, want, shown] of cases) {
    await set(page, null)
    await input(page, 'amount').click()
    for (const ch of keys) {
      if (ch.charCodeAt(0) < 128) await page.keyboard.press(ch)
      else await page.keyboard.insertText(ch)
    }
    await blurAway(page)
    await page.waitForTimeout(30)
    const got = await model(page)
    const display = await input(page, 'amount').inputValue()
    if (got !== want || display !== shown) fails.push(`键入 ${keys}：值 ${got} 应为 ${want}，显示 ${display} 应为 ${shown}`)
  }
  // 限制：不允许负数、整数最多 6 位
  await input(page, 'limited').click()
  await page.keyboard.type('-1234567')
  await blurAway(page)
  const limited = await page.evaluate(() => (window as unknown as AmountWindow).__amount.getLimited())
  if (limited !== '123456.00') fails.push(`限制输入：${limited} 应为 123456.00`)
  // 再次聚焦应全选，直接覆盖
  await set(page, '1234.50')
  await input(page, 'amount').click()
  await page.waitForTimeout(50)
  await page.keyboard.type('9')
  await blurAway(page)
  const replaced = await model(page)
  if (replaced !== '9.00') fails.push(`聚焦全选覆盖：${replaced} 应为 9.00`)
  saveResult('trial3-typing', { cases: cases.length + 2, fails })
  console.log(JSON.stringify({ cases: cases.length + 2, fails }, null, 1))
})

test('B 粘贴', async ({ page }) => {
  const accept: [string, string | null][] = [
    ['1,234,567.89', '1234567.89'],
    ['１，２３４．５０', '1234.50'],
    ['(1,234.50)', '-1234.50'],
    ['¥1,234.50', '1234.50'],
    ['1234.50\r\n', '1234.50'],
    ['-12345678901234567890.12', '-12345678901234567890.12'],
    ['1,234.50-', '-1234.50'],
    ['0', '0.00'],
    ['1 234 567.00', '1234567.00'],
  ]
  const reject: [string, string][] = [
    ['1.23E+10', '科学计数法'],
    ['1.239', '小数'],
    ['123456789012345678901', '整数'],
    ['1,23', '千分位'],
    ['1\t2', '只能粘贴'],
    ['abc', '不是有效'],
  ]
  const fails: string[] = []
  for (const [text, want] of accept) {
    await set(page, '88.00')
    await paste(page, text, [0, 99])
    await blurAway(page)
    await page.waitForTimeout(30)
    const got = await model(page)
    if (got !== want) fails.push(`粘贴 ${JSON.stringify(text)}：${got} 应为 ${want}`)
  }
  for (const [text, reason] of reject) {
    await set(page, '88.00')
    await paste(page, text, [0, 99])
    const why = await invalid(page)
    const tip = await page.locator('.el-popper:visible').innerText().catch(() => '')
    await blurAway(page)
    await page.waitForTimeout(30)
    const got = await model(page)
    if (got !== '88.00' || !why.includes(reason) || !tip.includes(reason)) {
      fails.push(`拒绝 ${JSON.stringify(text)}：值 ${got}，原因“${why}”，界面提示“${tip}”，应含“${reason}”`)
    }
  }
  // 插入到中间
  await set(page, '1234.00')
  await paste(page, '99', [2, 2])
  const mid = await caret(page)
  if (mid.value !== '129934.00' || mid.start !== 4) fails.push(`中间粘贴：${JSON.stringify(mid)}`)
  saveResult('trial3-paste', { cases: accept.length + reject.length + 1, fails })
  console.log(JSON.stringify({ cases: accept.length + reject.length + 1, fails }, null, 1))
})

test('C 光标', async ({ page }) => {
  const fails: string[] = []
  const at = async (pos: number) =>
    input(page, 'amount').evaluate((el, p) => {
      const i = el as HTMLInputElement
      i.focus()
      i.setSelectionRange(p, p)
    }, pos)
  const check = async (label: string, value: string, start: number) => {
    const c = await caret(page)
    if (c.value !== value || c.start !== start || c.end !== start) fails.push(`${label}：${JSON.stringify(c)} 应为 ${value}@${start}`)
  }
  await set(page, '1234567.89')
  await input(page, 'amount').click()
  await page.waitForTimeout(50)
  await at(3)
  await page.keyboard.press('9')
  await check('中间插入', '12394567.89', 4)
  await page.keyboard.press('9')
  await check('连续插入', '123994567.89', 5)
  await page.keyboard.press('Backspace')
  await check('退格', '12394567.89', 4)
  await page.keyboard.press('Delete')
  await check('删除', '1239567.89', 4)
  await page.keyboard.press('x')
  await check('非法字符', '1239567.89', 4)
  await page.keyboard.press(',')
  await check('逗号', '1239567.89', 4)
  await page.keyboard.press('.')
  await check('第二个小数点', '1239567.89', 4)
  await at(10)
  await page.keyboard.press('7')
  await check('超出小数位', '1239567.89', 10)
  await at(0)
  await page.keyboard.press('-')
  await check('开头加负号', '-1239567.89', 1)
  await page.keyboard.press('Home')
  await page.keyboard.press('5')
  await check('负号前输入', '-1239567.89', 0)

  // 对照组：边输边加千分位
  const live: string[] = []
  await input(page, 'live').click()
  await page.keyboard.type('1234567')
  const read = () =>
    input(page, 'live').evaluate((el) => {
      const i = el as HTMLInputElement
      return `${i.value}@${i.selectionStart}`
    })
  live.push(`键入 1234567 → ${await read()}`)
  await input(page, 'live').evaluate((el) => (el as HTMLInputElement).setSelectionRange(2, 2))
  await page.keyboard.press('Backspace')
  live.push(`在逗号后退格 → ${await read()}`)
  await input(page, 'live').evaluate((el) => (el as HTMLInputElement).setSelectionRange(3, 3))
  await page.keyboard.press('9')
  live.push(`中间插入 9 → ${await read()}`)
  saveResult('trial3-caret', { fails, liveFormatterControl: live })
  console.log(JSON.stringify({ fails, live }, null, 1))
})

test('D 1000 组随机值界面往返', async ({ page }) => {
  const mismatches = await page.evaluate(async () => {
    const a = (window as unknown as AmountWindow).__amount
    const el = document.querySelector<HTMLInputElement>('input[data-test="amount"]')!
    const frame = () => new Promise((r) => setTimeout(r, 0))
    let seed = 99
    const rand = (n: number) => (seed = (seed * 48271) % 2147483647) % n
    const bad: string[] = []
    for (let i = 0; i < 1000; i++) {
      let int = String(1 + rand(9))
      for (let k = rand(20); k > 0; k--) int += String(rand(10))
      const v = `${rand(3) === 0 ? '-' : ''}${int}.${String(rand(100)).padStart(2, '0')}`
      a.set(v)
      await frame()
      const shown = el.value
      el.focus()
      await frame()
      const draft = el.value
      el.blur()
      await frame()
      if (shown.replace(/,/g, '') !== v || draft !== v || a.get() !== v) bad.push(`${v} → 显示 ${shown} 编辑 ${draft} 值 ${a.get()}`)
    }
    return bad
  })
  saveResult('trial3-roundtrip', { groups: 1000, mismatchCount: mismatches.length, mismatches: mismatches.slice(0, 10) })
  console.log(JSON.stringify({ count: mismatches.length, first: mismatches.slice(0, 5) }))
})

test('E 按键耗时（只记录）', async ({ page }) => {
  const client = await cdpOf(page)
  const out: Record<string, unknown> = {}
  for (const rate of [1, 4]) {
    await throttle(client, rate)
    const ms: number[] = []
    await set(page, null)
    await input(page, 'amount').click()
    for (let i = 0; i < 120; i++) {
      if (i % 12 === 0) await page.keyboard.press('Control+A')
      await page.evaluate(() => {
        ;(window as unknown as AmountWindow).__timer = new Promise((resolve) => {
          document.addEventListener(
            'keydown',
            (e) => {
              requestAnimationFrame(() => {
                const ch = new MessageChannel()
                ch.port1.onmessage = () => resolve(performance.now() - e.timeStamp)
                ch.port2.postMessage(0)
              })
            },
            { capture: true, once: true },
          )
        })
      })
      await page.keyboard.press(String(i % 10))
      ms.push(await page.evaluate(() => (window as unknown as AmountWindow).__timer))
    }
    out[`cpu${rate}x`] = stat(ms)
  }
  saveResult('trial3-latency', out)
  console.log(JSON.stringify(out))
})
