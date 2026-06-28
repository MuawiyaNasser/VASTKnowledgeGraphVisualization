<script setup>
import * as d3 from 'd3'
import { computed, ref } from 'vue'
import LearningHint from './LearningHint.vue'

const props = defineProps({
  rows: { type: Array, required: true },
  selectedId: { type: [String, Number], default: '' },
  learningMode: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const width = 330
const height = 235
const margin = { top: 14, right: 18, bottom: 34, left: 40 }
const hoveredId = ref('')
const searchTerm = ref('')
const tooltip = ref({ visible: false, x: 0, y: 0, group: null })

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const cleanRows = computed(() =>
  props.rows
    .map((row) => ({
      ...row,
      collaborations: numberValue(row.collaborations),
      releases: numberValue(row.releases),
      degree: numberValue(row.degree) ?? 0,
    }))
    .filter((row) => row.collaborations !== null && row.releases !== null),
)

function paddedDomain(values) {
  const extent = d3.extent(values)
  const min = extent[0] ?? 0
  const max = extent[1] ?? 1

  if (min === max) return [min - 1, max + 1]

  const padding = (max - min) * 0.07
  return [min - padding, max + padding]
}

const xDomain = computed(() => paddedDomain(cleanRows.value.map((row) => row.collaborations)))
const yDomain = computed(() => paddedDomain(cleanRows.value.map((row) => row.releases)))
const degreeDomain = computed(() => {
  const extent = d3.extent(cleanRows.value, (row) => row.degree)
  const min = extent[0] ?? 0
  const max = extent[1] ?? 1
  return min === max ? [0, max || 1] : [min, max]
})

const xScale = computed(() =>
  d3.scaleLinear().domain(xDomain.value).nice().range([margin.left, width - margin.right]),
)
const yScale = computed(() =>
  d3.scaleLinear().domain(yDomain.value).nice().range([height - margin.bottom, margin.top]),
)
const radiusScale = computed(() => d3.scaleSqrt().domain(degreeDomain.value).range([5, 13]))
const xTicks = computed(() => xScale.value.ticks(4))
const yTicks = computed(() => yScale.value.ticks(4))

const topRows = computed(() =>
  cleanRows.value
    .slice()
    .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label))
    .slice(0, 10),
)

const panelRows = computed(() => {
  const query = searchTerm.value.trim().toLowerCase()
  if (!query) return topRows.value

  return cleanRows.value
    .filter((row) => row.label.toLowerCase().includes(query))
    .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label))
    .slice(0, 10)
})

const topIds = computed(() => new Set(topRows.value.map((row) => String(row.id))))

const groups = computed(() => {
  const byCoordinate = new Map()

  for (const row of cleanRows.value) {
    const key = `${row.collaborations}|${row.releases}`
    if (!byCoordinate.has(key)) {
      byCoordinate.set(key, {
        key,
        collaborations: row.collaborations,
        releases: row.releases,
        artists: [],
      })
    }
    byCoordinate.get(key).artists.push(row)
  }

  return Array.from(byCoordinate.values()).map((group) => {
    const sortedArtists = group.artists
      .slice()
      .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label))
    const selected = sortedArtists.some((row) => String(row.id) === String(props.selectedId))
    const hovered = sortedArtists.some((row) => String(row.id) === String(hoveredId.value))
    const topRanked = sortedArtists.some((row) => topIds.value.has(String(row.id)))
    const degree = d3.max(sortedArtists, (row) => row.degree) ?? 0

    return {
      ...group,
      artists: sortedArtists,
      degree,
      selected,
      hovered,
      topRanked,
      x: xScale.value(group.collaborations),
      y: yScale.value(group.releases),
      radius: radiusScale.value(degree),
    }
  })
})

const activeHighlight = computed(() => hoveredId.value || props.selectedId)

const diagonalLine = computed(() => {
  const min = Math.max(xScale.value.domain()[0], yScale.value.domain()[0])
  const max = Math.min(xScale.value.domain()[1], yScale.value.domain()[1])
  if (min >= max) return null

  return {
    x1: xScale.value(min),
    y1: yScale.value(min),
    x2: xScale.value(max),
    y2: yScale.value(max),
  }
})

function rankOf(row) {
  return cleanRows.value
    .slice()
    .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label))
    .findIndex((candidate) => String(candidate.id) === String(row.id)) + 1
}

function pointFill(group) {
  if (group.selected || group.hovered) return '#0f766e'
  if (group.topRanked) return '#0284c7'
  return '#38bdf8'
}

function pointOpacity(group) {
  if (!activeHighlight.value) return group.topRanked ? 0.78 : 0.62
  if (group.selected || group.hovered) return 1
  return 0.28
}

function pointStroke(group) {
  return group.selected || group.hovered ? '#0f172a' : '#ffffff'
}

function pointStrokeWidth(group) {
  return group.selected || group.hovered ? 2.4 : 1.7
}

function groupAria(group) {
  if (group.artists.length === 1) {
    const row = group.artists[0]
    return `${row.label}. Creative links ${row.collaborations}, release links ${row.releases}, total degree ${row.degree}.`
  }

  return `${group.artists.length} artists share creative links ${group.collaborations} and release links ${group.releases}.`
}

function showTooltip(event, group) {
  const tooltipWidth = 235
  const tooltipHeight = 150
  const x = Math.min(event.clientX + 14, window.innerWidth - tooltipWidth)
  const y = Math.min(event.clientY + 14, window.innerHeight - tooltipHeight)
  tooltip.value = { visible: true, x: Math.max(8, x), y: Math.max(8, y), group }
}

function hideTooltip() {
  tooltip.value = { visible: false, x: 0, y: 0, group: null }
}

function hoverGroup(group) {
  hoveredId.value = group.artists[0]?.id ?? ''
}

function clearHover() {
  hoveredId.value = ''
  hideTooltip()
}

function selectArtist(row) {
  emit('select', row)
}

function selectGroup(group) {
  if (group.artists.length) selectArtist(group.artists[0])
}

function formatNumber(value) {
  return Number(value).toLocaleString()
}
</script>

<template>
  <article class="va-card dashboard-chart-card connectivity-card">
    <div class="dashboard-panel-title">
      <h2>Artist connectivity</h2>
      <p>Creative links versus releases; bubble size is total degree.</p>
    </div>

    <LearningHint
      :learning-mode="learningMode"
      purpose="Compares artists by creative activity and release activity."
      use="Find artists with balanced or unusually strong connectivity."
      interaction="Search, hover a bubble, or select an artist from the top ten list."
      reading="Position shows creative and release links; bubble size shows total degree."
    />

    <div v-if="cleanRows.length" class="connectivity-layout">
      <svg
        class="connectivity-plot"
        :viewBox="`0 0 ${width} ${height}`"
        role="img"
        aria-labelledby="artist-connectivity-title artist-connectivity-desc"
        @mouseleave="clearHover"
      >
        <title id="artist-connectivity-title">Artist connectivity scatterplot</title>
        <desc id="artist-connectivity-desc">
          Artists are positioned by creative links on the horizontal axis and release links on the vertical axis.
          Bubble size encodes total degree. Exact overlaps are grouped and shown with a count badge.
        </desc>

        <g>
          <line
            v-for="tick in yTicks"
            :key="`grid-${tick}`"
            :x1="margin.left"
            :x2="width - margin.right"
            :y1="yScale(tick)"
            :y2="yScale(tick)"
            stroke="#e2e8f0"
          />
          <line
            v-if="diagonalLine"
            :x1="diagonalLine.x1"
            :y1="diagonalLine.y1"
            :x2="diagonalLine.x2"
            :y2="diagonalLine.y2"
            stroke="#94a3b8"
            stroke-dasharray="3 3"
            opacity="0.75"
          />
          <text
            v-if="diagonalLine"
            :x="diagonalLine.x2 - 4"
            :y="diagonalLine.y2 - 4"
            text-anchor="end"
            class="fill-slate-500 text-[6px]"
          >
            Balanced connectivity
          </text>
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

        <g v-if="hoveredId || selectedId" class="pointer-events-none">
          <template v-for="group in groups" :key="`guide-${group.key}`">
            <g v-if="group.hovered || group.selected">
              <line
                :x1="group.x"
                :x2="group.x"
                :y1="margin.top"
                :y2="height - margin.bottom"
                stroke="#0f766e"
                stroke-dasharray="2 3"
                opacity="0.35"
              />
              <line
                :x1="margin.left"
                :x2="width - margin.right"
                :y1="group.y"
                :y2="group.y"
                stroke="#0f766e"
                stroke-dasharray="2 3"
                opacity="0.35"
              />
            </g>
          </template>
        </g>

        <g>
          <g
            v-for="group in groups"
            :key="group.key"
            class="connectivity-point"
            tabindex="0"
            role="button"
            :aria-label="groupAria(group)"
            @mouseenter="(event) => { hoverGroup(group); showTooltip(event, group) }"
            @mousemove="(event) => showTooltip(event, group)"
            @mouseleave="clearHover"
            @focus="hoverGroup(group)"
            @blur="clearHover"
            @click.stop="selectGroup(group)"
            @keydown.enter.prevent="selectGroup(group)"
            @keydown.space.prevent="selectGroup(group)"
          >
            <circle
              :cx="group.x"
              :cy="group.y"
              :r="group.radius"
              :fill="pointFill(group)"
              :opacity="pointOpacity(group)"
              :stroke="pointStroke(group)"
              :stroke-width="pointStrokeWidth(group)"
            />
            <text
              v-if="group.artists.length > 1"
              :x="group.x"
              :y="group.y + 2.4"
              text-anchor="middle"
              class="pointer-events-none fill-white text-[6px] font-bold"
            >
              {{ group.artists.length }}
            </text>
          </g>
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

      <aside class="connectivity-panel" aria-label="Top connected artists">
        <label class="connectivity-search">
          <span>Find artist</span>
          <input v-model="searchTerm" type="search" placeholder="Type a name" />
        </label>

        <div class="connectivity-panel-head">
          <strong>{{ searchTerm ? 'Matching artists' : 'Top connected artists' }}</strong>
          <span>Total</span>
        </div>

        <button
          v-for="(row, index) in panelRows"
          :key="row.id"
          type="button"
          class="connectivity-row"
          :class="{ 'is-active': String(row.id) === String(selectedId), 'is-hovered': String(row.id) === String(hoveredId) }"
          @mouseenter="hoveredId = row.id"
          @mouseleave="hoveredId = ''"
          @focus="hoveredId = row.id"
          @blur="hoveredId = ''"
          @click="selectArtist(row)"
        >
          <span class="connectivity-rank">{{ searchTerm ? rankOf(row) : index + 1 }}</span>
          <span class="connectivity-name">{{ row.label }}</span>
          <span class="connectivity-values">Creative {{ row.collaborations }} | Release {{ row.releases }}</span>
          <strong>{{ row.degree }}</strong>
        </button>

        <p v-if="!panelRows.length" class="connectivity-empty">No artist matches this search.</p>
      </aside>
    </div>

    <div v-else class="dashboard-empty">No artist has enough connectivity data for this scatterplot.</div>

    <div
      v-if="tooltip.visible && tooltip.group"
      class="connectivity-tooltip"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      <template v-if="tooltip.group.artists.length === 1">
        <strong>Artist: {{ tooltip.group.artists[0].label }}</strong>
        <span>Creative links: {{ formatNumber(tooltip.group.artists[0].collaborations) }}</span>
        <span>Release links: {{ formatNumber(tooltip.group.artists[0].releases) }}</span>
        <span>Total degree: {{ formatNumber(tooltip.group.artists[0].degree) }}</span>
        <span>Connectivity rank: {{ rankOf(tooltip.group.artists[0]) }}</span>
      </template>
      <template v-else>
        <strong>Shared coordinate</strong>
        <span>Creative links: {{ formatNumber(tooltip.group.collaborations) }}</span>
        <span>Release links: {{ formatNumber(tooltip.group.releases) }}</span>
        <span>Artists at this coordinate: {{ tooltip.group.artists.length }}</span>
        <span
          v-for="artist in tooltip.group.artists.slice(0, 5)"
          :key="artist.id"
          class="connectivity-tooltip-artist"
        >
          {{ artist.label }} · degree {{ artist.degree }}
        </span>
      </template>
    </div>
  </article>
</template>

<style scoped>
.connectivity-card {
  position: relative;
}

.connectivity-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 245px;
  gap: 0.6rem;
  align-items: stretch;
  margin-top: 0.25rem;
}

.connectivity-plot {
  width: 100%;
  min-width: 0;
  height: auto;
}

.connectivity-point {
  cursor: pointer;
  outline: none;
}

.connectivity-point:focus circle {
  stroke: #0f172a;
  stroke-width: 2.5;
}

.connectivity-panel {
  display: grid;
  align-content: start;
  gap: 0.35rem;
  border-left: 1px solid #e2e8f0;
  padding-left: 0.6rem;
}

.connectivity-search {
  display: grid;
  gap: 0.2rem;
  color: #475569;
  font-size: 0.66rem;
  font-weight: 600;
}

.connectivity-search input {
  height: 1.55rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.25rem;
  padding: 0 0.45rem;
  font-size: 0.7rem;
  outline: none;
}

.connectivity-search input:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.12);
}

.connectivity-panel-head,
.connectivity-row {
  display: grid;
  grid-template-columns: 1.2rem minmax(0, 1fr) 2.3rem;
  gap: 0.25rem;
  align-items: center;
}

.connectivity-panel-head {
  color: #64748b;
  font-size: 0.62rem;
}

.connectivity-panel-head strong {
  grid-column: 1 / 3;
  color: #334155;
}

.connectivity-row {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  background: #f8fafc;
  padding: 0.28rem;
  text-align: left;
  color: #0f172a;
  font-size: 0.68rem;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    opacity 160ms ease;
}

.connectivity-row:hover,
.connectivity-row:focus,
.connectivity-row.is-hovered {
  border-color: #38bdf8;
  background: #eff6ff;
  outline: none;
}

.connectivity-row.is-active {
  border-color: #0f766e;
  background: #ecfdf5;
}

.connectivity-rank {
  color: #64748b;
  font-weight: 700;
}

.connectivity-name {
  white-space: normal;
  line-height: 1.12;
  overflow-wrap: anywhere;
}

.connectivity-values {
  grid-column: 2 / 3;
  color: #64748b;
  font-size: 0.58rem;
  white-space: normal;
}

.connectivity-row strong {
  grid-column: 3;
  grid-row: 1 / span 2;
}

.connectivity-row strong {
  text-align: right;
  color: #0f766e;
  font-variant-numeric: tabular-nums;
}

.connectivity-empty {
  border-radius: 0.25rem;
  background: #f8fafc;
  padding: 0.45rem;
  color: #64748b;
  font-size: 0.7rem;
}

.connectivity-tooltip {
  position: fixed;
  z-index: 60;
  display: grid;
  gap: 0.18rem;
  max-width: 235px;
  border: 1px solid #cbd5e1;
  border-radius: 0.35rem;
  background: #ffffff;
  padding: 0.55rem 0.65rem;
  color: #334155;
  font-size: 0.72rem;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
  pointer-events: none;
}

.connectivity-tooltip strong {
  color: #0f172a;
}

.connectivity-tooltip-artist {
  border-top: 1px solid #e2e8f0;
  padding-top: 0.15rem;
}

@media (max-width: 980px) {
  .connectivity-layout {
    grid-template-columns: 1fr;
  }

  .connectivity-panel {
    border-left: 0;
    border-top: 1px solid #e2e8f0;
    padding-left: 0;
    padding-top: 0.5rem;
  }
}
</style>
