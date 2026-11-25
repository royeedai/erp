// 页面标准巡检：全部应用里的每个页面都打开量一遍，新页面登记了路由就自动进来，不用另写用例。
// 数值的依据见 docs/standards/visual.md 和 list.md；护栏在源码里拦不住的放这里。
import { expect, test, type Page } from '@playwright/test'
import { login, overlayGone, watchConsole } from './helpers'

watchConsole()

const FONT_SIZES = [12, 13, 14, 18, 24]
const FONT_WEIGHTS = [400, 700]

/** 全部应用里列出来的页面 */
async function apps(page: Page) {
  await page.getByRole('button', { name: '全部应用' }).click()
  const nav = page.locator('.app-nav')
  await expect(nav).toBeVisible()
  const found = new Map<string, string>()
  for (const module of await nav.locator('.app-nav-modules button').all()) {
    await module.click()
    for (const link of await nav.locator('.app-nav-grid a').all()) {
      found.set((await link.getAttribute('href'))!, (await link.textContent())!.trim())
    }
  }
  await page.keyboard.press('Escape')
  await overlayGone(page)
  return [...found]
}

/** 当前页面里看得见的文字和控件，量成一组数 */
const measure = (page: Page) =>
  page.evaluate(
    ({ sizes, weights }) => {
      const root = document.querySelector<HTMLElement>('.app-content')!
      const shown = (el: Element) => el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && el.getBoundingClientRect().width > 0
      const where = (el: Element) => `${el.tagName.toLowerCase()}.${el.getAttribute('class')?.split(/\s+/).join('.') ?? ''}`
      const odd = new Set<string>()
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        const el = walker.currentNode.parentElement!
        // 必填星号是按原型画的 20px 符号，不算文字
        if (!walker.currentNode.textContent?.trim() || el.matches('.app-star') || !shown(el)) continue
        const style = getComputedStyle(el)
        if (!sizes.includes(Number.parseFloat(style.fontSize))) odd.add(`字号 ${style.fontSize} ${where(el)}`)
        if (!weights.includes(Number(style.fontWeight))) odd.add(`字重 ${style.fontWeight} ${where(el)}`)
      }
      const heights = (selector: string) => [...new Set([...root.querySelectorAll(selector)].filter(shown).map((el) => Math.round(el.getBoundingClientRect().height)))]
      return {
        headers: heights('.app-page-header'),
        title: [...root.querySelectorAll('.app-page-header h1')].filter(shown).map((el) => el.textContent?.trim()),
        primaries: [...root.querySelectorAll('.el-button--primary:not(.is-link)')].filter(shown).map((el) => el.textContent?.trim()),
        rows: heights('.vxe-body--row'),
        buttons: heights('.el-button:not(.is-link)'),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        text: root.innerText,
        odd: [...odd],
      }
    },
    { sizes: FONT_SIZES, weights: FONT_WEIGHTS },
  )

test('每个应用页面：标题行、主按钮、行高、字号字重、不横向溢出、没有占位文字', async ({ page }) => {
  await login(page, 'admin', '/home')
  await expect(page.getByText('你好')).toBeVisible()
  const list = await apps(page)
  expect(list.length).toBeGreaterThan(0)

  for (const [path, title] of list) {
    await test.step(`${title} ${path}`, async () => {
      await page.goto(path)
      await expect(page.locator('.app-page-header').filter({ visible: true })).toBeVisible()
      await overlayGone(page)
      const m = await measure(page)
      expect.soft(m.headers, '标题行高 42').toEqual([42])
      expect.soft(m.title, '标题和应用名一致').toEqual([title])
      expect.soft(m.primaries.length, `最多一个实心主按钮：${m.primaries.join('、')}`).toBeLessThanOrEqual(1)
      expect.soft(m.rows.filter((h) => h !== 24), '行高默认 24').toEqual([])
      expect.soft(m.buttons.filter((h) => h !== 26), '按钮高 26').toEqual([])
      expect.soft(m.overflow, '1366 宽不横向溢出').toBeLessThanOrEqual(0)
      expect.soft(m.text, '没有占位和没取到值的文字').not.toMatch(/暂无数据|No Data|\[object |undefined|NaN/)
      expect.soft(m.odd, '字号只用 12/13/14/18/24，字重只用 400/700').toEqual([])
    })
  }
})
