import { expect, test, type Page } from '@playwright/test'
import { cdpOf, saveResult, stat, throttle } from './helpers'

type Row = Record<string, string | null> & { id: string }
interface EditError {
  rowId: string
  rowNo: number
  key: string
  label: string
  message: string
}
interface EditWindow {
  __edit: {
    rows(): Row[]
    setValue(rowId: string, key: string, value: string | null): void
    totals(): Record<string, string>
    validate(): Promise<{ ms: number; errors: EditError[] }>
    focusCell(rowId: string, key: string): Promise<void>
  }
  __timer: Promise<number>
}

const EDITABLE = ['itemName', 'spec', 'applyAmount', 'taxAmount', 'quantity', 'dueDate', 'payMethod', 'remark'] as const
const METHODS = ['TT', 'BA', 'CK', 'CS']

/** 当前编辑格："行ID|列field|输入框是否聚焦"，列用表头文字反查 */
function currentCell(page: Page) {
  return page.evaluate(() => {
    const cell = document.querySelector('.app-edit-cell')
    if (!cell) return null
    const row = cell.closest('tr')!.getAttribute('rowid')
    const col = cell.closest('td')!.getAttribute('colid')
    const title = document.querySelector(`th[colid="${col}"]`)?.textContent?.trim() ?? ''
    return { row, title, focused: cell.contains(document.activeElement) }
  })
}

const TITLE: Record<string, string> = {
  itemName: '物料名称',
  spec: '规格',
  applyAmount: '申请金额',
  taxAmount: '税额',
  quantity: '数量',
  dueDate: '到期日',
  payMethod: '付款方式',
  remark: '备注',
}

/** 从下一次按键计时到画面更新：type 按键上屏、move 焦点到下一格、total 合计变化 */
async function arm(page: Page, kind: 'type' | 'move' | 'total') {
  await page.evaluate((k) => {
    const id = () => {
      const c = document.querySelector('.app-edit-cell')
      return c ? `${c.closest('tr')!.getAttribute('rowid')}|${c.closest('td')!.getAttribute('colid')}` : ''
    }
    const footer = () => document.querySelector('.vxe-table--footer-wrapper')?.textContent ?? ''
    const beforeCell = id()
    const beforeFooter = footer()
    ;(window as unknown as EditWindow).__timer = new Promise((resolve, reject) => {
      document.addEventListener(
        'keydown',
        (e) => {
          const start = e.timeStamp
          const giveUp = performance.now() + 5000
          const done = () => {
            const ch = new MessageChannel()
            ch.port1.onmessage = () => resolve(performance.now() - start)
            ch.port2.postMessage(0)
          }
          const tick = () => {
            if (performance.now() > giveUp) return reject(new Error('timer gave up'))
            const cell = document.querySelector('.app-edit-cell')
            const ok =
              k === 'type'
                ? true
                : k === 'move'
                  ? id() !== beforeCell && !!cell && cell.contains(document.activeElement)
                  : footer() !== beforeFooter
            if (ok) return done()
            requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        },
        { capture: true, once: true },
      )
    })
  }, kind)
}
const elapsed = (page: Page) => page.evaluate(() => (window as unknown as EditWindow).__timer)

/** 独立算法求合计：BigInt 整数分 */
function oracle(rows: Row[], key: string, scale: number): string {
  let sum = 0n
  for (const r of rows) {
    const v = r[key]
    if (!v) continue
    const neg = v.startsWith('-')
    const [i = '0', f = ''] = v.replace('-', '').split('.')
    const u = BigInt(i + f.padEnd(scale, '0'))
    sum += neg ? -u : u
  }
  const neg = sum < 0n
  const text = (neg ? -sum : sum).toString().padStart(scale + 1, '0')
  return `${neg ? '-' : ''}${text.slice(0, -scale)}.${text.slice(-scale)}`
}

async function checkTotals(page: Page) {
  const { rows, totals } = await page.evaluate(() => {
    const e = (window as unknown as EditWindow).__edit
    return { rows: e.rows(), totals: e.totals() }
  })
  const diffs: string[] = []
  for (const [key, scale] of [['payable', 2], ['paid', 2], ['applyAmount', 2], ['taxAmount', 2], ['quantity', 3]] as const) {
    const want = oracle(rows, key, scale)
    if (totals[key] !== want) diffs.push(`${key}: ${totals[key]} 应为 ${want}`)
  }
  return diffs
}

async function gotoEdit(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text())
  })
  await page.goto('/trials.html#/edit')
  await page.locator('.vxe-body--row').first().waitFor()
  return errors
}

const startAt = (page: Page, rowId: string, key: string) =>
  page.evaluate(([r, k]) => (window as unknown as EditWindow).__edit.focusCell(r!, k!), [rowId, key])

test('A 全键盘连录 50 行：不丢焦点、值全对、合计逐分一致', async ({ page }) => {
  const errors = await gotoEdit(page)
  await startAt(page, 'r1', 'itemName')
  await page.waitForTimeout(300)
  const focusLoss: string[] = []
  const want: Record<string, Record<string, string>> = {}
  let seed = 11
  const rand = (n: number) => (seed = (seed * 48271) % 2147483647) % n

  for (let r = 1; r <= 50; r++) {
    const rowWant: Record<string, string> = {}
    for (const key of EDITABLE) {
      const cell = await currentCell(page)
      if (!cell || cell.row !== `r${r}` || cell.title.replace('*', '').trim() !== TITLE[key] || !cell.focused) {
        focusLoss.push(`第 ${r} 行 ${TITLE[key]}：实际 ${JSON.stringify(cell)}`)
        if (focusLoss.length > 5) break
        await startAt(page, `r${r}`, key)
        await page.waitForTimeout(200)
      }
      if (key === 'itemName') {
        rowWant[key] = `录入名称${r}`
        await page.keyboard.type(rowWant[key]!)
      } else if (key === 'spec') {
        rowWant[key] = `S-${r}`
        await page.keyboard.type(rowWant[key]!)
      } else if (key === 'applyAmount') {
        const int = `${1 + rand(9)}${'0'.repeat(rand(14))}${rand(1000)}`
        rowWant[key] = `${int}.${String(rand(100)).padStart(2, '0')}`
        await page.keyboard.type(rowWant[key]!)
      } else if (key === 'taxAmount') {
        rowWant[key] = `${rand(2) ? '-' : ''}${1 + rand(100000)}.${String(rand(100)).padStart(2, '0')}`
        await page.keyboard.type(rowWant[key]!)
      } else if (key === 'quantity') {
        rowWant[key] = `${rand(1000)}.${String(rand(1000)).padStart(3, '0')}`
        await page.keyboard.type(rowWant[key]!)
      } else if (key === 'dueDate') {
        rowWant[key] = `2027-0${1 + rand(9)}-${String(1 + rand(28)).padStart(2, '0')}`
        await page.keyboard.press('Control+A')
        await page.keyboard.type(rowWant[key]!)
      } else if (key === 'payMethod') {
        // 下箭头展开，输入关键字筛选，回车选中
        const m = rand(4)
        rowWant[key] = METHODS[m]!
        await page.keyboard.press('ArrowDown')
        await page.waitForTimeout(120)
        await page.keyboard.type(['电汇', '银行承兑', '支票', '现金'][m]!)
        await page.waitForTimeout(120)
        await page.keyboard.press('Enter')
        await page.waitForTimeout(80)
      } else {
        rowWant[key] = `备注${r}`
        await page.keyboard.type(rowWant[key]!)
      }
      await page.keyboard.press('Enter')
      await page.waitForTimeout(60)
    }
    want[`r${r}`] = rowWant
    if (focusLoss.length > 5) break
  }
  await page.keyboard.press('Escape')
  const rows = await page.evaluate(() => (window as unknown as EditWindow).__edit.rows())
  const wrong: string[] = []
  for (const [id, w] of Object.entries(want)) {
    const got = rows.find((x) => x.id === id)!
    for (const [k, v] of Object.entries(w)) if (got[k] !== v) wrong.push(`${id}.${k}: ${got[k]} 应为 ${v}`)
  }
  const out = {
    cells: Object.keys(want).length * EDITABLE.length,
    focusLoss,
    wrongCount: wrong.length,
    wrong: wrong.slice(0, 10),
    totalDiffs: await checkTotals(page),
    untouchedRow51: rows[50]!.itemName,
    pageErrors: errors,
  }
  saveResult('trial2-entry', out)
  console.log(JSON.stringify(out, null, 1))
})

test('B 极值合计、撤销、Tab 与只读列', async ({ page }) => {
  const errors = await gotoEdit(page)
  const out: Record<string, unknown> = {}
  // 极值：20 位整数、负数、空值混在一起
  await page.evaluate(() => {
    const e = (window as unknown as EditWindow).__edit
    e.setValue('r1', 'applyAmount', '99999999999999999999.99')
    e.setValue('r2', 'applyAmount', '-12345678901234567890.01')
    e.setValue('r3', 'applyAmount', null)
    e.setValue('r4', 'applyAmount', '0.00')
    e.setValue('r5', 'applyAmount', '0.01')
  })
  await page.waitForTimeout(200)
  out.extremeTotalDiffs = await checkTotals(page)
  out.extremeFooter = (await page.locator('.vxe-table--footer-wrapper').first().innerText()).replace(/\s+/g, ' ').trim()

  // Esc 丢弃
  const before = (await page.evaluate(() => (window as unknown as EditWindow).__edit.rows()))[9]!.itemName
  await startAt(page, 'r10', 'itemName')
  await page.waitForTimeout(200)
  await page.keyboard.type('不该保存')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  out.escKeeps = (await page.evaluate(() => (window as unknown as EditWindow).__edit.rows()))[9]!.itemName === before

  // Tab / Shift+Tab / Shift+Enter
  await startAt(page, 'r10', 'spec')
  await page.waitForTimeout(200)
  await page.keyboard.press('Tab')
  await page.waitForTimeout(150)
  const t1 = await currentCell(page)
  await page.keyboard.press('Shift+Tab')
  await page.waitForTimeout(150)
  const t2 = await currentCell(page)
  await page.keyboard.press('Shift+Enter')
  await page.waitForTimeout(150)
  const t3 = await currentCell(page)
  out.tabSkipsReadonly = t1?.title === '申请金额'
  out.shiftTabBack = t2?.title === '规格'
  out.shiftEnterBack = t3?.title === '物料名称'
  await page.keyboard.press('Escape')

  // 只读列点了不进编辑
  await page.locator('tr[rowid="r10"] td').nth(6).click()
  await page.waitForTimeout(200)
  out.readonlyNotEditable = (await page.locator('.app-edit-cell').count()) === 0

  // 中文输入法：组合输入期间按键不触发跳格，提交后文字正确
  const client = await cdpOf(page)
  await startAt(page, 'r12', 'itemName')
  await page.waitForTimeout(200)
  await client.send('Input.imeSetComposition', { text: 'zhong', selectionStart: 5, selectionEnd: 5 })
  await page.waitForTimeout(80)
  const during = await currentCell(page)
  await client.send('Input.insertText', { text: '中文物料' })
  await page.waitForTimeout(80)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(150)
  out.imeStayedInCell = during?.row === 'r12' && during.title === '物料名称'
  out.imeValue = (await page.evaluate(() => (window as unknown as EditWindow).__edit.rows()))[11]!.itemName

  // 最后一格再按 Enter：不报错、不跑飞
  await startAt(page, 'r200', 'remark')
  await page.waitForTimeout(400)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)
  out.lastCellClosed = (await page.locator('.app-edit-cell').count()) === 0
  out.pageErrors = errors
  saveResult('trial2-behaviour', out)
  console.log(JSON.stringify(out, null, 1))
})

test('C 校验与错误定位', async ({ page }) => {
  const errors = await gotoEdit(page)
  await page.evaluate(() => {
    const e = (window as unknown as EditWindow).__edit
    e.setValue('r8', 'applyAmount', null)
    e.setValue('r8', 'dueDate', null)
    e.setValue('r120', 'applyAmount', '-5.00')
    e.setValue('r200', 'itemName', '')
    e.setValue('r200', 'payMethod', null)
  })
  await page.waitForTimeout(200)
  const first = await page.evaluate(() => (window as unknown as EditWindow).__edit.validate())
  const located: Record<string, unknown>[] = []
  for (const e of first.errors) {
    await page.locator('[data-errors] button', { hasText: `第 ${e.rowNo} 行·${e.label}` }).click()
    await page.waitForTimeout(400)
    const cell = await currentCell(page)
    located.push({ want: `${e.rowId}|${e.label}`, got: cell ? `${cell.row}|${cell.title.replace('*', '').trim()}` : null, focused: cell?.focused ?? false })
    await page.keyboard.press('Escape')
  }
  const marks = await page.locator('.col--valid-error').count()
  // 改正后再校验应为空
  await page.evaluate(() => {
    const e = (window as unknown as EditWindow).__edit
    e.setValue('r8', 'applyAmount', '1.00')
    e.setValue('r8', 'dueDate', '2027-01-01')
    e.setValue('r120', 'applyAmount', '5.00')
    e.setValue('r200', 'itemName', '补上')
    e.setValue('r200', 'payMethod', 'TT')
  })
  const second = await page.evaluate(() => (window as unknown as EditWindow).__edit.validate())
  const times: Record<string, unknown> = {}
  const client = await cdpOf(page)
  for (const rate of [1, 4]) {
    await throttle(client, rate)
    const ms: number[] = []
    for (let i = 0; i < 20; i++) ms.push((await page.evaluate(() => (window as unknown as EditWindow).__edit.validate())).ms)
    times[`cpu${rate}x`] = stat(ms)
  }
  const out = { errors: first.errors, located, errorMarksVisible: marks, afterFix: second.errors, validateMs: times, pageErrors: errors }
  saveResult('trial2-validate', out)
  console.log(JSON.stringify(out, null, 1))
})

test('D 耗时（只记录）', async ({ page }) => {
  await gotoEdit(page)
  const client = await cdpOf(page)
  const out: Record<string, unknown> = {}
  for (const rate of [1, 4]) {
    await throttle(client, rate)
    const typing: number[] = []
    const moving: number[] = []
    const totaling: number[] = []
    let guard = 0
    await startAt(page, rate === 1 ? 'r20' : 'r60', 'applyAmount')
    await page.waitForTimeout(500)
    while (typing.length < 110 && guard++ < 60) {
      for (const ch of '8765.4') {
        await arm(page, 'type')
        await page.keyboard.press(ch)
        typing.push(await elapsed(page))
      }
      await arm(page, 'total')
      await page.keyboard.press('Enter')
      totaling.push(await elapsed(page))
      // 走完本行其余格，回到下一行的申请金额
      for (let i = 0; i < 20; i++) {
        const cell = await currentCell(page)
        if (cell?.title.includes('申请金额')) break
        await arm(page, 'move')
        await page.keyboard.press('Enter')
        moving.push(await elapsed(page))
      }
    }
    // 合计样本不足 100 时补：只改申请金额
    out[`cpu${rate}x`] = { typing: stat(typing), enterToNext: stat(moving), total: stat(totaling) }
    await page.keyboard.press('Escape')
    console.log(rate, JSON.stringify(out[`cpu${rate}x`]))
  }
  await throttle(client, 1)
  saveResult('trial2-latency', out)
  expect(Object.keys(out)).toHaveLength(2)
})

test('E 连按不等待（快打字、扫码枪）：不丢键', async ({ page }) => {
  const errors = await gotoEdit(page)
  const client = await cdpOf(page)
  const out: Record<string, unknown> = {}
  for (const rate of [1, 4]) {
    await throttle(client, rate)
    const first = rate === 1 ? 1 : 40
    await startAt(page, `r${first}`, 'itemName')
    await page.waitForTimeout(800)
    const want: Record<string, Record<string, string>> = {}
    for (let r = first; r < first + 25; r++) {
      const w = { itemName: `快录${r}`, spec: `K${r}`, applyAmount: `${r}12345.67`, taxAmount: `${r}0.5`, quantity: `${r}.125`, dueDate: '2027-03-15', remark: `备${r}` }
      want[`r${r}`] = { ...w, taxAmount: `${r}0.50` }
      for (const key of ['itemName', 'spec', 'applyAmount', 'taxAmount', 'quantity'] as const) {
        await page.keyboard.type(w[key])
        await page.keyboard.press('Enter')
      }
      await page.keyboard.press('Control+A')
      await page.keyboard.type(w.dueDate)
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
      await page.keyboard.type(w.remark)
      await page.keyboard.press('Enter')
    }
    await page.waitForTimeout(1500)
    const rows = await page.evaluate(() => (window as unknown as EditWindow).__edit.rows())
    const wrong: string[] = []
    let total = 0
    for (const [id, w] of Object.entries(want)) {
      const got = rows.find((x) => x.id === id)!
      for (const [k, v] of Object.entries(w)) {
        total++
        if (got[k] !== v) wrong.push(`${id}.${k}: ${JSON.stringify(got[k])} 应为 ${JSON.stringify(v)}`)
      }
    }
    out[`cpu${rate}x`] = { cells: total, wrongCount: wrong.length, wrong: wrong.slice(0, 12) }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
  await throttle(client, 1)
  out.pageErrors = errors
  saveResult('trial2-typeahead', out)
  console.log(JSON.stringify(out, null, 1))
})
