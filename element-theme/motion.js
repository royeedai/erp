/*
 * 记录最近一次鼠标点击位置，供对话框和确认框作为展开原点。
 * 键盘触发、或点击后超过 500ms 才打开（例如先请求数据）时，退回默认原点。
 */
let last = null

export function installMotion() {
  document.documentElement.classList.add('app-motion')
  document.addEventListener(
    'click',
    (e) => {
      if (e.detail > 0) last = { x: e.clientX, y: e.clientY, t: performance.now() }
    },
    true,
  )
}

const origin = () => (last && performance.now() - last.t < 500 ? `${last.x}px ${last.y}px` : null)

/* 传给 <el-config-provider :dialog="{ transition: dialogTransition }">，全局生效 */
export const dialogTransition = {
  name: 'app-dialog',
  onBeforeEnter(el) {
    const o = origin()
    if (o) el.style.setProperty('--app-origin', o)
    else el.style.removeProperty('--app-origin')
  },
}

/* 在封装的 confirm 里、调用 ElMessageBox 之前执行 */
export function markMessageBoxOrigin() {
  const root = document.documentElement.style
  const o = origin()
  if (o) root.setProperty('--app-msgbox-origin', o)
  else root.removeProperty('--app-msgbox-origin')
}
