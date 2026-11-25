// 样式护栏：颜色和动画时长只用 src/theme/ 的变量。脚本和模板由 eslint.config.js 管。
const TIME = '/(?<![\\w.#-])(?:\\d+\\.?\\d*|\\.\\d+)m?s(?![\\w-])/i'
const color = '颜色只用 src/theme/ 里的 CSS 变量，不写颜色值。'
const page = '业务页面不写样式，尺寸和外观由公共封装决定；缺的先补公共封装。'
const duration = '动画时长只用 var(--app-dur-fast / mid / slow)，不写时间值。'

/** @type {import('stylelint').Config} */
export default {
  ignoreFiles: ['src/theme/**'],
  // stylelint-disable 注释一律无效
  ignoreDisables: true,
  overrides: [
    { files: ['**/*.vue'], customSyntax: 'postcss-html' },
    // 业务页面和样例页没有自己的样式，整块拦下
    {
      files: ['src/features/**/*.{css,vue}', 'src/samples/**/*.{css,vue}'],
      rules: {
        'selector-disallowed-list': [['/./'], { message: page }],
        'at-rule-disallowed-list': [['import'], { message: page }],
      },
    },
  ],
  rules: {
    'color-no-hex': [true, { message: color }],
    'color-named': ['never', { message: color }],
    'function-disallowed-list': [
      ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color', 'color-mix'],
      { message: color },
    ],
    'declaration-property-value-disallowed-list': [
      { '/^(-webkit-)?(transition|animation)/': [TIME], '/^--/': [TIME] },
      { message: duration },
    ],
  },
}
