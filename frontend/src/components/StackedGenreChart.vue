<script setup>
import * as d3 from 'd3'
import { computed } from 'vue'

const props = defineProps({
  rows: { type: Array, required: true },
  selected: { type: String, default: '' },
  limit: { type: Number, default: 6 },
})

const emit = defineEmits(['select'])
const width = 430
const rowHeight = 37
const margin = { top: 5, right: 34, bottom: 8, left: 115 }
const chartRows = computed(() => props.rows.slice(0, props.limit))
const height = computed(() => margin.top + margin.bottom + chartRows.value.length * rowHeight)
const xScale = computed(() =>
  d3.scaleLinear().domain([0, d3.max(chartRows.value, (row) => row.value) ?? 1]).range([margin.left, width - margin.right]),
)
const segments = [
  { key: 'influence', label: 'Influence', color: '#7c3aed' },
  { key: 'collaboration', label: 'Creative', color: '#d97706' },
  { key: 'other', label: 'Other', color: '#94a3b8' },
]

function segmentValue(row, key) {
  if (key === 'other') return Math.max(0, row.value - row.influence - row.collaboration)
  return row[key]
}

function segmentX(row, segmentIndex) {
  return segments.slice(0, segmentIndex).reduce((sum, segment) => sum + segmentValue(row, segment.key), 0)
}
</script>

<template>
  <article class="va-card dashboard-chart-card">
    <div class="flex items-start justify-between gap-2">
      <div class="dashboard-panel-title">
        <h2>Oceanus genre links</h2>
        <p>Influence, creative, and other connections.</p>
      </div>
      <div class="flex flex-wrap justify-end gap-2 text-[9px] text-slate-500">
        <span v-for="segment in segments" :key="segment.key" class="inline-flex items-center gap-1">
          <i class="h-2 w-2 rounded-sm" :style="{ backgroundColor: segment.color }" />
          {{ segment.label }}
        </span>
      </div>
    </div>
    <svg v-if="chartRows.length" class="mt-1 h-auto w-full" :viewBox="`0 0 ${width} ${height}`" role="img">
      <g
        v-for="(row, rowIndex) in chartRows"
        :key="row.label"
        class="cursor-pointer"
        :opacity="selected && selected !== row.label ? 0.35 : 1"
        @click="emit('select', row.label)"
      >
        <text
          :x="margin.left - 7"
          :y="margin.top + rowIndex * rowHeight + 18"
          text-anchor="end"
          class="fill-slate-700 text-[10px]"
        >
          {{ row.label }}
        </text>
        <rect
          v-for="(segment, segmentIndex) in segments"
          :key="segment.key"
          :x="xScale(segmentX(row, segmentIndex))"
          :y="margin.top + rowIndex * rowHeight + 7"
          :width="Math.max(0, xScale(segmentX(row, segmentIndex) + segmentValue(row, segment.key)) - xScale(segmentX(row, segmentIndex)))"
          height="13"
          :fill="segment.color"
        >
          <title>{{ row.label }} - {{ segment.label }}: {{ segmentValue(row, segment.key) }}</title>
        </rect>
        <text
          :x="width - 2"
          :y="margin.top + rowIndex * rowHeight + 18"
          text-anchor="end"
          class="fill-slate-500 text-[9px]"
        >
          {{ row.value }}
        </text>
      </g>
    </svg>
  </article>
</template>
