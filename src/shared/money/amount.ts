import { Decimal as DecimalBase } from 'decimal.js'

/**
 * 金额在整个前端都是字符串：'1234.50'、'-0.05'、null 表示空。
 * 任何地方都不经过 number，超过 16 位也不会丢精度。
 */
export type Amount = string | null

// 60 位有效数字：20 位整数 × 20 位整数再加小数位也放得下；关掉指数形式
export const Decimal = DecimalBase.clone({
  precision: 60,
  rounding: DecimalBase.ROUND_HALF_UP,
  toExpNeg: -60,
  toExpPos: 60,
})

const CANONICAL = /^-?\d+(\.\d+)?$/

export function isAmount(value: unknown): value is string {
  return typeof value === 'string' && CANONICAL.test(value)
}

/** 统一小数位、去掉“负零”。会四舍五入，多余的非零小数位应先由 parseAmount 拦住 */
export function toScale(value: Amount, scale: number): Amount {
  if (value === null || value === '') return null
  const fixed = new Decimal(value).toFixed(scale)
  return /^-0(\.0*)?$/.test(fixed) ? fixed.slice(1) : fixed
}

/** 展示：千分位、固定小数位；空值为 —，零为 0.00 */
export function formatAmount(value: Amount | undefined, scale = 2): string {
  if (value === null || value === undefined || value === '') return '—'
  const fixed = toScale(value, scale) as string
  const negative = fixed.startsWith('-')
  const [integer = '0', fraction] = (negative ? fixed.slice(1) : fixed).split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '-' : ''}${grouped}${fraction === undefined ? '' : `.${fraction}`}`
}

export function isNegative(value: Amount | undefined): boolean {
  return !!value && new Decimal(value).isNegative() && !new Decimal(value).isZero()
}

export function sumAmounts(values: Iterable<Amount | undefined>, scale = 2): string {
  let total = new Decimal(0)
  for (const v of values) if (v) total = total.plus(v)
  return toScale(total.toFixed(), scale) as string
}

export function multiply(a: Amount, b: Amount, scale = 2): Amount {
  if (!a || !b) return null
  return toScale(new Decimal(a).times(b).toFixed(), scale)
}

export function compareAmounts(a: string, b: string): -1 | 0 | 1 {
  return new Decimal(a).cmp(b) as -1 | 0 | 1
}

export interface AmountRule {
  /** 小数位，默认 2 */
  scale?: number
  /** 整数位上限，默认 20 */
  maxInteger?: number
  /** 是否允许负数，默认允许 */
  allowNegative?: boolean
}

export type ParseResult = { ok: true; value: Amount } | { ok: false; reason: string }

/** 全角转半角，统一各种负号 */
export function toHalfWidth(text: string): string {
  return text
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/[−–﹣]/g, '-')
    .replace(/。/g, '.')
}

/**
 * 粘贴内容的严格解析。
 * 有歧义或可能已丢精度的一律拒绝并说明原因，不猜、不静默舍入。
 */
export function parseAmount(text: string, rule: AmountRule = {}): ParseResult {
  const { scale = 2, maxInteger = 20, allowNegative = true } = rule
  let s = toHalfWidth(text).replace(/\u00a0/g, ' ').trim()
  if (s === '') return { ok: true, value: null }
  if (/[\r\n\t]/.test(s)) return { ok: false, reason: '只能粘贴一个数，请不要带换行或多个单元格' }

  let negative = false
  const parens = /^\((.*)\)$/.exec(s)
  if (parens) {
    negative = true
    s = (parens[1] as string).trim()
  }
  s = s
    .replace(/^(CNY|RMB|USD|HKD|EUR)\s*/i, '')
    .replace(/\s*(CNY|RMB|USD|HKD|EUR|元|圆)$/i, '')
    .trim()
  s = s.replace(/^([+-]?)\s*[¥$€£￥]\s*/, '$1').trim()

  const lead = /^([+-])\s*/.exec(s)
  if (lead) {
    if (lead[1] === '-') {
      if (negative) return { ok: false, reason: '负号和括号不能同时出现' }
      negative = true
    }
    s = s.slice(lead[0].length)
  } else if (s.endsWith('-')) {
    // SAP 等系统导出的尾随负号
    if (negative) return { ok: false, reason: '负号和括号不能同时出现' }
    negative = true
    s = s.slice(0, -1).trim()
  }

  if (/^\d+(\.\d+)?e[+-]?\d+$/i.test(s)) {
    return { ok: false, reason: '科学计数法可能已丢失位数，请粘贴完整数字' }
  }
  if (s.includes(',')) {
    if (!/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(s)) return { ok: false, reason: '千分位位置不对，请检查' }
    s = s.replace(/,/g, '')
  }
  // 1 234 567.00：空格或窄空格作千分位
  if (/[ \u2009\u202f]/.test(s)) {
    if (!/^\d{1,3}([ \u2009\u202f]\d{3})+(\.\d*)?$/.test(s)) return { ok: false, reason: '只能粘贴一个数' }
    s = s.replace(/[ \u2009\u202f]/g, '')
  }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return { ok: false, reason: '不是有效的数字' }

  const [rawInt = '', rawFrac = ''] = s.split('.')
  const integer = rawInt.replace(/^0+(?=\d)/, '') || '0'
  const fraction = rawFrac.replace(/0+$/, '')
  if (integer.length > maxInteger) return { ok: false, reason: `整数最多 ${maxInteger} 位` }
  if (fraction.length > scale) {
    return { ok: false, reason: scale === 0 ? '不能有小数' : `最多 ${scale} 位小数` }
  }
  const isZero = integer === '0' && fraction === ''
  if (negative && !allowNegative && !isZero) return { ok: false, reason: '不能为负数' }
  const body = fraction ? `${integer}.${fraction}` : integer
  return { ok: true, value: toScale(negative && !isZero ? `-${body}` : body, scale) }
}

/** 逐键输入时是否允许出现这个中间状态（如 '-'、'12.'） */
export function isTypingAllowed(text: string, rule: AmountRule = {}): boolean {
  const { scale = 2, maxInteger = 20, allowNegative = true } = rule
  const sign = allowNegative ? '-?' : ''
  const frac = scale > 0 ? `(\\.\\d{0,${scale}})?` : ''
  return new RegExp(`^${sign}\\d{0,${maxInteger}}${frac}$`).test(text)
}

/** 编辑框里的中间文本转规范值；'-'、'.'、'' 视为空 */
export function draftToAmount(text: string): Amount {
  if (text === '' || text === '-' || text === '.' || text === '-.') return null
  const negative = text.startsWith('-')
  const [i = '', f = ''] = (negative ? text.slice(1) : text).split('.')
  const integer = i.replace(/^0+(?=\d)/, '') || '0'
  const body = f ? `${integer}.${f}` : integer
  return negative && /[1-9]/.test(body) ? `-${body}` : body
}
