<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ArtistComparison from './ArtistComparison.vue'
import ArtistBubbleChart from './ArtistBubbleChart.vue'
import BarChart from './BarChart.vue'
import ColumnChart from './ColumnChart.vue'
import DonutChart from './DonutChart.vue'
import EgoNetwork from './EgoNetwork.vue'
import EvidenceTable from './EvidenceTable.vue'
import FilterPanel from './FilterPanel.vue'
import HistogramChart from './HistogramChart.vue'
import LollipopChart from './LollipopChart.vue'
import RankedBarChart from './RankedBarChart.vue'
import StackedGenreChart from './StackedGenreChart.vue'
import SummaryCards from './SummaryCards.vue'
import TimelineChart from './TimelineChart.vue'
import { loadGraph } from '../data/graphLoader'
import { findSailorShift, normalizeGraph } from '../data/graphTransforms'
import { computeArtistMetrics, computeOverview } from '../data/metrics'
import { computeRisingStarScores } from '../data/scoring'

defineOptions({
  name: 'OceanusDashboard',
})

const loading = ref(true)
const error = ref('')
const graph = ref(null)
const selectedNode = ref(null)
const comparisonArtistIds = ref([])
const showInsightPreview = ref(false)
const copyFeedback = ref('')
const networkSettings = ref({
  depth: '2',
  relationshipFocus: 'all',
  nodeLimit: 50,
})
const isPlaying = ref(false)
const playbackSpeed = ref(900)
let playbackTimer = null

// These are the global filters. When one of these values changes, the main
// computed graph below updates, and all linked charts receive the new subset.
const filters = ref({
  nodeType: '',
  edgeType: '',
  genre: '',
  startYear: '',
  endYear: '',
})

const sailorShift = computed(() => (graph.value ? findSailorShift(graph.value.nodes) : null))

const fullOverview = computed(() => (graph.value ? computeOverview(graph.value) : null))

// This is the main "linked displays" step:
// 1. keep only nodes allowed by the filters,
// 2. keep only links whose source and target nodes are still visible,
// 3. return a smaller graph that every widget can summarize.
const filteredGraph = computed(() => {
  if (!graph.value) return null
  return buildFilteredGraph(graph.value)
})

const overview = computed(() => (filteredGraph.value ? computeOverview(filteredGraph.value) : null))
const timelineGraph = computed(() => (graph.value ? buildFilteredGraph(graph.value, { ignoreTime: true }) : null))
const timelineOverview = computed(() => (timelineGraph.value ? computeOverview(timelineGraph.value) : null))
const risingStars = computed(() => (filteredGraph.value ? computeRisingStarScores(filteredGraph.value).slice(0, 12) : []))
const comparisonArtists = computed(() =>
  filteredGraph.value && comparisonArtistIds.value.length
    ? computeArtistMetrics(filteredGraph.value, comparisonArtistIds.value)
    : [],
)
const artistOptions = computed(() => fullOverview.value?.topArtists.slice(0, 60) ?? [])
const visibleGenreRows = computed(() => overview.value?.knownGenres ?? [])
const artistConnectivityRows = computed(() => {
  if (!filteredGraph.value || !overview.value) return []
  const ids = overview.value.topArtists.slice(0, 12).map((artist) => artist.id)
  return computeArtistMetrics(filteredGraph.value, ids).map((row) => ({
    ...row.artist,
    degree: row.degree,
    collaborations: row.collaborations,
    releases: row.releases,
  }))
})

const risingStarRows = computed(() =>
  risingStars.value.map((row) => ({
    id: row.artist.id,
    label: row.artist.label,
    value: row.score,
    entity: row.artist,
  })),
)

const topEntityRows = computed(() =>
  (overview.value?.topEntities ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    value: row.degree,
    entity: row,
  })),
)

const degreeDistribution = computed(() => {
  const bins = [
    { label: '0', min: 0, max: 0, value: 0 },
    { label: '1-2', min: 1, max: 2, value: 0 },
    { label: '3-5', min: 3, max: 5, value: 0 },
    { label: '6-10', min: 6, max: 10, value: 0 },
    { label: '11-20', min: 11, max: 20, value: 0 },
    { label: '21-50', min: 21, max: 50, value: 0 },
    { label: '51+', min: 51, max: Infinity, value: 0 },
  ]

  for (const degree of overview.value?.degreeById.values() ?? []) {
    const bin = bins.find((row) => degree.degree >= row.min && degree.degree <= row.max)
    if (bin) bin.value += 1
  }

  return bins
})

const evidenceRows = computed(() => {
  const total = overview.value?.totalLinks ?? 0
  return (overview.value?.edgeTypes ?? []).slice(0, 5).map((row) => ({
    ...row,
    share: total ? `${((row.value / total) * 100).toFixed(1)}%` : '0%',
  }))
})

const hasGlobalFilters = computed(() =>
  Boolean(filters.value.nodeType || filters.value.edgeType || filters.value.genre || filters.value.startYear || filters.value.endYear),
)

const activeFilterCount = computed(() =>
  [filters.value.nodeType, filters.value.edgeType, filters.value.genre, filters.value.startYear || filters.value.endYear].filter(Boolean).length,
)

const availableYears = computed(() => {
  if (!fullOverview.value) return []
  return fullOverview.value.timeline.map((row) => row.year)
})

// Report-ready insight sections used by the Copy Insight preview.
const structuredInsight = computed(() => {
  if (!overview.value || !selectedNode.value) return []
  const topGenre = overview.value.genres[0]?.label ?? 'Unknown'
  const topEdge = overview.value.edgeTypes[0]?.label ?? 'Unknown'
  const unknownGenreCount = overview.value.allGenres?.find((row) => row.label === 'Unknown')?.value ?? 0
  const filterText = activeFilterText.value
  return [
    { title: 'Current focus', body: `${selectedNode.value.label} (${selectedNode.value.nodeType}) is the selected entity.` },
    { title: 'Active filters', body: filterText },
    { title: 'Main pattern', body: `The visible graph is dominated by ${topEdge} relationships and ${topGenre} genre values.` },
    {
      title: 'Unexpected finding',
      body:
        unknownGenreCount > 0
          ? `${unknownGenreCount.toLocaleString()} visible entities have unknown genre metadata.`
          : 'No unknown genre values dominate the current visible subset.',
    },
    {
      title: 'Possible hypothesis',
      body: `${selectedNode.value.label} can be investigated through ${topEdge} links to understand whether the current pattern is creative, influence-based, or metadata-driven.`,
    },
    {
      title: 'Data limitation',
      body: 'Missing genre and year fields may affect interpretation; the dashboard keeps these values visible instead of inventing data.',
    },
    {
      title: 'Suggested next action',
      body: hasGlobalFilters.value
        ? 'Compare the filtered subset with all relationships or expand the year range.'
        : 'Click a genre, year, relationship type, or rising-star candidate to start a focused analytical path.',
    },
  ]
})

const activeFilterText = computed(() => {
  const active = []
  if (filters.value.nodeType) active.push(`entity type = ${filters.value.nodeType}`)
  if (filters.value.edgeType) active.push(`relationship type = ${filters.value.edgeType}`)
  if (filters.value.genre) active.push(`genre = ${filters.value.genre}`)
  if (filters.value.startYear || filters.value.endYear) {
    active.push(`time = ${filters.value.startYear || 'first'} to ${filters.value.endYear || 'last'}`)
  }

  return active.length ? active.join('; ') : 'none'
})

const insightCopyText = computed(() => {
  if (!overview.value || !selectedNode.value) return ''

  return [
    'Oceanus Folk dashboard insight',
    ...structuredInsight.value.map((section) => `${section.title}: ${section.body}`),
  ].join('\n')
})

onMounted(async () => {
  try {
    // Startup sequence: load JSON, normalize messy fields, compute first metrics,
    // then start the dashboard centered on Sailor Shift.
    const rawGraph = await loadGraph()
    const normalizedGraph = normalizeGraph(rawGraph)
    const initialOverview = computeOverview(normalizedGraph)
    normalizedGraph.degreeById = initialOverview.degreeById
    graph.value = normalizedGraph
    selectedNode.value = findSailorShift(normalizedGraph.nodes)
    comparisonArtistIds.value = [
      selectedNode.value?.id,
      ...initialOverview.topArtists.filter((artist) => artist.id !== selectedNode.value?.id).slice(0, 2).map((artist) => artist.id),
    ].filter((id) => id !== undefined)
  } catch (caughtError) {
    error.value = caughtError.message
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  pausePlayback()
})

function selectNode(node) {
  if (selectedNode.value?.id === node.id && sailorShift.value) {
    selectedNode.value = sailorShift.value
    return
  }
  selectedNode.value = node

  if (node.nodeType === 'Person' && !comparisonArtistIds.value.includes(node.id)) {
    comparisonArtistIds.value = [comparisonArtistIds.value[0], node.id, comparisonArtistIds.value[2]].filter(Boolean)
  }
}

// Reset means: remove all global filters and put the ego network back on Sailor Shift.
function resetSelection() {
  filters.value = {
    nodeType: '',
    edgeType: '',
    genre: '',
    startYear: '',
    endYear: '',
  }
  selectedNode.value = sailorShift.value
}

function updateFilters(nextFilters) {
  filters.value = nextFilters
}

function selectYear(year) {
  const yearText = String(year)
  if (filters.value.startYear === yearText && filters.value.endYear === yearText) {
    filters.value = {
      ...filters.value,
      startYear: '',
      endYear: '',
    }
    return
  }

  filters.value = {
    ...filters.value,
    startYear: yearText,
    endYear: yearText,
  }
}

function setFilter(key, value) {
  const wasActive = filters.value[key] === value
  filters.value = {
    ...filters.value,
    [key]: wasActive ? '' : value,
  }
}

function buildFilteredGraph(sourceGraph, options = {}) {
  const baseNodes = sourceGraph.nodes.filter((node) => {
    if (filters.value.nodeType && node.nodeType !== filters.value.nodeType) return false
    if (!options.ignoreTime && !inYearRange(node.year)) return false
    return true
  })
  const baseIds = new Set(baseNodes.map((node) => node.id))
  let genreContextIds = null

  // Genre means "show this genre and its direct graph context".
  // This keeps connected artists visible even when their own genre field is unknown.
  if (filters.value.genre) {
    const genreSeedIds = new Set(
      baseNodes
        .filter((node) => node.genre === filters.value.genre || node.label === filters.value.genre)
        .map((node) => node.id),
    )
    genreContextIds = new Set(genreSeedIds)
    for (const link of sourceGraph.links) {
      if (genreSeedIds.has(link.source) || genreSeedIds.has(link.target)) {
        genreContextIds.add(link.source)
        genreContextIds.add(link.target)
      }
    }
  }

  const visibleNodes = genreContextIds
    ? sourceGraph.nodes.filter(
        (node) =>
          genreContextIds.has(node.id) &&
          (options.ignoreTime || inYearRange(node.year)) &&
          (!filters.value.nodeType || baseIds.has(node.id)),
      )
    : baseNodes
  const visibleIds = new Set(visibleNodes.map((node) => node.id))
  const visibleLinks = sourceGraph.links.filter((link) => {
    if (!visibleIds.has(link.source) || !visibleIds.has(link.target)) return false
    if (filters.value.edgeType && link.edgeType !== filters.value.edgeType) return false
    if (!options.ignoreTime && !inYearRange(link.year ?? link.sourceNode?.year ?? link.targetNode?.year)) return false
    return true
  })

  return {
    ...sourceGraph,
    nodes: visibleNodes,
    links: visibleLinks,
  }
}

// Missing years are kept visible. If a node or edge has no year, it is not
// removed by the time filter because the dataset is incomplete.
function inYearRange(year) {
  const start = Number(filters.value.startYear)
  const end = Number(filters.value.endYear)
  if (!year) return true
  if (start && year < start) return false
  if (end && year > end) return false
  return true
}

async function copyInsight() {
  if (!insightCopyText.value || !navigator.clipboard) return
  await navigator.clipboard.writeText(insightCopyText.value)
  copyFeedback.value = 'Copied'
  window.setTimeout(() => {
    copyFeedback.value = ''
  }, 1600)
}

function updateComparisonArtists(nextIds) {
  comparisonArtistIds.value = nextIds
}

function updateNetworkSettings(nextSettings) {
  networkSettings.value = nextSettings
}

function pausePlayback() {
  isPlaying.value = false
  if (playbackTimer) {
    window.clearInterval(playbackTimer)
    playbackTimer = null
  }
}

function playTimeline() {
  pausePlayback()
  isPlaying.value = true
  playbackTimer = window.setInterval(() => {
    stepYear(1)
  }, playbackSpeed.value)
}

function stepYear(direction) {
  const years = availableYears.value
  if (!years.length) return
  const current = Number(filters.value.startYear || years[0])
  const index = Math.max(0, years.indexOf(current))
  const nextIndex = Math.min(years.length - 1, Math.max(0, index + direction))
  if (nextIndex === years.length - 1 && direction > 0) pausePlayback()
  selectYear(years[nextIndex])
}

function resetYear() {
  filters.value = { ...filters.value, startYear: '', endYear: '' }
  pausePlayback()
}

function selectRankedEntity(row) {
  if (row.entity) selectNode(row.entity)
}

function selectRisingStar(row) {
  if (row.entity) selectNode(row.entity)
}

</script>

<template>
  <section class="dashboard-report">
    <header class="dashboard-header">
      <div>
        <p class="text-xs font-semibold text-teal-700">VAST 2025 - Mini Challenge 1</p>
        <h1>The Rise of Oceanus Folk</h1>
        <p>Influence, genre evolution, and rising-star hypotheses in a music knowledge graph.</p>
      </div>
      <div class="dashboard-header-metrics">
        <span>Selected: {{ selectedNode?.label ?? 'None' }}</span>
        <span>{{ overview?.totalNodes?.toLocaleString?.() ?? '-' }} nodes</span>
        <span>{{ overview?.totalLinks?.toLocaleString?.() ?? '-' }} links</span>
        <span>{{ activeFilterCount }} filters</span>
      </div>
      <div class="dashboard-header-actions">
        <button class="va-button-secondary" type="button" @click="showInsightPreview = !showInsightPreview">
          {{ showInsightPreview ? 'Close insight' : 'View insight' }}
        </button>
        <button class="va-button-primary" type="button" @click="resetSelection">Reset filters</button>
      </div>
    </header>

    <div v-if="loading" class="va-card va-card-pad text-sm text-slate-600">Loading the MC1 knowledge graph...</div>
    <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">{{ error }}</div>

    <main v-else class="dashboard-canvas">
      <FilterPanel
        :filters="filters"
        :node-types="fullOverview.nodeTypes"
        :edge-types="fullOverview.edgeTypes"
        :genres="fullOverview.allGenres"
        :years="availableYears"
        report-strip
        @update:filters="updateFilters"
        @reset="resetSelection"
      />

      <section class="dashboard-board">
        <SummaryCards class="dashboard-kpi-row" :overview="overview" />

        <EgoNetwork
          class="dashboard-network-panel"
          :graph="graph"
          :center-node="selectedNode"
          :filters="filters"
          :network-settings="networkSettings"
          @select="selectNode"
          @select-edge="setFilter('edgeType', $event)"
          @update-network-settings="updateNetworkSettings"
        />

        <BarChart
          class="dashboard-genre-panel"
          title="Genre contribution"
          subtitle="Select a bar to cross-filter the report."
          :data="visibleGenreRows"
          :limit="7"
          :selected="filters.genre"
          @select="setFilter('genre', $event)"
        />

        <ColumnChart
          class="dashboard-relationship-panel"
          title="Relationship types"
          subtitle="Top link categories."
          :data="overview.edgeTypes"
          :limit="6"
          :selected="filters.edgeType"
          @select="setFilter('edgeType', $event)"
        />

        <DonutChart
          class="dashboard-entity-panel"
          title="Entity composition"
          subtitle="Share of visible entity types."
          :data="overview.nodeTypes"
          :limit="5"
          :selected="filters.nodeType"
          @select="setFilter('nodeType', $event)"
        />

        <TimelineChart
          class="dashboard-timeline-panel"
          :data="timelineOverview.timeline"
          :selected-year="filters.startYear === filters.endYear ? filters.startYear : ''"
          :is-playing="isPlaying"
          :playback-speed="playbackSpeed"
          @select-year="selectYear"
          @play="playTimeline"
          @pause="pausePlayback"
          @step-back="stepYear(-1)"
          @step-forward="stepYear(1)"
          @reset-year="resetYear"
          @update-speed="playbackSpeed = $event"
        />

        <RankedBarChart
          class="dashboard-rising-panel"
          title="Rising-star hypotheses"
          subtitle="Transparent heuristic score."
          :rows="risingStarRows"
          :limit="6"
          :selected-id="selectedNode?.id"
          :value-formatter="(value) => value.toFixed(1)"
          color="#d97706"
          @select="selectRisingStar"
        />

        <ArtistComparison
          class="dashboard-comparison-panel"
          :artists="comparisonArtists"
          :options="artistOptions"
          :selected-ids="comparisonArtistIds"
          @update-artists="updateComparisonArtists"
          @select="selectNode"
        />

        <LollipopChart
          class="dashboard-centrality-panel"
          title="Most connected entities"
          subtitle="Degree centrality in the current view."
          :rows="topEntityRows"
          :limit="7"
          :selected-id="selectedNode?.id"
          @select="selectRankedEntity"
        />

        <StackedGenreChart
          class="dashboard-oceanus-panel"
          :rows="overview.oceanusGenres"
          :selected="filters.genre"
          @select="setFilter('genre', $event)"
        />

        <ArtistBubbleChart
          class="dashboard-artists-panel"
          :rows="artistConnectivityRows"
          :selected-id="selectedNode?.id"
          @select="selectNode"
        />

        <HistogramChart
          class="dashboard-degree-panel"
          title="Degree distribution"
          subtitle="Connectivity spread across entities."
          :rows="degreeDistribution"
        />

        <EvidenceTable class="dashboard-evidence-panel" :rows="evidenceRows" />
      </section>
    </main>

    <div v-if="showInsightPreview" class="insight-overlay">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-slate-950">Filtered analytical note</h2>
        <button class="text-xs font-semibold text-slate-500" type="button" @click="showInsightPreview = false">Close</button>
      </div>
      <div class="mt-3 space-y-3">
        <section v-for="section in structuredInsight" :key="section.title">
          <p class="text-xs font-semibold text-slate-900">{{ section.title }}</p>
          <p class="mt-0.5 text-xs leading-5 text-slate-600">{{ section.body }}</p>
        </section>
      </div>
      <button class="va-button-primary mt-4 w-full" type="button" @click="copyInsight">{{ copyFeedback || 'Copy note' }}</button>
    </div>
  </section>
</template>
