import { expect, test } from '@playwright/test'
import { actionOf, box, dialog, login, overlayGone, rowOf } from './helpers'

test('开发服务：登录、岗位页、表内编辑、冲突框', async ({ page }) => {
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource/.test(m.text())) problems.push(`${m.type()} ${m.text()}`)
  })
  await login(page, 'admin', '/project/roles?org=G&category=GC')
  await expect(rowOf(page, 'GC03')).toBeVisible()
  await overlayGone(page)
  await page.screenshot({ path: 'test-results/shot-list.png' })

  await (await actionOf(page, 'GC03', 'edit')).click()
  const input = page.locator('.vxe-body--column input.el-input__inner').filter({ visible: true })
  await expect(input).toHaveValue('GC03')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Control+A')
  await page.keyboard.type('我改的名字')
  await page.screenshot({ path: 'test-results/shot-edit.png' })
  await page.evaluate(() => fetch('/api/__mock/roles/R5/touch', { method: 'POST' }))
  await page.locator('.app-detail-bar').getByRole('button', { name: '保存', exact: true }).click()
  await expect(dialog(page, '数据已被他人修改')).toBeVisible()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-results/shot-conflict.png' })
  expect(await box(page).count()).toBe(0)
  expect(problems).toEqual([])
})
