<script setup lang="ts">
// 列设置：左边勾选、右边排序。锁定列不能移除。
import { computed, ref, watch } from 'vue'
import { ArrowDown, ArrowUp, Close, Lock, Rank } from '@element-plus/icons-vue'

export interface ColumnOption {
  key: string
  label: string
  locked?: boolean
}

const props = defineProps<{ options: ColumnOption[]; selected: string[]; defaults: string[] }>()
const visible = defineModel<boolean>({ required: true })
const emit = defineEmits<{ confirm: [keys: string[]] }>()

const draft = ref<string[]>([])
watch(visible, (open) => {
  if (open) draft.value = [...props.selected]
})

const byKey = computed(() => new Map(props.options.map((o) => [o.key, o])))
const lockedKeys = computed(() => props.options.filter((o) => o.locked).map((o) => o.key))
const isLocked = (key: string) => lockedKeys.value.includes(key)

function toggle(key: string) {
  if (isLocked(key)) return
  draft.value = draft.value.includes(key) ? draft.value.filter((k) => k !== key) : [...draft.value, key]
}
function move(from: number, to: number) {
  if (to < 0 || to >= draft.value.length) return
  const next = [...draft.value]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as string)
  draft.value = next
}

const dragging = ref(-1)
function onDragOver(index: number) {
  if (dragging.value === -1 || dragging.value === index) return
  move(dragging.value, index)
  dragging.value = index
}

function submit() {
  emit('confirm', [...draft.value])
  visible.value = false
}
</script>

<template>
  <el-dialog v-model="visible" title="设置显示列" width="720" :close-on-click-modal="false">
    <div class="cols">
      <div class="cols-left">
        <div class="cols-head">可选列</div>
        <div class="cols-grid">
          <el-checkbox
            v-for="o in options"
            :key="o.key"
            :model-value="draft.includes(o.key)"
            :disabled="o.locked"
            :label="o.label"
            @change="toggle(o.key)"
          />
        </div>
      </div>
      <div class="cols-right">
        <div class="cols-head">已选 {{ draft.length }} 列，拖动调整顺序</div>
        <ul>
          <li
            v-for="(key, i) in draft"
            :key="key"
            draggable="true"
            :class="{ 'is-dragging': dragging === i }"
            @dragstart="dragging = i"
            @dragover.prevent="onDragOver(i)"
            @dragend="dragging = -1"
          >
            <el-icon class="cols-grip"><Rank /></el-icon>
            <span>{{ byKey.get(key)?.label }}</span>
            <el-button link :icon="ArrowUp" :disabled="i === 0" :aria-label="`上移 ${byKey.get(key)?.label}`" @click="move(i, i - 1)" />
            <el-button link :icon="ArrowDown" :disabled="i === draft.length - 1" :aria-label="`下移 ${byKey.get(key)?.label}`" @click="move(i, i + 1)" />
            <el-tooltip v-if="isLocked(key)" content="这一列不能隐藏" placement="top">
              <el-icon class="cols-lock"><Lock /></el-icon>
            </el-tooltip>
            <el-button v-else link :icon="Close" :aria-label="`移除 ${byKey.get(key)?.label}`" @click="toggle(key)" />
          </li>
        </ul>
      </div>
    </div>
    <template #footer>
      <div class="foot-split">
        <el-button link type="primary" @click="draft = [...defaults]">恢复默认</el-button>
        <span>
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" @click="submit">确定</el-button>
        </span>
      </div>
    </template>
  </el-dialog>
</template>
