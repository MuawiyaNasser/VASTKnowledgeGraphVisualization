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
    default: 5,
  },
})

const emit = defineEmits(['select'])

const width = 210
const height = 250
const radius = 90
const colorsByType = {
  Person: '#0072b2',
  Song: '#009e73',
  Album: '#e69f00',
  RecordLabel: '#cc79a7',
  MusicalGroup: '#56b4e9',
}
const color = d3.scaleOrdinal(['#0f766e', '#2563eb', '#d97706', '#7c3aed', '#64748b'])

const chartData = computed(() => props.data.slice(0, props.limit))
const total = computed(() => d3.sum(chartData.value, (row) => row.value))
const arcs = computed(() => {
  const pie = d3.pie().sort(null).value((row) => row.value)
  const arc = d3.arc().innerRadius(50).outerRadius(radius)
  return pie(chartData.value).map((slice, index) => ({
    ...slice,
    path: arc(slice),
    color: colorsByType[slice.data.label] ?? color(index),
  }))
})

function percent(value) {
  return total.value ? `${Math.round((value / total.value) * 100)}%` : '0%'
}
</script>

<template>
  <article class="va-card dashboard-chart-card">
    <div class="dashboard-panel-title">
      <h2>{{ title }}</h2>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>

    <div v-if="chartData.length" class="donut-layout">
      <svg class="h-full w-full" :viewBox="`0 0 ${width} ${height}`" role="img">
        <g :transform="`translate(${width / 2}, ${height / 2})`">
          <path
            v-for="arc in arcs"
            :key="arc.data.label"
            :d="arc.path"
            :fill="arc.color"
            :opacity="selected && selected !== arc.data.label ? 0.35 : 0.92"
            class="cursor-pointer"
            @click="emit('select', arc.data.label)"
          >
            <title>{{ arc.data.label }}: {{ arc.data.value.toLocaleString() }} ({{ percent(arc.data.value) }})</title>
          </path>
          <text text-anchor="middle" y="-2" class="fill-slate-900 text-[15px] font-semibold">
            {{ total.toLocaleString() }}
          </text>
          <text text-anchor="middle" y="13" class="fill-slate-500 text-[9px]">total</text>
        </g>
      </svg>

      <div class="donut-legend">
        <button
          v-for="(row, index) in chartData"
          :key="row.label"
          type="button"
          class="donut-legend-row"
          :class="selected === row.label ? 'is-selected' : ''"
          @click="emit('select', row.label)"
        >
          <span
            class="h-2.5 w-2.5 rounded-sm"
            :style="{ backgroundColor: colorsByType[row.label] ?? color(index) }"
          />
          <span class="truncate">{{ row.label }}</span>
          <strong>{{ percent(row.value) }}</strong>
        </button>
      </div>
    </div>

    <p v-else class="dashboard-empty">No composition available.</p>
  </article>
</template>
