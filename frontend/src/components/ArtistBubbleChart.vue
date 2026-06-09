<script setup>
import * as d3 from 'd3'
import { computed } from 'vue'

const props = defineProps({
  rows: { type: Array, required: true },
  selectedId: { type: [String, Number], default: '' },
})

const emit = defineEmits(['select'])
const width = 370
const height = 235
const margin = { top: 12, right: 18, bottom: 35, left: 38 }
const xScale = computed(() =>
  d3.scaleLinear().domain([0, d3.max(props.rows, (row) => row.collaborations) ?? 1]).nice().range([margin.left, width - margin.right]),
)
const yScale = computed(() =>
  d3.scaleLinear().domain([0, d3.max(props.rows, (row) => row.releases) ?? 1]).nice().range([height - margin.bottom, margin.top]),
)
const radiusScale = computed(() =>
  d3.scaleSqrt().domain([0, d3.max(props.rows, (row) => row.degree) ?? 1]).range([4, 13]),
)
const xTicks = computed(() => xScale.value.ticks(4))
const yTicks = computed(() => yScale.value.ticks(4))
</script>

<template>
  <article class="va-card dashboard-chart-card">
    <div class="dashboard-panel-title">
      <h2>Artist connectivity</h2>
      <p>Creative links versus releases; bubble size is total degree.</p>
    </div>
    <svg v-if="rows.length" class="mt-1 h-auto w-full" :viewBox="`0 0 ${width} ${height}`" role="img">
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
          :key="`y-${tick}`"
          :x="margin.left - 6"
          :y="yScale(tick) + 3"
          text-anchor="end"
          class="fill-slate-500 text-[8px]"
        >
          {{ tick }}
        </text>
        <text
          v-for="tick in xTicks"
          :key="`x-${tick}`"
          :x="xScale(tick)"
          :y="height - 12"
          text-anchor="middle"
          class="fill-slate-500 text-[8px]"
        >
          {{ tick }}
        </text>
      </g>
      <g v-for="row in rows" :key="row.id" class="cursor-pointer" @click="emit('select', row)">
        <circle
          :cx="xScale(row.collaborations)"
          :cy="yScale(row.releases)"
          :r="radiusScale(row.degree)"
          :fill="String(row.id) === String(selectedId) ? '#0f766e' : '#0284c7'"
          :opacity="String(row.id) === String(selectedId) ? 1 : 0.68"
          stroke="white"
          stroke-width="1.5"
        >
          <title>
            {{ row.label }}
            Creative links: {{ row.collaborations }}
            Release links: {{ row.releases }}
            Total degree: {{ row.degree }}
          </title>
        </circle>
      </g>
      <text :x="width / 2" :y="height - 1" text-anchor="middle" class="fill-slate-600 text-[9px]">Creative links</text>
      <text
        x="9"
        :y="height / 2"
        text-anchor="middle"
        class="fill-slate-600 text-[9px]"
        :transform="`rotate(-90 9 ${height / 2})`"
      >
        Release links
      </text>
    </svg>
  </article>
</template>
