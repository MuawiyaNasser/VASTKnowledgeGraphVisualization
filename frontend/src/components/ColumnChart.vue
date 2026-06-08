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
  data: {
    type: Array,
    required: true,
  },
  selected: {
    type: String,
    default: '',
  },
  limit: {
    type: Number,
    default: 6,
  },
})

const emit = defineEmits(['select'])

const width = 340
const height = 210
const margin = { top: 14, right: 8, bottom: 48, left: 36 }
const chartData = computed(() => props.data.slice(0, props.limit))
const xScale = computed(() =>
  d3.scaleBand().domain(chartData.value.map((row) => row.label)).range([margin.left, width - margin.right]).padding(0.28),
)
const yScale = computed(() =>
  d3.scaleLinear().domain([0, d3.max(chartData.value, (row) => row.value) ?? 1]).nice().range([height - margin.bottom, margin.top]),
)
const yTicks = computed(() => yScale.value.ticks(4))

function shortLabel(label) {
  return label.length > 11 ? `${label.slice(0, 10)}.` : label
}
</script>

<template>
  <article class="va-card dashboard-chart-card">
    <div class="dashboard-panel-title">
      <h2>{{ title }}</h2>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>

    <svg v-if="chartData.length" class="mt-2 h-auto w-full" :viewBox="`0 0 ${width} ${height}`" role="img">
      <g>
        <line
          v-for="tick in yTicks"
          :key="tick"
          :x1="margin.left"
          :x2="width - margin.right"
          :y1="yScale(tick)"
          :y2="yScale(tick)"
          stroke="#e2e8f0"
        />
        <text
          v-for="tick in yTicks"
          :key="`label-${tick}`"
          :x="margin.left - 6"
          :y="yScale(tick) + 3"
          text-anchor="end"
          class="fill-slate-500 text-[9px]"
        >
          {{ tick >= 1000 ? `${Math.round(tick / 1000)}k` : tick }}
        </text>
      </g>

      <g v-for="row in chartData" :key="row.label" class="cursor-pointer" @click="emit('select', row.label)">
        <rect
          :x="xScale(row.label)"
          :y="yScale(row.value)"
          :width="xScale.bandwidth()"
          :height="height - margin.bottom - yScale(row.value)"
          :fill="selected === row.label ? '#0f766e' : '#60a5fa'"
          :opacity="selected && selected !== row.label ? 0.35 : 0.9"
          rx="2"
        >
          <title>{{ row.label }}: {{ row.value.toLocaleString() }}</title>
        </rect>
        <text
          :x="(xScale(row.label) ?? 0) + xScale.bandwidth() / 2"
          :y="height - 30"
          text-anchor="middle"
          class="fill-slate-600 text-[8px]"
        >
          {{ shortLabel(row.label) }}
        </text>
      </g>
    </svg>

    <p v-else class="dashboard-empty">No column values available.</p>
  </article>
</template>
