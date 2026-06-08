<script setup>
import * as d3 from 'd3'
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  rows: {
    type: Array,
    required: true,
  },
  limit: {
    type: Number,
    default: 8,
  },
  selectedId: {
    type: [String, Number],
    default: '',
  },
  valueFormatter: {
    type: Function,
    default: (value) => new Intl.NumberFormat().format(value ?? 0),
  },
  color: {
    type: String,
    default: '#0f766e',
  },
})

const emit = defineEmits(['select'])

const chartRows = computed(() => props.rows.slice(0, props.limit))
const maxValue = computed(() => d3.max(chartRows.value, (row) => row.value) ?? 1)
const width = 430
const rowHeight = 38
const margin = { top: 4, right: 42, bottom: 8, left: 125 }
const height = computed(() => margin.top + margin.bottom + chartRows.value.length * rowHeight)
const xScale = computed(() => d3.scaleLinear().domain([0, maxValue.value]).range([margin.left, width - margin.right]))

function rowId(row) {
  return row.id ?? row.entity?.id ?? row.artist?.id ?? row.label
}
</script>

<template>
  <article class="va-card dashboard-mini-chart">
    <div class="dashboard-panel-title">
      <h2>{{ title }}</h2>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>

    <svg v-if="chartRows.length" class="mt-2 h-auto w-full" :viewBox="`0 0 ${width} ${height}`" role="img">
      <g
        v-for="(row, index) in chartRows"
        :key="rowId(row)"
        class="cursor-pointer"
        @click="emit('select', row)"
      >
        <rect
          v-if="String(rowId(row)) === String(selectedId)"
          x="0"
          :y="margin.top + index * rowHeight + 1"
          :width="width"
          height="33"
          fill="#f0fdfa"
        />
        <text
          :x="margin.left - 7"
          :y="margin.top + index * rowHeight + 23"
          text-anchor="end"
          class="fill-slate-700 text-[10px]"
        >
          {{ row.label.length > 20 ? `${row.label.slice(0, 19)}.` : row.label }}
        </text>
        <rect
          :x="margin.left"
          :y="margin.top + index * rowHeight + 12"
          :width="width - margin.left - margin.right"
          height="10"
          fill="#eef2f7"
          rx="2"
        />
        <rect
          :x="margin.left"
          :y="margin.top + index * rowHeight + 12"
          :width="Math.max(2, xScale(row.value) - margin.left)"
          height="10"
          :fill="color"
          rx="2"
        >
          <title>{{ row.label }}: {{ valueFormatter(row.value) }}</title>
        </rect>
        <text
          :x="width - 2"
          :y="margin.top + index * rowHeight + 23"
          text-anchor="end"
          class="fill-slate-500 text-[9px]"
        >
          {{ valueFormatter(row.value) }}
        </text>
      </g>
    </svg>

    <p v-else class="dashboard-empty">No values for the current filters.</p>
  </article>
</template>
