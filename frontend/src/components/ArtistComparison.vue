<script setup>
import * as d3 from 'd3'
import { computed, ref } from 'vue'

const props = defineProps({
  artists: {
    type: Array,
    required: true,
  },
  options: {
    type: Array,
    required: true,
  },
  selectedIds: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['update-artists', 'select'])
const normalizationMode = ref('raw')

const metrics = [
  { key: 'oceanusLinks', label: 'Oceanus links' },
  { key: 'influenceReceived', label: 'Influence received' },
  { key: 'influenceGiven', label: 'Influence given' },
  { key: 'collaborations', label: 'Creative links' },
  { key: 'releases', label: 'Release links' },
  { key: 'genreDiversity', label: 'Genre diversity' },
]

const width = 760
const rowHeight = 38
const barHeight = 7
const barGap = 3
const margin = { top: 10, right: 24, bottom: 20, left: 132 }

const chartHeight = computed(() => margin.top + margin.bottom + metrics.length * rowHeight)
const normalizedArtists = computed(() =>
  props.artists.map((artist) => {
    const divisor =
      normalizationMode.value === 'degree'
        ? Math.max(artist.degree, 1)
        : normalizationMode.value === 'releases'
          ? Math.max(artist.releases, 1)
          : 1

    return {
      ...artist,
      normalized: Object.fromEntries(metrics.map((metric) => [metric.key, artist[metric.key] / divisor])),
    }
  }),
)
const maxValue = computed(() => d3.max(normalizedArtists.value, (artist) => d3.max(metrics, (metric) => artist.normalized[metric.key])) ?? 1)
const xScale = computed(() => d3.scaleLinear().domain([0, maxValue.value]).nice().range([margin.left, width - margin.right]))
const xTicks = computed(() => xScale.value.ticks(4))
const yRows = computed(() => {
  const rows = []
  metrics.forEach((metric, metricIndex) => {
    normalizedArtists.value.forEach((artist, artistIndex) => {
      rows.push({
        metric,
        artist,
        value: artist.normalized[metric.key],
        rawValue: artist[metric.key],
        y: margin.top + metricIndex * rowHeight + artistIndex * (barHeight + barGap) + 7,
      })
    })
  })
  return rows
})

const color = d3.scaleOrdinal().range(['#0f766e', '#2563eb', '#b45309'])
const interpretation = computed(() => {
  if (props.artists.length < 2) return ''
  const leaders = metrics
    .map((metric) => {
      const leader = d3.greatest(normalizedArtists.value, (artist) => artist.normalized[metric.key])
      return leader ? `${leader.artist.label} leads on ${metric.label.toLowerCase()}` : ''
    })
    .filter(Boolean)

  return `${leaders.slice(0, 2).join(', ')}. Use normalized mode to check whether this remains true after accounting for degree or release count.`
})

function updateArtist(index, value) {
  const next = [...props.selectedIds]
  next[index] = Number(value)
  emit('update-artists', next)
}
</script>

<template>
  <article class="va-card p-3">
    <div class="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 class="text-sm font-semibold text-slate-950">Artist comparison</h2>
        <p class="mt-0.5 text-[11px] text-slate-500">Shared scale across selected artists.</p>
        <label class="mt-2 inline-flex items-center gap-2 text-[11px] font-medium text-slate-600">
          Compare as
          <select v-model="normalizationMode" class="rounded border border-slate-200 bg-white px-2 py-1 text-[11px]">
            <option value="raw">Raw counts</option>
            <option value="degree">Normalized by total degree</option>
            <option value="releases">Normalized by releases</option>
          </select>
        </label>
      </div>
      <div class="grid gap-1.5 sm:grid-cols-3">
        <label v-for="(_, index) in selectedIds" :key="index" class="text-xs font-medium uppercase text-slate-500">
          Artist {{ index + 1 }}
          <select
            class="va-control mt-1 h-9 w-full normal-case"
            :value="selectedIds[index]"
            @change="updateArtist(index, $event.target.value)"
          >
            <option v-for="artist in options" :key="artist.id" :value="artist.id">{{ artist.label }}</option>
          </select>
        </label>
      </div>
    </div>

    <div v-if="artists.length" class="mt-2">
      <div class="mb-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
        <button
          v-for="(artist, index) in artists"
          :key="artist.artist.id"
          class="flex items-center gap-2 rounded border border-slate-200 px-2 py-0.5 hover:bg-slate-50"
          type="button"
          @click="emit('select', artist.artist)"
        >
          <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: color(index) }" />
          {{ artist.artist.label }}
        </button>
      </div>

      <svg class="h-auto w-full" :viewBox="`0 0 ${width} ${chartHeight}`" role="img">
        <g>
          <line
            v-for="tick in xTicks"
            :key="tick"
            :x1="xScale(tick)"
            :x2="xScale(tick)"
            :y1="margin.top"
            :y2="chartHeight - margin.bottom"
            stroke="#e2e8f0"
          />
          <text
            v-for="tick in xTicks"
            :key="`tick-${tick}`"
            :x="xScale(tick)"
            :y="chartHeight - 6"
            text-anchor="middle"
            class="fill-slate-500 text-[10px]"
          >
            {{ tick }}
          </text>
        </g>
        <g v-for="metric in metrics" :key="metric.key">
          <text
            :x="12"
            :y="margin.top + metrics.indexOf(metric) * rowHeight + 23"
            class="fill-slate-600 text-[11px]"
          >
            {{ metric.label }}
          </text>
        </g>

        <g v-for="row in yRows" :key="`${row.metric.key}-${row.artist.artist.id}`">
          <rect
            :x="margin.left"
            :y="row.y"
            :width="Math.max(2, xScale(row.value) - margin.left)"
            :height="barHeight"
            :fill="color(artists.findIndex((item) => item.artist.id === row.artist.artist.id))"
            opacity="0.82"
            class="cursor-pointer"
            @click="emit('select', row.artist.artist)"
          >
            <title>
              {{ row.artist.artist.label }} - {{ row.metric.label }}:
              {{ normalizationMode === 'raw' ? row.rawValue : row.value.toFixed(3) }}
            </title>
          </rect>
          <text :x="xScale(row.value) + 5" :y="row.y + 7" class="fill-slate-500 text-[8px]">
            {{ normalizationMode === 'raw' ? row.rawValue : row.value.toFixed(2) }}
          </text>
        </g>
      </svg>

      <p class="mt-2 truncate rounded bg-teal-50 px-2 py-1.5 text-[11px] text-teal-950" :title="interpretation">
        {{ interpretation }}
      </p>
    </div>

    <p v-else class="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
      Select artists to compare their collaboration, influence, release, genre, and Oceanus Folk signals.
    </p>
  </article>
</template>
