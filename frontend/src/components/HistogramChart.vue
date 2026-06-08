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
})

const width = 300
const height = 180
const margin = { top: 10, right: 8, bottom: 28, left: 34 }
const xScale = computed(() =>
  d3.scaleBand().domain(props.rows.map((row) => row.label)).range([margin.left, width - margin.right]).padding(0.18),
)
const yScale = computed(() =>
  d3.scaleLinear().domain([0, d3.max(props.rows, (row) => row.value) ?? 1]).nice().range([height - margin.bottom, margin.top]),
)
const yTicks = computed(() => yScale.value.ticks(3))
</script>

<template>
  <article class="va-card dashboard-chart-card">
    <div class="dashboard-panel-title">
      <h2>{{ title }}</h2>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>

    <svg v-if="rows.length" class="mt-2 h-auto w-full" :viewBox="`0 0 ${width} ${height}`" role="img">
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
          :key="`tick-${tick}`"
          :x="margin.left - 5"
          :y="yScale(tick) + 3"
          text-anchor="end"
          class="fill-slate-500 text-[9px]"
        >
          {{ tick >= 1000 ? `${Math.round(tick / 1000)}k` : tick }}
        </text>
      </g>
      <g v-for="row in rows" :key="row.label">
        <rect
          :x="xScale(row.label)"
          :y="yScale(row.value)"
          :width="xScale.bandwidth()"
          :height="height - margin.bottom - yScale(row.value)"
          fill="#7c3aed"
          opacity="0.85"
          rx="1.5"
        >
          <title>{{ row.label }} degree: {{ row.value.toLocaleString() }} entities</title>
        </rect>
        <text
          :x="(xScale(row.label) ?? 0) + xScale.bandwidth() / 2"
          :y="height - 10"
          text-anchor="middle"
          class="fill-slate-500 text-[8px]"
        >
          {{ row.label }}
        </text>
      </g>
    </svg>

    <p v-else class="dashboard-empty">No degree distribution available.</p>
  </article>
</template>
