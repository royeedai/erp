import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const users = JSON.parse(readFileSync(new URL('../../src/mocks/users.json', import.meta.url), 'utf8')) as {
  username: string
  password: string
}[]

/** 每个用例结束时控制台不能有报错和 Vue、vxe 的警告 */
export function watchConsole() {
  const errors: string[] = []
  test.beforeEach(({ page }) => {
    errors.length = 0
    page.on('pageerror', (e) => errors.push(`pageerror ${e.message}`))
    page.on('console', (m) => {
      // 4xx 是用例故意制造的，浏览器会自己打一行，不算错误
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text())
      if (m.type() === 'warning' && /\[Vue warn\]|\[vxe/.test(m.text())) errors.push(m.text())
    })
  })
  test.afterEach(() => {
    expect(errors, '控制台不应有报错').toEqual([])
  })
}

export async function login(page: Page, username: string, path: string) {
  const user = users.find((u) => u.username === username)!
  await page.goto(path)
  await page.locator('input[name="username"]').fill(user.username)
  await page.locator('input[name="password"]').fill(user.password)
  await page.getByRole('button', { name: '登录' }).click()
}

// 横滚时固定列在另一张表里，按行号找才稳
export const rowOf = (page: Page, text: string) => page.locator('.vxe-body--row', { hasText: text }).filter({ visible: true }).first()
export async function idOf(page: Page, text: string) {
  await rowOf(page, text).waitFor()
  return rowOf(page, text).getAttribute('rowid')
}
export const mainRow = async (page: Page, text: string) => page.locator(`.vxe-table--main-wrapper tr[rowid="${await idOf(page, text)}"]`)
export const mainRows = (page: Page) => page.locator('.vxe-table--main-wrapper .vxe-body--row').filter({ visible: true })

/** 弹层或刷新的遮罩没退完就点，Playwright 会自己滚表格重试，固定列和主体差一拍，会点到别的行 */
export const overlayGone = (page: Page) =>
  expect(page.locator('.el-overlay, .el-loading-mask').filter({ visible: true })).toHaveCount(0)

export async function actionOf(page: Page, text: string, action: string) {
  await overlayGone(page)
  const id = await idOf(page, text)
  // 不横滚时操作列在主表里，横滚时在右固定列里：按行号取可见的那一个
  return page.locator(`tr[rowid="${id}"] [data-action="${action}"]`).filter({ visible: true }).last()
}
/** “更多”里的动作 */
export async function moreOf(page: Page, text: string, action: string) {
  await (await actionOf(page, text, 'more')).click()
  return page.locator(`.el-dropdown-menu [data-action="${action}"]`).filter({ visible: true })
}

// 前一个确认框还在退场时，后一个已经打开，取最后一个
export const box = (page: Page) => page.locator('.el-message-box').last()
export const dialog = (page: Page, title: string) => page.locator('.el-dialog', { hasText: title })
export const toastText = (page: Page, text: string) => expect(page.locator('.el-message', { hasText: text }).first()).toBeVisible()
export const call = (page: Page, path: string) => page.evaluate((p) => fetch(p, { method: 'POST' }).then((r) => r.status), path)
/** 固定列会让同样的文字出现几份，只认看得见的 */
export const seen = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true })
