// 外壳：登录、导航、页签、权限、会话、布局。
import { expect, test } from '@playwright/test'
import { box, call, login, overlayGone, rowOf, seen, watchConsole } from './helpers'

watchConsole()

const ROLES = '/project/roles?org=G&category=GC'

test('登录：未登录跳转、密码错误、登录后回到原地址、刷新仍在', async ({ page }) => {
  await page.goto(ROLES)
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page.getByText('请输入账号')).toBeVisible()
  await page.locator('input[name="username"]').fill('admin')
  await page.locator('input[name="password"]').fill('wrong')
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page.locator('.login-error')).toContainText('账号或密码错误')
  await login(page, 'admin', ROLES)
  await expect(page).toHaveURL(/\/project\/roles\?org=G&category=GC/)
  await expect(rowOf(page, 'GC01')).toBeVisible()
  await page.reload()
  await expect(rowOf(page, 'GC01')).toBeVisible()
  await expect(page.locator('[data-tab="/project/roles"]')).toBeVisible()
})

test('导航：全部应用、面包屑、应用搜索', async ({ page }) => {
  await login(page, 'admin', '/home')
  await expect(page.getByText('你好')).toBeVisible()
  const toggle = page.getByRole('button', { name: '全部应用' })
  const nav = page.locator('.app-nav')

  // 从全部应用进：业务域 → 模块 → 应用
  await toggle.click()
  await expect(nav.getByRole('button', { name: '项目管理' })).toBeVisible()
  await expect(nav.getByRole('button', { name: '基础设置' })).toHaveAttribute('aria-pressed', 'true')
  await nav.getByRole('link', { name: '项目岗位' }).click()
  await expect(page).toHaveURL(/\/project\/roles/)
  await overlayGone(page)
  const crumbs = page.locator('.app-crumbs .el-breadcrumb__inner')
  await expect(crumbs).toHaveText(['首页', '项目管理', '基础设置', '项目人员', '项目岗位'])
  await expect(page.locator('.el-tabs__item').first()).toContainText('首页')

  // 面包屑回首页
  await crumbs.first().click()
  await expect(page).toHaveURL(/\/home/)
  await expect(page.locator('.app-crumbs')).toHaveCount(0)

  // 搜索：名称、所在模块都能找到，回车直达
  const search = page.getByPlaceholder('请输入应用')
  await search.fill('项目人员')
  await expect(page.locator('.app-search-popper li')).toHaveText(['项目岗位项目管理 / 基础设置 / 项目人员'])
  await search.fill('岗位')
  await search.press('Enter')
  await expect(page).toHaveURL(/\/project\/roles/)
  await expect(search).toHaveValue('')
  await search.fill('不存在')
  await expect(page.getByText('没有叫“不存在”的应用')).toBeVisible()
  await search.press('Enter')
  await expect(page).toHaveURL(/\/project\/roles/)

  // 打开导航时顶栏可用；Esc 收起，再点一次也收起
  await search.fill('')
  await toggle.click()
  await expect(nav).toBeVisible()
  await page.keyboard.press('Escape')
  await overlayGone(page)
  await toggle.click()
  await expect(nav).toBeVisible()
  await toggle.click()
  await overlayGone(page)
})

test('页签条：列表、关闭其他、收起顶栏', async ({ page }) => {
  await login(page, 'admin', ROLES)
  await expect(rowOf(page, 'GC01')).toBeVisible()
  await page.getByRole('button', { name: '收起顶栏' }).click()
  await expect(page.locator('.app-header')).toBeHidden()
  await page.getByRole('button', { name: '展开顶栏' }).click()
  await expect(page.locator('.app-header')).toBeVisible()
  const list = page.getByRole('button', { name: '页签列表' })
  await list.click()
  await page.getByRole('menuitem', { name: '首页' }).click()
  await expect(page).toHaveURL(/\/home/)
  await list.click()
  await page.getByRole('menuitem', { name: '关闭其他页签' }).click()
  await expect(page.locator('.el-tabs__item')).toHaveCount(1)
})

test('未保存：关页签要确认，不关就保留，确认了才丢', async ({ page }) => {
  await login(page, 'admin', ROLES)
  await expect(rowOf(page, 'GC01')).toBeVisible()
  await overlayGone(page)
  await page.getByRole('button', { name: '增行' }).click()
  await page.keyboard.type('GC20')
  await page.keyboard.press('Enter')
  await expect(page.locator('.app-tab-dirty')).toHaveCount(1)
  const closeIcon = page.locator('.el-tabs__item', { hasText: '项目岗位' }).locator('.is-icon-close')
  await closeIcon.click()
  await expect(box(page)).toContainText('“项目岗位”有未保存的内容')
  await box(page).getByRole('button', { name: '不关闭' }).click()
  await expect(rowOf(page, 'GC20')).toBeVisible()
  // 去别的页签再回来，草稿还在
  await overlayGone(page)
  await page.locator('[data-tab="/home"]').click()
  await expect(page.getByText('你好')).toBeVisible()
  await page.locator('[data-tab="/project/roles"]').click()
  await expect(rowOf(page, 'GC20')).toBeVisible()
  await closeIcon.click()
  await box(page).getByRole('button', { name: '仍然关闭' }).click()
  await expect(page).toHaveURL(/\/home/)
  await expect(page.locator('.el-tabs__item')).toHaveCount(1)
})

test('权限：无权用户看不到应用、进 403 写明缺什么', async ({ page }) => {
  await login(page, 'nobody', ROLES)
  await expect(page.locator('.el-result')).toContainText('没有权限')
  await expect(page.getByText('项目岗位-查看（project:role:view）')).toBeVisible()
  await page.getByRole('button', { name: '全部应用' }).click()
  const nav = page.locator('.app-nav')
  await expect(nav).toBeVisible()
  await expect(nav.getByRole('link', { name: '项目岗位' })).toHaveCount(0)
  await expect(nav.getByRole('button', { name: '项目管理' })).toHaveCount(0)
  await page.getByRole('button', { name: '全部应用' }).click()
  await overlayGone(page)
  await page.getByPlaceholder('请输入应用').fill('项目岗位')
  await expect(page.getByText('没有叫“项目岗位”的应用')).toBeVisible()
  await page.getByPlaceholder('请输入应用').fill('')
  await page.getByRole('button', { name: '示例无权用户' }).click()
  await page.getByRole('menuitem', { name: '退出登录' }).click()
  await expect(page).toHaveURL(/\/login/)
})

test('会话失效：回到登录页并带上原地址', async ({ page }) => {
  await login(page, 'admin', ROLES)
  await expect(rowOf(page, 'GC01')).toBeVisible()
  await call(page, '/api/__mock/expire')
  await page.locator('.role-tree .app-tree-node', { hasText: 'TZ 投资类' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
})

test('动效：对话框从点击处展开，系统减少动态效果时近乎关闭', async ({ page }) => {
  await login(page, 'admin', '/samples/list')
  await expect(seen(page, '还没有查询')).toHaveCount(1)
  const button = page.getByRole('button', { name: '高级查询' })
  const rect = (await button.boundingBox())!
  await button.click()
  await page.waitForTimeout(30)
  const info = await page.evaluate(() => {
    const host = [...document.querySelectorAll<HTMLElement>('.el-modal-dialog')].find((el) => el.style.display !== 'none' && el.querySelector('.el-dialog'))!
    return {
      motion: document.documentElement.classList.contains('app-motion'),
      origin: host.style.getPropertyValue('--app-origin'),
      names: document.getAnimations().map((a) => (a as CSSAnimation).animationName).filter(Boolean),
    }
  })
  expect(info.motion).toBe(true)
  const [x, y] = info.origin.split(' ').map((v) => Number.parseFloat(v))
  expect(Math.abs(x! - (rect.x + rect.width / 2))).toBeLessThan(3)
  expect(Math.abs(y! - (rect.y + rect.height / 2))).toBeLessThan(3)
  expect(info.names).toContain('app-zoom-in')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const scale = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--app-motion-scale').trim())
  expect(Number(scale)).toBe(0.01)
})

test('布局：没有侧栏、顶栏 40、页签 28、标题行 42、内容到屏幕左边、行高 24', async ({ page }) => {
  await login(page, 'admin', ROLES)
  await expect(rowOf(page, 'GC01')).toBeVisible()
  await overlayGone(page)
  const rect = (s: string) => page.locator(s).first().evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect)
  expect((await rect('.app-header')).height).toBe(40)
  expect((await rect('.app-tab-strip')).height).toBe(28)
  expect((await rect('.app-page-header')).height).toBe(42)
  expect((await rect('.app-content')).left).toBe(0)
  expect((await rect('.app-content')).width).toBe(1366)
  expect((await rect('.vxe-body--row')).height).toBe(24)
  const header = await page.locator('.vxe-header--column').first().evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(['rgb(247, 246, 254)', 'rgba(0, 0, 0, 0)']).toContain(header)
  await page.screenshot({ path: 'test-results/layout.png' })
})
