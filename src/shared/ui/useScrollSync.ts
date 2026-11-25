// 滚动之后列变了、表格变窄了，vxe 会新画左右固定区，但它们停在顶部，看起来是空白：手动对一次。
import { nextTick, onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import type { VxeTableInstance } from 'vxe-table'

export function useScrollSync(table: Readonly<Ref<VxeTableInstance | null>>, changed: () => unknown) {
  let observer: ResizeObserver | undefined
  let frame = 0

  async function sync() {
    await nextTick()
    await table.value?.recalculate()
    // 固定区要等重新计算触发的渲染完成才出现，vxe 自己的重算还有一次 50ms 的延后
    await new Promise((resolve) => setTimeout(resolve, 80))
    await table.value?.refreshScroll()
  }
  watch(changed, sync)
  onMounted(() => {
    const el = table.value?.$el as HTMLElement | undefined
    if (!el || typeof ResizeObserver === 'undefined') return
    let width = el.offsetWidth
    observer = new ResizeObserver(() => {
      // 隐藏的页签宽度是 0，不管
      if (el.offsetWidth === 0 || el.offsetWidth === width) return
      width = el.offsetWidth
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => void sync())
    })
    observer.observe(el)
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    cancelAnimationFrame(frame)
  })

  return { sync }
}
