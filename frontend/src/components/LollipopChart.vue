<script setup>
import * as d3 from 'd3'
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  rows: { type: Array, required: true },
  selectedId: { type: [String, Number], default: '' },
  limit: { type: Number, default: 7 },
})

const emit = defineEmits(['select'])
const width = 420
const rowHeight = 27
const margin = { top: 5, right: 36, bottom: 8, left: 130 }
const chartRows = computed(() => props.rows.slice(0, props.limit))
const height = computed(() => margin.top + margin.bottom + chartRows.value.length * rowHeight)
const xScale = computed(() =>
  d3.scaleLinear().domain([0, d3.max(chartRows.value, (row) => row.value) ?? 1]).range([margin.left, width - margin.right]),
)
</script>

<template>
  <article class="va-card dashboard-chart-card">
    <div class="dashboard-panel-title">
      <h2>{{ title }}</h2>
      <p>{{ subtitle }}</p>
    </div>
    <svg v-if="chartRows.length" class="mt-1 h-auto w-full" :viewBox="`0 0 ${width} ${height}`" role="img">
      <g
        v-for="(row, index) in chartRows"
        :key="row.id"
        class="cursor-pointer"
        @click="emit('select', row)"
      >
        <text
          :x="margin.left - 8"
          :y="margin.top + index * rowHeight + 18"
          text-anchor="end"
          class="fill-slate-700 text-[10px]"
        >
          {{ row.label.length > 21 ? `${row.label.slice(0, 20)}.` : row.label }}
        </text>
        <line
          :x1="margin.left"
          :x2="xScale(row.value)"
          :y1="margin.top + index * rowHeight + 14"
          :y2="margin.top + index * rowHeight + 14"
          stroke="#bfdbfe"
          stroke-width="3"
        />
        <circle
          :cx="xScale(row.value)"
          :cy="margin.top + index * rowHeight + 14"
          :r="String(row.id) === String(selectedId) ? 6 : 4.5"
          :fill="String(row.id) === String(selectedId) ? '#0f766e' : '#2563eb'"
        >
          <title>{{ row.label }}: degree {{ row.value }}</title>
        </circle>
        <text
          :x="width - 2"
          :y="margin.top + index * rowHeight + 18"
          text-anchor="end"
          class="fill-slate-500 text-[9px]"
        >
          {{ row.value }}
        </text>
      </g>
    </svg>
  </article>
</template>
