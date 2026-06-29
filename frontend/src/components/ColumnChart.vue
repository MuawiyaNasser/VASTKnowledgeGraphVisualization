<script setup>
import * as d3 from 'd3'
import { computed, ref, watch } from 'vue'
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
  selected: {
    type: String,
    default: '',
  },
  selectedEntityName: {
    type: String,
    default: '',
  },
  selectedTotal: {
    type: Number,
    default: 0,
  },
  mode: {
    type: String,
    default: 'compare',
  },
  limit: {
    type: Number,
    default: 6,
  },
  learningMode: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select', 'update-mode'])

const width = 350
const height = 210
const margin = { top: 14, right: 12, bottom: 48, left: 38 }
const hasSelectedEntity = computed(() => Boolean(props.selectedEntityName))
const isSelectedOnly = computed(() => hasSelectedEntity.value && props.mode === 'selected-only')
const currentPage = ref(0)

const sortedRows = computed(() => {
  const rows = props.data.slice()

  if (isSelectedOnly.value) {
    return rows
      .filter((row) => row.selectedValue > 0)
      .sort((a, b) => b.value - a.value || b.selectedValue - a.selectedValue || a.label.localeCompare(b.label))
  }

  return rows.sort((a, b) => b.value - a.value || b.selectedValue - a.selectedValue || a.label.localeCompare(b.label))
})

const pageSize = computed(() => Math.max(1, props.limit))
const pageCount = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / pageSize.value)))
const pageStart = computed(() => currentPage.value * pageSize.value)
const pageEnd = computed(() => Math.min(sortedRows.value.length, pageStart.value + pageSize.value))
const chartData = computed(() => sortedRows.value.slice(pageStart.value, pageEnd.value))
const hasPreviousPage = computed(() => currentPage.value > 0)
const hasNextPage = computed(() => currentPage.value < pageCount.value - 1)
const pageLabel = computed(() =>
  sortedRows.value.length
    ? `${pageStart.value + 1}-${pageEnd.value} of ${sortedRows.value.length}`
    : '0 of 0',
)
const selectedOffPage = computed(() =>
  Boolean(props.selected) && sortedRows.value.some((row) => row.label === props.selected) && !chartData.value.some((row) => row.label === props.selected),
)

const maxValue = computed(() =>
  isSelectedOnly.value
    ? d3.max(sortedRows.value, (row) => row.selectedValue) ?? 1
    : d3.max(sortedRows.value, (row) => row.value) ?? 1,
)

const maxSelectedShare = computed(() => Math.max(1, d3.max(sortedRows.value, (row) => row.selectedShare) ?? 1))

const xScale = computed(() =>
  d3.scaleBand().domain(chartData.value.map((row) => row.label)).range([margin.left, width - margin.right]).padding(0.28),
)
const yScale = computed(() =>
  d3.scaleLinear().domain([0, maxValue.value]).nice().range([height - margin.bottom, margin.top]),
)
const selectedShareScale = computed(() =>
  d3.scaleLinear().domain([0, maxSelectedShare.value]).range([height - margin.bottom, margin.top]),
)
const yTicks = computed(() => yScale.value.ticks(4))

watch(
  () => `${props.mode}|${props.limit}|${props.data.map((row) => `${row.label}:${row.value}:${row.selectedValue ?? 0}`).join(',')}`,
  () => {
    currentPage.value = 0
  },
)

function nextPage() {
  if (hasNextPage.value) currentPage.value += 1
}

function previousPage() {
  if (hasPreviousPage.value) currentPage.value -= 1
}

function graphValue(row) {
  return row.value ?? 0
}

function selectedValue(row) {
  return row.selectedValue ?? 0
}

function barValue(row) {
  return isSelectedOnly.value ? selectedValue(row) : graphValue(row)
}

function shortLabel(label) {
  const readable = readableRelationshipLabel(label)
  return readable.length > 13 ? `${readable.slice(0, 12)}.` : readable
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString()
}

function readableRelationshipLabel(label) {
  return String(label ?? 'Unknown')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tooltipText(row) {
  if (!hasSelectedEntity.value) {
    return `Relationship: ${readableRelationshipLabel(row.label)}
Links: ${formatNumber(row.value)}
Share of visible graph links: ${(row.graphShare ?? 0).toFixed(1)}%`
  }

  return `Relationship: ${readableRelationshipLabel(row.label)}
${props.selectedEntityName}: ${formatNumber(row.selectedValue)} links
Incoming: ${formatNumber(row.selectedIncoming)}
Outgoing: ${formatNumber(row.selectedOutgoing)}
Current graph: ${formatNumber(row.value)} links
Share of ${props.selectedEntityName}'s direct links: ${(row.selectedShare ?? 0).toFixed(1)}%
Share of visible graph links: ${(row.graphShare ?? 0).toFixed(1)}%`
}
</script>

<template>
  <article class="va-card dashboard-chart-card">
    <div class="flex items-start justify-between gap-2">
      <div class="dashboard-panel-title min-w-0">
        <h2>{{ title }}</h2>
        <p v-if="subtitle" :title="subtitle">{{ subtitle }}</p>
      </div>

      <label v-if="hasSelectedEntity" class="relationship-mode-control">
        View
        <select :value="mode" @change="emit('update-mode', $event.target.value)">
          <option value="compare">Compare with graph</option>
          <option value="selected-only">Selected only</option>
        </select>
      </label>
    </div>

    <div v-if="hasSelectedEntity" class="relationship-legend">
      <span><i class="graph-swatch" /> Graph total</span>
      <span v-if="mode === 'compare'"><i class="profile-dot" /> Selected profile share</span>
      <span v-else><i class="selected-swatch" /> Selected direct links</span>
    </div>

    <div v-if="sortedRows.length" class="relationship-page-status">
      <span>{{ pageLabel }}</span>
      <span v-if="selectedOffPage" class="relationship-off-page">
        {{ selected }} selected off-page
      </span>
    </div>

    <LearningHint
      :learning-mode="learningMode"
      purpose="Shows the most frequent relationship categories."
      use="Understand what kinds of connections dominate the graph."
      interaction="Click or filter by relationship type if supported."
      reading="Taller bars mean that relationship type appears more often."
    />

    <div v-if="chartData.length" class="relationship-chart-wrap">
      <button
        v-if="hasPreviousPage"
        class="relationship-page-button is-left"
        type="button"
        aria-label="Previous relationship types"
        @click="previousPage"
      >
        ‹
      </button>
      <button
        v-if="hasNextPage"
        class="relationship-page-button is-right"
        type="button"
        aria-label="Next relationship types"
        @click="nextPage"
      >
        ›
      </button>

      <svg class="mt-1 h-auto w-full" :viewBox="`0 0 ${width} ${height}`" role="img">
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

        <g
          v-for="row in chartData"
          :key="row.label"
          class="cursor-pointer relationship-bar-group"
          tabindex="0"
          :aria-label="`${row.label}, ${formatNumber(row.value)} graph links, ${formatNumber(row.selectedValue)} selected entity links. Press Enter to filter by this relationship.`"
          @click="emit('select', row.label)"
          @keydown.enter.prevent="emit('select', row.label)"
          @keydown.space.prevent="emit('select', row.label)"
        >
          <rect
            :x="xScale(row.label)"
            :y="yScale(barValue(row))"
            :width="xScale.bandwidth()"
            :height="height - margin.bottom - yScale(barValue(row))"
            :fill="isSelectedOnly ? '#0f766e' : selected === row.label ? '#0f766e' : '#93c5fd'"
            :opacity="selected && selected !== row.label ? 0.35 : 0.92"
            rx="2"
          >
            <title>{{ tooltipText(row) }}</title>
          </rect>

          <template v-if="hasSelectedEntity && !isSelectedOnly">
            <line
              v-if="selectedValue(row) > 0"
              :x1="(xScale(row.label) ?? 0) + xScale.bandwidth() * 0.18"
              :x2="(xScale(row.label) ?? 0) + xScale.bandwidth() * 0.82"
              :y1="selectedShareScale(row.selectedShare)"
              :y2="selectedShareScale(row.selectedShare)"
              stroke="#0f766e"
              stroke-width="3"
              stroke-linecap="round"
            >
              <title>{{ tooltipText(row) }}</title>
            </line>
            <circle
              v-if="selectedValue(row) > 0"
              :cx="(xScale(row.label) ?? 0) + xScale.bandwidth() / 2"
              :cy="selectedShareScale(row.selectedShare)"
              r="3.2"
              fill="#0f766e"
              stroke="white"
              stroke-width="1"
            >
              <title>{{ tooltipText(row) }}</title>
            </circle>
          </template>

          <text
            :x="(xScale(row.label) ?? 0) + xScale.bandwidth() / 2"
            :y="height - 30"
            text-anchor="middle"
            :class="selectedValue(row) > 0 ? 'fill-teal-800 font-semibold text-[8px]' : 'fill-slate-600 text-[8px]'"
          >
            {{ shortLabel(row.label) }}
          </text>
        </g>
      </svg>
    </div>

    <p v-else class="dashboard-empty">
      {{ hasSelectedEntity ? `${selectedEntityName} has no direct relationships under the current filters.` : 'No column values available.' }}
    </p>
  </article>
</template>

<style scoped>
.relationship-mode-control {
  display: grid;
  gap: 0.15rem;
  color: #64748b;
  font-size: 0.62rem;
  font-weight: 600;
  white-space: nowrap;
}

.relationship-mode-control select {
  height: 1.55rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.25rem;
  background: white;
  padding: 0 0.35rem;
  color: #334155;
  font-size: 0.66rem;
  outline: none;
}

.relationship-mode-control select:focus,
.relationship-bar-group:focus {
  outline: 2px solid rgba(15, 118, 110, 0.35);
  outline-offset: 2px;
}

.relationship-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.35rem;
  color: #64748b;
  font-size: 0.62rem;
}

.relationship-legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.relationship-page-status {
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
  margin-top: 0.25rem;
  color: #64748b;
  font-size: 0.62rem;
}

.relationship-off-page {
  color: #0f766e;
  font-weight: 600;
}

.relationship-chart-wrap {
  position: relative;
  padding: 0 1.45rem;
}

.relationship-page-button {
  position: absolute;
  top: 48%;
  z-index: 2;
  display: grid;
  width: 1.35rem;
  height: 1.35rem;
  place-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  color: #0f766e;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.08);
  transition:
    background 140ms ease,
    border-color 140ms ease,
    transform 140ms ease;
}

.relationship-page-button:hover,
.relationship-page-button:focus {
  border-color: #0f766e;
  background: #f0fdfa;
  outline: none;
  transform: translateY(-1px);
}

.relationship-page-button.is-left {
  left: 0;
}

.relationship-page-button.is-right {
  right: 0;
}

.graph-swatch,
.selected-swatch {
  width: 0.65rem;
  height: 0.45rem;
  border-radius: 0.12rem;
}

.graph-swatch {
  background: #93c5fd;
}

.selected-swatch {
  background: #0f766e;
}

.profile-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: #0f766e;
}
</style>
