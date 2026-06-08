<script setup>
import * as d3 from 'd3'
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  selectedYear: {
    type: [Number, String],
    default: '',
  },
  isPlaying: {
    type: Boolean,
    default: false,
  },
  playbackSpeed: {
    type: Number,
    default: 900,
  },
})

const emit = defineEmits(['select-year', 'play', 'pause', 'step-back', 'step-forward', 'reset-year', 'update-speed'])

const width = 820
const height = 280
const margin = { top: 22, right: 24, bottom: 34, left: 44 }

const chartData = computed(() => props.data.filter((row) => row.year && row.year >= 1975 && row.year <= 2040))

const xScale = computed(() =>
  d3
    .scaleBand()
    .domain(chartData.value.map((row) => String(row.year)))
    .range([margin.left, width - margin.right])
    .padding(0.18),
)

const yScale = computed(() =>
  d3
    .scaleLinear()
    .domain([0, d3.max(chartData.value, (row) => row.oceanus) ?? 1])
    .nice()
    .range([height - margin.bottom, margin.top]),
)

const lineScale = computed(() =>
  d3
    .scaleLinear()
    .domain([0, d3.max(chartData.value, (row) => row.influences) ?? 1])
    .nice()
    .range([height - margin.bottom, margin.top]),
)

const linePath = computed(() => {
  const line = d3
    .line()
    .x((row) => (xScale.value(String(row.year)) ?? 0) + xScale.value.bandwidth() / 2)
    .y((row) => lineScale.value(row.influences))
    .curve(d3.curveMonotoneX)

  return line(chartData.value) ?? ''
})

const xTicks = computed(() => chartData.value.filter((row) => row.year % 5 === 0))
const yTicks = computed(() => yScale.value.ticks(4))
const highestActivity = computed(() => d3.greatest(chartData.value, (row) => row.oceanus))
const highestInfluence = computed(() => d3.greatest(chartData.value, (row) => row.influences))
const currentYearLabel = computed(() => props.selectedYear || 'all years')

function barHeight(row) {
  return height - margin.bottom - yScale.value(row.oceanus)
}

function yearCenter(row) {
  return (xScale.value(String(row.year)) ?? 0) + xScale.value.bandwidth() / 2
}

function influenceAnnotationY(row) {
  const activity = highestActivity.value
  const closeToActivity = activity && Math.abs(yearCenter(activity) - yearCenter(row)) < 92
  if (closeToActivity) return margin.top - 2
  return Math.max(margin.top + 12, lineScale.value(row.influences) - 12)
}
</script>

<template>
  <article class="va-card flex h-full flex-col p-3">
    <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-sm font-semibold text-slate-950">Oceanus Folk Timeline</h2>
        <p class="mt-0.5 text-[11px] text-slate-500">
          Bars show Oceanus Folk entities by year. The line shows influence-style relationships.
        </p>
      </div>
      <p class="text-[11px] text-slate-500">Click a year or use playback to filter linked views.</p>
    </div>

    <div class="mt-2 flex flex-wrap items-center gap-1.5 rounded border border-slate-200 bg-slate-50 p-1.5">
      <button
        class="rounded bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800"
        type="button"
        @click="isPlaying ? emit('pause') : emit('play')"
      >
        {{ isPlaying ? 'Pause' : 'Play' }}
      </button>
      <button class="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100" type="button" @click="emit('step-back')">
        Step back
      </button>
      <button class="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100" type="button" @click="emit('step-forward')">
        Step forward
      </button>
      <button class="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100" type="button" @click="emit('reset-year')">
        Reset year
      </button>
      <label class="ml-auto flex items-center gap-2 text-xs font-medium text-slate-600">
        Speed
        <select
          class="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
          :value="playbackSpeed"
          @change="emit('update-speed', Number($event.target.value))"
        >
          <option :value="1400">Slow</option>
          <option :value="900">Normal</option>
          <option :value="500">Fast</option>
        </select>
      </label>
      <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-800">
        Current: {{ currentYearLabel }}
      </span>
    </div>

    <div class="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600">
      <span class="inline-flex items-center gap-2"><span class="h-2.5 w-5 rounded bg-teal-300" /> Oceanus Folk entities</span>
      <span class="inline-flex items-center gap-2"><span class="h-0.5 w-5 bg-slate-700" /> Influence-style links</span>
      <span class="inline-flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full bg-teal-700" /> Selected year</span>
      <span class="inline-flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full border border-amber-500 bg-amber-100" /> Missing years are not plotted</span>
    </div>

    <svg class="mt-2 h-auto w-full" :viewBox="`0 0 ${width} ${height}`" role="img">
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
          :x="margin.left - 8"
          :y="yScale(tick) + 4"
          text-anchor="end"
          class="fill-slate-500 text-[10px]"
        >
          {{ tick }}
        </text>
      </g>

      <g
        v-for="row in chartData"
        :key="row.year"
        class="cursor-pointer"
        @click="emit('select-year', row.year)"
      >
        <rect
          :x="xScale(String(row.year))"
          :y="yScale(row.oceanus)"
          :width="xScale.bandwidth()"
          :height="barHeight(row)"
          :fill="String(row.year) === String(selectedYear) ? '#0f766e' : '#5eead4'"
        >
          <title>{{ row.year }}: {{ row.oceanus }} Oceanus entities, {{ row.influences }} influence links</title>
        </rect>
      </g>

      <path :d="linePath" fill="none" stroke="#334155" stroke-width="2.5" />
      <circle
        v-for="row in chartData"
        :key="`dot-${row.year}`"
        :cx="(xScale(String(row.year)) ?? 0) + xScale.bandwidth() / 2"
        :cy="lineScale(row.influences)"
        r="2.8"
        fill="#334155"
      >
        <title>{{ row.year }}: {{ row.influences }} influence-style links</title>
      </circle>

      <g v-if="highestActivity">
        <line
          :x1="yearCenter(highestActivity)"
          :x2="yearCenter(highestActivity)"
          :y1="margin.top"
          :y2="height - margin.bottom"
          stroke="#0f766e"
          stroke-dasharray="3 4"
          opacity="0.7"
        />
        <text
          :x="yearCenter(highestActivity) - 6"
          :y="margin.top + 10"
          text-anchor="end"
          class="fill-teal-700 text-[10px]"
        >
          peak Oceanus activity: {{ highestActivity.year }}
        </text>
      </g>

      <g v-if="highestInfluence && highestInfluence.year !== highestActivity?.year">
        <line
          :x1="yearCenter(highestInfluence)"
          :x2="yearCenter(highestInfluence)"
          :y1="margin.top"
          :y2="height - margin.bottom"
          stroke="#334155"
          stroke-dasharray="2 4"
          opacity="0.35"
        />
        <text
          :x="yearCenter(highestInfluence)"
          :y="influenceAnnotationY(highestInfluence)"
          text-anchor="middle"
          class="fill-slate-700 text-[10px]"
          style="paint-order: stroke; stroke: white; stroke-width: 3px"
        >
          <tspan :x="yearCenter(highestInfluence)">peak influence</tspan>
          <tspan :x="yearCenter(highestInfluence)" dy="11">{{ highestInfluence.year }}</tspan>
        </text>
      </g>

      <g>
        <text
          v-for="row in xTicks"
          :key="`year-${row.year}`"
          :x="(xScale(String(row.year)) ?? 0) + xScale.bandwidth() / 2"
          :y="height - 10"
          text-anchor="middle"
          class="fill-slate-500 text-[10px]"
        >
          {{ row.year }}
        </text>
      </g>
    </svg>

    <p class="mt-1 text-[11px] leading-4 text-slate-500">
      Story context: Sailor Shift became a solo artist in 2028. The peak annotations are computed from the graph.
    </p>
  </article>
</template>
