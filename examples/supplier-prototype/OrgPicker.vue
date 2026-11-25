<script setup lang="ts">
// 参照选择：左候选、右已选。已选跨页、跨搜索保留。
import { computed, ref, watch } from 'vue'
import { Close, Search } from '@element-plus/icons-vue'
import { VxeColumn, VxeTable } from 'vxe-table'
import { orgs, type Org } from './data'
import RuleMark from './RuleMark.vue'

const props = defineProps<{ selected: string[] }>()
const visible = defineModel<boolean>({ required: true })
const emit = defineEmits<{ confirm: [ids: string[]] }>()

const keyword = ref('')
const applied = ref('')
const region = ref('')
const page = ref(1)
const size = 8
const picked = ref<string[]>([])

watch(visible, (open) => {
  if (!open) return
  picked.value = [...props.selected]
  keyword.value = ''
  applied.value = ''
  region.value = ''
  page.value = 1
})

const candidates = computed(() =>
  orgs.filter(
    (o) =>
      o.enabled &&
      (!region.value || o.region === region.value) &&
      (!applied.value || o.name.includes(applied.value) || o.code.includes(applied.value)),
  ),
)
const pageRows = computed(() => candidates.value.slice((page.value - 1) * size, page.value * size))
const pickedRows = computed(() =>
  picked.value.map((id) => orgs.find((o) => o.id === id)).filter((o): o is Org => o !== undefined),
)
watch([applied, region], () => (page.value = 1))

function toggle(id: string) {
  picked.value = picked.value.includes(id) ? picked.value.filter((x) => x !== id) : [...picked.value, id]
}
function submit() {
  emit('confirm', [...picked.value])
  visible.value = false
}
</script>

<template>
  <el-dialog v-model="visible" title="选择适用组织" width="860" append-to-body :close-on-click-modal="false">
    <div class="picker">
      <div class="picker-main">
        <div class="picker-search">
          <el-select v-model="region" style="width: 116px" aria-label="所属区域" placeholder="全部区域" clearable>
            <el-option v-for="r in ['华东', '华南', '华北', '西南']" :key="r" :label="r" :value="r" />
          </el-select>
          <el-input
            v-model="keyword"
            style="width: 220px"
            placeholder="编码或名称，回车搜索"
            clearable
            @keyup.enter="applied = keyword.trim()"
            @clear="applied = ''"
          >
            <template #suffix>
              <el-icon class="is-clickable" @click="applied = keyword.trim()"><Search /></el-icon>
            </template>
          </el-input>
          <span class="picker-note">已停用的组织不出现在这里 <RuleMark rule="picker" /></span>
        </div>
        <VxeTable
          :data="pageRows"
          height="326"
          border="inner"
          :row-config="{ keyField: 'id', isHover: true }"
          :row-class-name="({ row }) => (picked.includes(row.id) ? 'is-picked' : '')"
          @cell-click="({ row }) => toggle(row.id)"
        >
          <VxeColumn width="48" align="center">
            <template #default="{ row }">
              <el-checkbox :model-value="picked.includes(row.id)" :aria-label="`选择 ${row.name}`" @click.stop @change="toggle(row.id)" />
            </template>
          </VxeColumn>
          <VxeColumn field="code" title="组织编码" width="110" />
          <VxeColumn field="name" title="组织名称" min-width="160" />
          <VxeColumn field="region" title="区域" width="80" />
          <template #empty><span class="picker-empty">没有符合条件的组织</span></template>
        </VxeTable>
        <div class="picker-page">
          <span>共 {{ candidates.length }} 个</span>
          <el-pagination
            v-model:current-page="page"
            size="small"
            layout="prev, pager, next"
            :page-size="size"
            :total="candidates.length"
          />
        </div>
      </div>
      <div class="picker-side">
        <div class="picker-side-head">
          <span>已选 {{ picked.length }} 个</span>
          <el-button link type="primary" :disabled="picked.length === 0" @click="picked = []">清空</el-button>
        </div>
        <ul>
          <li v-for="o in pickedRows" :key="o.id">
            <span><small>{{ o.code }}</small>{{ o.name }}</span>
            <el-button link :icon="Close" :aria-label="`移除 ${o.name}`" @click="toggle(o.id)" />
          </li>
        </ul>
        <p v-if="picked.length === 0" class="picker-empty">还没有选择组织</p>
      </div>
    </div>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :disabled="picked.length === 0" @click="submit">确定</el-button>
    </template>
  </el-dialog>
</template>
