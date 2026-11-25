// 权限码唯一登记处。页面、菜单、按钮只引用这里的常量，不写字符串。
// 行级能不能编辑、删除看接口返回的 allowedActions，不在前端按状态推断。
export const PERM = {
  projectRoleView: 'project:role:view',
  projectRoleCreate: 'project:role:create',
} as const

export type PermissionCode = (typeof PERM)[keyof typeof PERM]

export const PERM_NAMES: Record<PermissionCode, string> = {
  'project:role:view': '项目岗位-查看',
  'project:role:create': '项目岗位-新增',
}
