// 试验探针：只在试验页使用，不进正式包
export interface PageLog {
  mounted: number
  unmounted: number
  activated: number
  deactivated: number
  /** 页面自己监听到的 route 变化次数 */
  routeChanges: number
}

export interface Probe {
  pages: Record<string, PageLog>
  /** 最近一次页面激活后首次绘制完成的时间 */
  lastPaint: { key: string; at: number } | null
  /** 最近一次指针按下的时间 */
  lastPointer: number
  alive(): number
  router: unknown
}

const refs: WeakRef<object>[] = []

export const probe: Probe = {
  pages: {},
  lastPaint: null,
  lastPointer: 0,
  alive: () => refs.filter((r) => r.deref() !== undefined).length,
  router: null,
}

export function track(target: object) {
  refs.push(new WeakRef(target))
}

export function logOf(key: string): PageLog {
  return (probe.pages[key] ??= { mounted: 0, unmounted: 0, activated: 0, deactivated: 0, routeChanges: 0 })
}

/** 当前帧绘制完成后回调 */
export function afterPaint(cb: (at: number) => void) {
  requestAnimationFrame(() => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => cb(performance.now())
    channel.port2.postMessage(0)
  })
}

export function installProbe() {
  ;(window as unknown as { __trial: Probe }).__trial = probe
  document.addEventListener('pointerdown', (e) => (probe.lastPointer = e.timeStamp), true)
}
