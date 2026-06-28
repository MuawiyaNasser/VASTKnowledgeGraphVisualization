<script setup>
import * as d3 from 'd3'
import { computed } from 'vue'
import LearningHint from './LearningHint.vue'

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
  limit: {
    type: Number,
    default: 10,
  },
  selected: {
    type: String,
    default: '',
  },
  learningMode: { type: Boolean, default: false },
  purpose: { type: String, default: 'Compares categorical values in the current view.' },
  use: { type: String, default: 'Identify the most important categories.' },
  interaction: { type: String, default: 'Click a bar to filter or focus the dashboard.' },
  reading: { type: String, default: 'Longer bars mean larger values.' },
})

const emit = defineEmits(['select'])

const chartData = computed(() => props.data.slice(0, props.limit))
const maxValue = computed(() => d3.max(chartData.value, (row) => row.value) ?? 1)
const width = 360
const rowHeight = 31
const margin = { top: 4, right: 42, bottom: 8, left: 116 }
const height = computed(() => margin.top + margin.bottom + chartData.value.length * rowHeight)
const xScale = computed(() => d3.scaleLinear().domain([0, maxValue.value]).range([margin.left, width - margin.right]))

function formatNumber(value) {
  return new Intl.NumberFormat().format(value)
}
</script>

<template>
  <article class="va-card relative p-3">
    <div class="mb-2.5">
      <h2 class="text-[15px] font-semibold text-slate-950">{{ title }}</h2>
      <p v-if="subtitle" class="mt-1 text-xs leading-5 text-slate-500">{{ subtitle }}</p>
    </div>

    <LearningHint
      :learning-mode="learningMode"
      :purpose="purpose"
      :use="use"
      :interaction="interaction"
      :reading="reading"
    />

    <svg v-if="chartData.length" class="h-auto w-full" :viewBox="`0 0 ${width} ${height}`" role="img">
      <g
        v-for="(row, index) in chartData"
        :key="row.label"
        class="cursor-pointer"
        @click="emit('select', row.label)"
      >
        <text
          :x="margin.left - 7"
          :y="margin.top + index * rowHeight + 18"
          text-anchor="end"
          class="fill-slate-700 text-[10px]"
        >
          {{ row.label.length > 18 ? `${row.label.slice(0, 17)}.` : row.label }}
        </text>
        <rect
          :x="margin.left"
          :y="margin.top + index * rowHeight + 7"
          :width="width - margin.left - margin.right"
          height="13"
          fill="#eef2f7"
          rx="2"
        />
        <rect
          :x="margin.left"
          :y="margin.top + index * rowHeight + 7"
          :width="Math.max(2, xScale(row.value) - margin.left)"
          height="13"
          :fill="row.label === selected ? '#0f766e' : '#14b8a6'"
          :opacity="selected && row.label !== selected ? 0.35 : 0.9"
          rx="2"
        >
          <title>{{ row.label }}: {{ formatNumber(row.value) }}</title>
        </rect>
        <text
          :x="width - 2"
          :y="margin.top + index * rowHeight + 18"
          text-anchor="end"
          class="fill-slate-500 text-[9px]"
        >
          {{ formatNumber(row.value) }}
        </text>
      </g>
    </svg>
    <p v-else class="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No values are visible for the current filters.</p>
  </article>
</template>
