import { describe, expect, it } from 'vitest'
import { draftToAmount, formatAmount, isNegative, isTypingAllowed, multiply, parseAmount, sumAmounts, toScale } from './amount'

/** 独立算法：整数分 + BigInt，不经过 decimal.js */
function toUnits(value: string, scale: number): bigint {
  const negative = value.startsWith('-')
  const [i = '0', f = ''] = value.replace('-', '').split('.')
  const units = BigInt(i + f.padEnd(scale, '0'))
  return negative ? -units : units
}
function fromUnits(units: bigint, scale: number): string {
  const negative = units < 0n
  const text = (negative ? -units : units).toString().padStart(scale + 1, '0')
  const body = scale === 0 ? text : `${text.slice(0, -scale)}.${text.slice(-scale)}`
  return negative ? `-${body}` : body
}

let seed = 20261124
const rand = (n: number) => {
  seed = (seed * 48271) % 2147483647
  return seed % n
}
function randomAmount(): string {
  const len = 1 + rand(20)
  let int = String(1 + rand(9))
  for (let k = 1; k < len; k++) int += String(rand(10))
  const frac = String(rand(100)).padStart(2, '0')
  return `${rand(3) === 0 ? '-' : ''}${int}.${frac}`
}

describe('parseAmount 接受的写法', () => {
  it.each([
    ['1234.5', '1234.50'],
    ['12345678901234567890.12', '12345678901234567890.12'],
    ['-12345678901234567890.12', '-12345678901234567890.12'],
    ['1,234,567.89', '1234567.89'],
    ['１，２３４．５０', '1234.50'],
    ['(1,234.50)', '-1234.50'],
    ['（1,234.50）', '-1234.50'],
    ['1,234.50-', '-1234.50'],
    ['−1234.5', '-1234.50'],
    ['－1234.5', '-1234.50'],
    ['+5', '5.00'],
    ['¥1,234.50', '1234.50'],
    ['￥-8', '-8.00'],
    ['-¥8', '-8.00'],
    ['CNY 1,234.50', '1234.50'],
    ['1234.50元', '1234.50'],
    ['1 234 567.00', '1234567.00'],
    [' 1234.50 ', '1234.50'],
    ['1234.50\r\n', '1234.50'],
    ['007', '7.00'],
    ['.5', '0.50'],
    ['5.', '5.00'],
    ['1.2300', '1.23'],
    ['0', '0.00'],
    ['-0', '0.00'],
    ['-0.00', '0.00'],
    ['(0)', '0.00'],
  ])('%s → %s', (input, output) => {
    expect(parseAmount(input)).toEqual({ ok: true, value: output })
  })

  it.each([[''], ['   '], ['\r\n']])('空内容 %j → null', (input) => {
    expect(parseAmount(input)).toEqual({ ok: true, value: null })
  })
})

describe('parseAmount 拒绝的写法（不猜、不静默舍入）', () => {
  it.each([
    ['1.23E+10', '科学计数法'],
    ['1e5', '科学计数法'],
    ['1.239', '最多 2 位小数'],
    ['123456789012345678901', '整数最多 20 位'],
    ['1,23', '千分位'],
    ['1.234,56', '千分位'],
    ['12,34,567', '千分位'],
    ['1\t2', '只能粘贴一个数'],
    ['1\n2', '只能粘贴一个数'],
    ['1 2', '只能粘贴一个数'],
    ['abc', '不是有效的数字'],
    ['--5', '不是有效的数字'],
    ['1.2.3', '不是有效的数字'],
    ['-', '不是有效的数字'],
    ['—', '不是有效的数字'],
    ['(-5)', '不能同时出现'],
    ['-5-', '不是有效的数字'],
    ['0x10', '不是有效的数字'],
    ['Infinity', '不是有效的数字'],
  ])('%j', (input, reason) => {
    const r = parseAmount(input)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain(reason)
  })

  it('不允许负数、不允许小数', () => {
    expect(parseAmount('-1', { allowNegative: false }).ok).toBe(false)
    expect(parseAmount('-0', { allowNegative: false })).toEqual({ ok: true, value: '0.00' })
    expect(parseAmount('1.5', { scale: 0 }).ok).toBe(false)
    expect(parseAmount('1.0', { scale: 0 })).toEqual({ ok: true, value: '1' })
  })
})

describe('与 BigInt 独立算法比对', () => {
  it('1000 组随机金额：展示 → 解析往返零误差', () => {
    for (let i = 0; i < 1000; i++) {
      const v = randomAmount()
      const shown = formatAmount(v)
      expect(shown.replace(/,/g, '')).toBe(v)
      expect(parseAmount(shown)).toEqual({ ok: true, value: v })
      expect(toScale(v, 2)).toBe(v)
    }
  })

  it('500 组随机合计（每组 200 行）逐分一致', () => {
    for (let i = 0; i < 500; i++) {
      const list = Array.from({ length: 200 }, randomAmount)
      const oracle = list.reduce((s, v) => s + toUnits(v, 2), 0n)
      expect(sumAmounts(list)).toBe(fromUnits(oracle, 2))
    }
  })

  it('乘法四舍五入到分，与整数运算一致', () => {
    for (let i = 0; i < 500; i++) {
      const a = randomAmount()
      const q = `${rand(100000)}.${String(rand(1000)).padStart(3, '0')}`
      const raw = toUnits(a, 2) * toUnits(q, 3) // 5 位小数
      const abs = raw < 0n ? -raw : raw
      const rounded = (abs + 500n) / 1000n
      const oracle = fromUnits(raw < 0n ? -rounded : rounded, 2).replace(/^-(0\.00)$/, '$1')
      expect(multiply(a, q)).toBe(oracle)
    }
  })
})

describe('展示与输入中间态', () => {
  it('空值、零、负数', () => {
    expect(formatAmount(null)).toBe('—')
    expect(formatAmount('0')).toBe('0.00')
    expect(formatAmount('-1234.5')).toBe('-1,234.50')
    expect(formatAmount('1234', 0)).toBe('1,234')
    expect(isNegative('-0.00')).toBe(false)
    expect(isNegative('-0.01')).toBe(true)
  })
  it('允许的中间文本', () => {
    for (const t of ['', '-', '1', '-1.', '1.2', '.5']) expect(isTypingAllowed(t)).toBe(true)
    for (const t of ['1.234', '1-', '--', 'a', '1.2.', '1'.repeat(21)]) expect(isTypingAllowed(t)).toBe(false)
    expect(isTypingAllowed('1.', { scale: 0 })).toBe(false)
  })
  it('中间文本转规范值', () => {
    expect(draftToAmount('-')).toBe(null)
    expect(draftToAmount('12.')).toBe('12')
    expect(draftToAmount('.5')).toBe('0.5')
    expect(draftToAmount('-0.')).toBe('0')
    expect(draftToAmount('-007.5')).toBe('-7.5')
  })
})
