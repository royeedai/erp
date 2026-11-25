import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const users = JSON.parse(readFileSync(new URL('../../src/mocks/users.json', import.meta.url), 'utf8')) as {
  username: string
  password: string
}[]

test('开发服务：登录、列表、对话框、嵌套冲突框', async ({ page }) => {
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource/.test(m.text())) problems.push(`${m.type()} ${m.text()}`)
  })
  await page.goto('/project/roles?org=O1')
  await page.locator('input[name="username"]').fill(users[0]!.username)
  await page.locator('input[name="password"]').fill(users[0]!.password)
  await page.getByRole('button', { name: '登录' }).click()
  const row = page.locator('.vxe-table--main-wrapper .vxe-body--row', { hasText: 'GW0004' })
  await expect(row).toBeVisible()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-results/shot-list.png' })

  const id = await row.getAttribute('rowid')
  await page.locator(`tr[rowid="${id}"] [data-action="edit"]`).filter({ visible: true }).last().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-results/shot-form.png' })
  await page.locator('.el-dialog input[name="name"]').fill('我改的名字')
  await page.evaluate((i) => fetch(`/api/__mock/roles/${i}/touch`, { method: 'POST' }), id)
  await page.locator('.el-dialog').getByRole('button', { name: '保存' }).click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'test-results/shot-conflict.png' })
  expect(problems).toEqual([])
})
