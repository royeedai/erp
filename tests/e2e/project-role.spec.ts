import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const users = JSON.parse(readFileSync(new URL('../../src/mocks/users.json', import.meta.url), 'utf8')) as {
  username: string
  password: string
}[]

const consoleErrors: string[] = []

test.beforeEach(({ page }) => {
  consoleErrors.length = 0
  page.on('pageerror', (e) => consoleErrors.push(`pageerror ${e.message}`))
  page.on('console', (m) => {
    // 4xx 是用例故意制造的，浏览器会自己打一行，不算错误
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(m.text())
    if (m.type() === 'warning' && /\[Vue warn\]|\[vxe/.test(m.text())) consoleErrors.push(m.text())
  })
})
test.afterEach(() => {
  expect(consoleErrors, '控制台不应有报错').toEqual([])
})

async function login(page: Page, username: string, path = '/project/roles') {
  const user = users.find((u) => u.username === username)!
  await page.goto(path)
  await page.locator('input[name="username"]').fill(user.username)
  await page.locator('input[name="password"]').fill(user.password)
  await page.getByRole('button', { name: '登录' }).click()
}

const rowOf = (page: Page, text: string) => page.locator('.vxe-table--main-wrapper .vxe-body--row', { hasText: text }).first()
const mainRows = (page: Page) => page.locator('.vxe-table--main-wrapper .vxe-body--row')
async function actionOf(page: Page, text: string, action: string) {
  const row = rowOf(page, text)
  await row.waitFor()
  const id = await row.getAttribute('rowid')
  // 不横滚时操作列在主表里，横滚时在右固定列里：按行号取可见的那一个
  return page.locator(`tr[rowid="${id}"] [data-action="${action}"]`).filter({ visible: true }).last()
}
const org = (page: Page, name: string) => page.locator('.el-tree-node__content', { hasText: name }).click()
const toastText = (page: Page, text: string) => expect(page.locator('.el-message', { hasText: text })).toBeVisible()
const call = (page: Page, path: string) => page.evaluate((p) => fetch(p, { method: 'POST' }).then((r) => r.status), path)
const dialog = (page: Page, title: string) => page.locator('.el-dialog', { hasText: title })

test('登录：未登录跳转、密码错误、登录后回到原地址、刷新仍在', async ({ page }) => {
  await page.goto('/project/roles?org=O1')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page.getByText('请输入账号')).toBeVisible()
  await page.locator('input[name="username"]').fill('admin')
  await page.locator('input[name="password"]').fill('wrong')
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page.locator('.login-error')).toContainText('账号或密码错误')
  await login(page, 'admin', '/project/roles?org=O1')
  await expect(page).toHaveURL(/\/project\/roles\?org=O1/)
  await expect(rowOf(page, '项目经理')).toBeVisible()
  await page.reload()
  await expect(rowOf(page, '项目经理')).toBeVisible()
  await expect(page.locator('[data-tab="/project/roles"]')).toBeVisible()
})

test('查询：组织切换、回车才查、条件进地址、筛选为空、重置、分页', async ({ page }) => {
  await login(page, 'admin')
  await expect(mainRows(page)).toHaveCount(2)
  await org(page, '华东公司')
  await expect(page.locator('.el-pagination__total')).toContainText('69')
  await expect(page).toHaveURL(/org=O1/)

  const keyword = page.locator('input[name="keyword"]')
  await keyword.fill('造价')
  await page.waitForTimeout(400)
  await expect(page).not.toHaveURL(/keyword/)
  await keyword.press('Enter')
  await expect(page).toHaveURL(/keyword=/)
  await expect(page.locator('.el-pagination__total')).toContainText('7')

  await keyword.fill('不存在的岗位')
  await page.getByRole('button', { name: '查询', exact: true }).click()
  await expect(page.getByText('没有符合条件的数据').filter({ visible: true })).toHaveCount(1)
  await page.screenshot({ path: 'test-results/empty.png' })

  await page.getByRole('button', { name: '重置' }).click()
  await expect(page.locator('.el-pagination__total')).toContainText('69')
  await page.locator('.el-pager li', { hasText: '2' }).click()
  await expect(page).toHaveURL(/page=2/)
  // 去别的页签再回来，条件还在
  await page.locator('[data-tab="/home"]').click()
  await expect(page.getByText('你好')).toBeVisible()
  await page.locator('[data-tab="/project/roles"]').click()
  await expect(page).toHaveURL(/org=O1.*page=2/)
  await expect(page.locator('.el-pager li.is-active')).toHaveText('2')
})

test('新增：必填、编码重复、经理唯一、连点只提交一次', async ({ page }) => {
  await login(page, 'admin')
  await org(page, '华东公司')
  await expect(rowOf(page, '项目经理')).toBeVisible()
  await page.getByRole('button', { name: '新增岗位' }).click()
  const d = dialog(page, '新增岗位')
  await d.getByRole('button', { name: '保存' }).click()
  await expect(d.getByText('请填写岗位编码')).toBeVisible()
  await expect(d.getByText('请填写岗位名称')).toBeVisible()

  await d.locator('input[name="code"]').fill('GW0003')
  await d.locator('input[name="name"]').fill('测试岗位')
  await d.locator('.el-switch').click()
  await d.getByRole('button', { name: '保存' }).click()
  await expect(d.getByText('岗位编码已被“项目经理”使用')).toBeVisible()
  await expect(d.getByText('华东公司已有经理岗位“项目经理”，每个组织只能有一个')).toBeVisible()
  await expect(page.locator('.app-tab-dirty')).toHaveCount(1)

  await d.locator('input[name="code"]').fill('GW9001')
  await d.locator('.el-switch').click()
  let posts = 0
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/api/project-roles')) posts++
  })
  await d.getByRole('button', { name: '保存' }).dblclick()
  await toastText(page, '已新增')
  await expect(rowOf(page, 'GW9001')).toBeVisible()
  expect(posts).toBe(1)
  await expect(page.locator('.app-tab-dirty')).toHaveCount(0)
})

test('编辑与并发冲突：并列显示两边的值，可保留我的或改用最新', async ({ page }) => {
  await login(page, 'admin')
  await org(page, '华东公司')
  await (await actionOf(page, 'GW0004', 'edit')).click()
  const d = dialog(page, '编辑岗位 GW0004')
  await d.locator('input[name="name"]').fill('我改的名字')
  expect(await call(page, '/api/__mock/roles/R4/touch')).toBe(200)
  await d.getByRole('button', { name: '保存' }).click()
  const c = dialog(page, '数据已被他人修改')
  await expect(c).toContainText('示例同事')
  await expect(c).toContainText('你的值：我改的名字')
  await expect(c).toContainText('最新值：项目副经理（他人改）')
  await c.getByRole('button', { name: '保留我的值，重新保存' }).click()
  await toastText(page, '已保存')
  await expect(rowOf(page, 'GW0004')).toContainText('我改的名字')

  await (await actionOf(page, 'GW0004', 'edit')).click()
  await d.locator('input[name="name"]').fill('再改一次')
  await call(page, '/api/__mock/roles/R4/touch')
  await d.getByRole('button', { name: '保存' }).click()
  await c.getByRole('button', { name: '改用最新值' }).click()
  await expect(d.locator('input[name="name"]')).toHaveValue('我改的名字（他人改）')
  await d.getByRole('button', { name: '保存' }).click()
  await toastText(page, '已保存')
})

test('删除：引用保护、临时被引用、正常删除；停用与启用', async ({ page }) => {
  await login(page, 'admin')
  await org(page, '华东公司')
  await expect(await actionOf(page, 'GW0003', 'delete')).toBeDisabled()
  await (await actionOf(page, 'GW0003', 'delete')).locator('xpath=..').hover()
  await expect(page.getByText('已被 3 个项目引用，不能删除，可以停用')).toBeVisible()

  // 打开列表之后才被别人引用
  await call(page, '/api/__mock/roles/R100/reference')
  await (await actionOf(page, 'GW0100', 'delete')).click()
  await page.locator('.el-message-box').getByRole('button', { name: '删除' }).click()
  await expect(page.locator('.el-message-box')).toContainText('XM2026099 示例项目九十九')
  await page.getByRole('button', { name: '知道了' }).click()
  await expect(await actionOf(page, 'GW0100', 'delete')).toBeDisabled()

  await (await actionOf(page, 'GW0101', 'delete')).click()
  await page.locator('.el-message-box').getByRole('button', { name: '取消' }).click()
  await expect(rowOf(page, 'GW0101')).toBeVisible()
  await (await actionOf(page, 'GW0101', 'delete')).click()
  await page.locator('.el-message-box').getByRole('button', { name: '删除' }).click()
  await toastText(page, '已删除')
  await expect(mainRows(page).filter({ hasText: 'GW0101' })).toHaveCount(0)

  await (await actionOf(page, 'GW0102', 'disable')).click()
  await page.locator('.el-message-box').getByRole('button', { name: '停用' }).click()
  await expect(rowOf(page, 'GW0102')).toContainText('已停用')
  await (await actionOf(page, 'GW0102', 'enable')).click()
  await toastText(page, '已启用')
})

test('权限：查阅员只读并说明原因；无权用户看不到菜单、进 403 写明缺什么', async ({ page }) => {
  await login(page, 'viewer')
  await expect(rowOf(page, '集团项目总监')).toBeVisible()
  await expect(page.getByRole('button', { name: '新增岗位' })).toHaveCount(0)
  await expect(await actionOf(page, '集团项目总监', 'edit')).toBeDisabled()
  await (await actionOf(page, '集团项目总监', 'edit')).locator('xpath=..').hover()
  await expect(page.getByText('没有“项目岗位-维护”权限').first()).toBeVisible()

  await page.getByRole('button', { name: '示例查阅员' }).click()
  await page.getByRole('menuitem', { name: '退出登录' }).click()
  await expect(page).toHaveURL(/\/login/)
  await login(page, 'nobody')
  await expect(page.getByText('没有权限')).toBeVisible()
  await expect(page.getByText('项目岗位-查看（project:role:view）')).toBeVisible()
  await expect(page.locator('.el-menu', { hasText: '项目岗位' })).toHaveCount(0)
})

test('集团岗位在下级组织只读', async ({ page }) => {
  await login(page, 'admin', '/project/roles?org=O2')
  await expect(await actionOf(page, '集团合约专员', 'edit')).toBeDisabled()
  await expect(await actionOf(page, 'GW0006', 'edit')).toBeEnabled()
})

test('未保存：关页签要确认，取消则保留', async ({ page }) => {
  await login(page, 'admin')
  await page.getByRole('button', { name: '新增岗位' }).click()
  const d = dialog(page, '新增岗位')
  await d.locator('input[name="code"]').fill('X1')
  await d.getByRole('button', { name: '取消' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '取消' }).click()
  await expect(d.locator('input[name="code"]')).toHaveValue('X1')
  await d.getByRole('button', { name: '取消' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '放弃修改' }).click()
  await expect(d).toBeHidden()
  await expect(page.locator('.app-tab-dirty')).toHaveCount(0)
})

test('会话失效：回到登录页并带上原地址', async ({ page }) => {
  await login(page, 'admin', '/project/roles?org=O1')
  await expect(rowOf(page, '项目经理')).toBeVisible()
  await call(page, '/api/__mock/expire')
  await org(page, '华南公司')
  await expect(page).toHaveURL(/\/login\?redirect=/)
})

test('动效：对话框从点击处展开，系统减少动态效果时近乎关闭', async ({ page }) => {
  await login(page, 'admin')
  await expect(rowOf(page, '集团项目总监')).toBeVisible()
  const button = page.getByRole('button', { name: '新增岗位' })
  const box = (await button.boundingBox())!
  await button.click()
  await page.waitForTimeout(30)
  const info = await page.evaluate(() => {
    const overlay = document.querySelector<HTMLElement>('.el-modal-dialog .el-overlay-dialog, .el-overlay .el-overlay-dialog')!
    const host = overlay.closest<HTMLElement>('.el-overlay')!
    return {
      motion: document.documentElement.classList.contains('app-motion'),
      origin: host.style.getPropertyValue('--app-origin'),
      names: document.getAnimations().map((a) => (a as CSSAnimation).animationName).filter(Boolean),
    }
  })
  expect(info.motion).toBe(true)
  const [x, y] = info.origin.split(' ').map((v) => Number.parseFloat(v))
  expect(Math.abs(x! - (box.x + box.width / 2))).toBeLessThan(3)
  expect(Math.abs(y! - (box.y + box.height / 2))).toBeLessThan(3)
  expect(info.names).toContain('app-zoom-in')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const scale = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--app-motion-scale').trim())
  expect(Number(scale)).toBe(0.01)
})

test('布局：顶栏 48、侧栏 216 可折叠到 64、表格行高 36、表头底色', async ({ page }) => {
  await login(page, 'admin')
  await expect(rowOf(page, '集团项目总监')).toBeVisible()
  const size = (s: string, k: 'height' | 'width') =>
    page.locator(s).first().evaluate((el, key) => el.getBoundingClientRect()[key], k)
  expect(await size('.app-header', 'height')).toBe(48)
  expect(await size('.app-aside', 'width')).toBe(216)
  expect(await size('.vxe-body--row', 'height')).toBe(36)
  const header = await page.locator('.vxe-header--column').first().evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(['rgb(240, 243, 247)', 'rgba(0, 0, 0, 0)']).toContain(header)
  await page.getByRole('button', { name: '收起菜单' }).click()
  expect(await size('.app-aside', 'width')).toBe(64)
  await page.screenshot({ path: 'test-results/layout-collapsed.png' })
  await page.getByRole('button', { name: '展开菜单' }).click()
  await expect(page.locator('.app-aside .el-menu-item', { hasText: '项目岗位' })).toBeVisible()
  await expect(page.locator('.el-tabs__item').first()).toContainText('工作台')
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'test-results/layout.png' })
})
