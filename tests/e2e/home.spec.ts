// 首页：待办计数、我的任务、常用应用和最近访问。
import { expect, test } from '@playwright/test'
import { call, dialog, login, overlayGone, watchConsole } from './helpers'

watchConsole()

test('待办计数和任务：切回首页刷新，能点的任务直达', async ({ page }) => {
  await login(page, 'admin', '/home')
  await expect(page.getByText('示例管理员，你好')).toBeVisible()
  await expect(page.getByText('有 6 条审批等你处理')).toBeVisible()
  await expect(page.locator('.home-center')).toHaveText(['6审批中心', '12业务中心', '2预警中心', '9通知中心'])
  await expect(page.locator('.home-card h2')).toHaveText(['消息处理中心', '采购订单执行跟踪', '日常业务', '付款计划提醒', '待提交单据'])
  await expect(page.locator('.home-metrics > div').first()).toContainText('1,286.00')
  // 待提交单据默认看第一种有单据的，点了切换
  await expect(page.locator('.home-draft-rows > div')).toHaveCount(1)
  await page.locator('.home-drafts button', { hasText: '采购订单' }).click()
  await expect(page.locator('.home-draft-rows > div')).toHaveCount(3)
  await page.locator('.home-drafts button', { hasText: '进度确认单' }).click()
  await expect(page.getByText('没有待提交的进度确认单')).toBeVisible()
  const task = page.locator('.home-tasks > *')
  await expect(task).toHaveCount(6)
  // 没有去处的任务不做成按钮
  await expect(page.locator('.home-tasks > button')).toHaveCount(1)
  await task.filter({ hasText: '没定经理岗位的分类' }).click()
  await expect(page).toHaveURL(/\/project\/roles/)
  const again = page.waitForRequest((r) => r.url().endsWith('/api/home/summary'))
  await page.locator('[data-tab="/home"]').click()
  await again
})

test('常用应用：挑选、刷新还在；最近访问按先后', async ({ page }) => {
  await login(page, 'admin', '/home')
  const apps = page.locator('.home-apps a')
  await expect(apps).toHaveText(['项目岗位', '列表样例'])
  await page.getByRole('button', { name: '最近访问' }).click()
  await expect(page.getByText('还没有访问记录')).toBeVisible()
  await page.getByRole('button', { name: '常用应用', exact: true }).click()
  await page.getByRole('button', { name: '挑选常用应用' }).click()
  const d = dialog(page, '常用应用')
  await d.locator('.el-checkbox', { hasText: '列表样例' }).click()
  await d.getByRole('button', { name: '保存' }).click()
  await overlayGone(page)
  await expect(apps).toHaveText(['项目岗位'])
  await page.reload()
  await expect(apps).toHaveText(['项目岗位'])
  await apps.first().click()
  await expect(page).toHaveURL(/\/project\/roles/)
  await page.getByPlaceholder('请输入应用').fill('列表样例')
  await page.getByPlaceholder('请输入应用').press('Enter')
  await expect(page).toHaveURL(/\/samples\/list/)
  await page.locator('[data-tab="/home"]').click()
  await page.getByRole('button', { name: '最近访问' }).click()
  await expect(apps).toHaveText(['列表样例', '项目岗位'])
})

test('没有任务、没有应用、取不到数，各有说明', async ({ page }) => {
  await login(page, 'viewer', '/home')
  await expect(page.getByText('没有等你处理的审批')).toBeVisible()
  await expect(page.getByText('没有要办的任务')).toBeVisible()
  await call(page, '/api/__mock/fail-list')
  await page.getByRole('button', { name: '刷新待办' }).click()
  await expect(page.getByText('没有取到任务')).toBeVisible()
  await page.getByRole('button', { name: '重新查询' }).click()
  await expect(page.getByText('没有要办的任务')).toBeVisible()
})
