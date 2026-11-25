import { describe, expect, it } from 'vitest'
import { PERM, PERM_NAMES } from '../permissions'
import { router, tabRoutes } from './index'

const duplicates = (list: unknown[]) => list.filter((v, i) => list.indexOf(v) !== i)

describe('路由与权限码唯一', () => {
  // 重名路由会被 vue-router 静默覆盖，所以比对登记数和实际生效数
  it('路由名和路径不重复', () => {
    expect(duplicates(tabRoutes.map((r) => r.name))).toEqual([])
    expect(duplicates(tabRoutes.map((r) => r.path))).toEqual([])
    expect(router.getRoutes().filter((r) => r.meta.tab)).toHaveLength(tabRoutes.length)
  })

  it('权限码不重复，名称齐全', () => {
    const codes = Object.values(PERM)
    expect(duplicates(codes)).toEqual([])
    expect(Object.keys(PERM_NAMES).sort()).toEqual([...codes].sort())
    expect(duplicates(Object.values(PERM_NAMES))).toEqual([])
  })
})
