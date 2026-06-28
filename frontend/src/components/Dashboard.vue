<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ArtistComparison from './ArtistComparison.vue'
import ArtistBubbleChart from './ArtistBubbleChart.vue'
import BarChart from './BarChart.vue'
import ColumnChart from './ColumnChart.vue'
import DonutChart from './DonutChart.vue'
import EgoNetwork from './EgoNetwork.vue'
import EvidenceTable from './EvidenceTable.vue'
import FilterPanel from './FilterPanel.vue'
import HistogramChart from './HistogramChart.vue'
import LearningHint from './LearningHint.vue'
import LollipopChart from './LollipopChart.vue'
import RankedBarChart from './RankedBarChart.vue'
import StackedGenreChart from './StackedGenreChart.vue'
import SummaryCards from './SummaryCards.vue'
import TimelineChart from './TimelineChart.vue'
import { loadGraph } from '../data/graphLoader'
import { findSailorShift, getEndpointId, normalizeGraph } from '../data/graphTransforms'
import { computeArtistMetrics, computeDegrees, computeOverview, getEgoNetwork, isCollaborationEdge } from '../data/metrics'
import { computeRisingStarScores } from '../data/scoring'

defineOptions({
  name: 'OceanusDashboard',
})

const loading = ref(true)
const error = ref('')
const graph = ref(null)
const selectedNode = ref(null)
const comparisonArtistIds = ref([])
const dashboardMessage = ref('')
const relationshipChartMode = ref('compare')
const learningMode = ref(false)
const networkSettings = ref({
  depth: '2',
  relationshipFocus: 'all',
  nodeLimit: 50,
})
const isPlaying = ref(false)
const playbackSpeed = ref(900)
const manualYearRangeBeforePlayback = ref(null)
let playbackTimer = null

// These are the global filters. When one of these values changes, the main
// computed graph below updates, and all linked charts receive the new subset.
const filters = ref({
  nodeType: '',
  edgeType: '',
  genre: '',
  startYear: '',
  endYear: '',
  degreeRange: null,
})

const sailorShift = computed(() => (graph.value ? findSailorShift(graph.value.nodes) : null))
const networkCenter = computed(() => selectedNode.value ?? sailorShift.value)

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

const sailorProfile = computed(() => {
  if (!graph.value || !sailorShift.value) return null

  const [metrics] = computeArtistMetrics(graph.value, [sailorShift.value.id])
  const egoOne = getEgoNetwork(graph.value, sailorShift.value.id, 1)
  const egoTwo = getEgoNetwork(graph.value, sailorShift.value.id, 2)
  const directPeople = new Set()
  const indirectPeople = new Set()
  const years = new Set()

  for (const node of egoTwo.nodes) {
    if (node.year) years.add(node.year)
  }

  for (const link of egoOne.links) {
    const other = link.source === sailorShift.value.id ? link.targetNode : link.sourceNode
    if (isCollaborationEdge(link) && other?.nodeType === 'Person') {
      directPeople.add(other.id)
    }
    if (link.year) years.add(link.year)
  }

  for (const node of egoTwo.nodes) {
    if (node.nodeType === 'Person' && node.id !== sailorShift.value.id && !directPeople.has(node.id)) {
      indirectPeople.add(node.id)
    }
  }

  const sortedYears = Array.from(years).filter(Boolean).sort((a, b) => a - b)

  return {
    careerSpan: sortedYears.length ? `${sortedYears[0]}-${sortedYears[sortedYears.length - 1]}` : 'Unknown',
    oceanusLinks: metrics?.oceanusLinks ?? 0,
    influenceReceived: metrics?.influenceReceived ?? 0,
    influenceGiven: metrics?.influenceGiven ?? 0,
    creativeLinks: metrics?.collaborations ?? 0,
    directCollaborations: directPeople.size,
    indirectCollaborations: indirectPeople.size,
    genreDiversity: metrics?.genreDiversity ?? 0,
  }
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

const activeDegreeLabel = computed(() => filters.value.degreeRange?.label ?? '')

const evidenceRows = computed(() => {
  const total = overview.value?.totalLinks ?? 0
  return relationshipRows.value.slice(0, 5).map((row) => ({
    ...row,
    share: total ? `${((row.value / total) * 100).toFixed(1)}%` : '0%',
  }))
})

const selectedRelationshipProfile = computed(() => {
  const selectedId = selectedNode.value?.id
  const links = filteredGraph.value?.links ?? []
  const counts = new Map()
  let total = 0

  if (!selectedId) return { total, counts }

  for (const link of links) {
    const sourceId = getEndpointId(link.source)
    const targetId = getEndpointId(link.target)
    const sourceMatches = String(sourceId) === String(selectedId)
    const targetMatches = String(targetId) === String(selectedId)
    if (!sourceMatches && !targetMatches) continue

    const type = link.edgeType ?? link.relationshipType ?? link.type ?? link.relation ?? 'Unknown'
    if (!counts.has(type)) counts.set(type, { value: 0, incoming: 0, outgoing: 0 })
    const row = counts.get(type)
    row.value += 1
    total += 1

    // A self-link is one direct link. Count it once for direction reporting.
    if (sourceMatches && targetMatches) row.incoming += 1
    else if (targetMatches) row.incoming += 1
    else if (sourceMatches) row.outgoing += 1
  }

  return { total, counts }
})

const relationshipRows = computed(() => {
  const selectedCounts = selectedRelationshipProfile.value.counts
  const graphRows = overview.value?.edgeTypes ?? []
  const byLabel = new Map(graphRows.map((row) => [row.label, { ...row }]))

  for (const [label, selected] of selectedCounts) {
    if (!byLabel.has(label)) byLabel.set(label, { label, value: 0 })
    Object.assign(byLabel.get(label), {
      selectedValue: selected.value,
      selectedIncoming: selected.incoming,
      selectedOutgoing: selected.outgoing,
    })
  }

  return Array.from(byLabel.values())
    .map((row) => {
      const selected = selectedCounts.get(row.label)
      return {
        ...row,
        selectedValue: selected?.value ?? 0,
        selectedIncoming: selected?.incoming ?? 0,
        selectedOutgoing: selected?.outgoing ?? 0,
        selectedShare: selectedRelationshipProfile.value.total
          ? ((selected?.value ?? 0) / selectedRelationshipProfile.value.total) * 100
          : 0,
        graphShare: overview.value?.totalLinks ? (row.value / overview.value.totalLinks) * 100 : 0,
      }
    })
    .sort((a, b) => b.value - a.value || b.selectedValue - a.selectedValue || a.label.localeCompare(b.label))
})

const hasGlobalFilters = computed(() =>
  Boolean(
    filters.value.nodeType ||
      filters.value.edgeType ||
      filters.value.genre ||
      filters.value.startYear ||
      filters.value.endYear ||
      filters.value.degreeRange,
  ),
)

const activeFilterCount = computed(() =>
  [
    filters.value.nodeType,
    filters.value.edgeType,
    filters.value.genre,
    filters.value.startYear || filters.value.endYear,
    filters.value.degreeRange,
  ].filter(Boolean).length,
)

const activeFilterChips = computed(() => {
  const chips = []
  if (filters.value.nodeType) chips.push({ key: 'nodeType', label: `Entity focus: ${filters.value.nodeType}` })
  if (filters.value.edgeType) chips.push({ key: 'edgeType', label: `Relationship: ${filters.value.edgeType}` })
  if (filters.value.genre) chips.push({ key: 'genre', label: `Genre: ${filters.value.genre}` })
  if (filters.value.startYear || filters.value.endYear) {
    chips.push({
      key: 'years',
      label: `Years: ${filters.value.startYear || 'first'}-${filters.value.endYear || 'last'}`,
    })
  }
  if (filters.value.degreeRange) chips.push({ key: 'degreeRange', label: `Degree: ${filters.value.degreeRange.label}` })
  return chips
})

const availableYears = computed(() => {
  if (!fullOverview.value) return []
  return fullOverview.value.timeline.map((row) => row.year)
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
    const defaultCenter = findSailorShift(normalizedGraph.nodes)
    selectedNode.value = defaultCenter ?? null
    comparisonArtistIds.value = [
      defaultCenter?.id,
      ...initialOverview.topArtists.filter((artist) => artist.id !== defaultCenter?.id).slice(0, 2).map((artist) => artist.id),
    ].filter((id) => id !== undefined)
  } catch (caughtError) {
    error.value = caughtError.message
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  pausePlayback(false)
})

watch(filteredGraph, (nextGraph) => {
  if (!nextGraph) return
  validateSelection(nextGraph)
  validateComparisonArtists(nextGraph)
})

watch(selectedNode, (node) => {
  if (!node && relationshipChartMode.value === 'selected-only') {
    relationshipChartMode.value = 'compare'
  }
})

function selectNode(node) {
  if (selectedNode.value?.id === node.id) {
    clearEntitySelection()
    return
  }
  selectedNode.value = node
  dashboardMessage.value = `${node.label} is selected. Global filters stay unchanged.`

  if (node.nodeType === 'Person' && !comparisonArtistIds.value.includes(node.id)) {
    comparisonArtistIds.value = [comparisonArtistIds.value[0], node.id, comparisonArtistIds.value[2]].filter(Boolean)
  }
}

function clearEntitySelection() {
  selectedNode.value = null
  relationshipChartMode.value = 'compare'
  dashboardMessage.value = 'Entity selection cleared. The relationship chart returned to the graph-level view.'
}

// Clear filters removes only persistent global filters. Entity selection and comparison state are preserved.
function clearGlobalFilters() {
  filters.value = {
    nodeType: '',
    edgeType: '',
    genre: '',
    startYear: '',
    endYear: '',
    degreeRange: null,
  }
  dashboardMessage.value = 'Global filters cleared. Entity selection and comparison artists were preserved.'
}

function resetDashboard() {
  pausePlayback(false)
  clearGlobalFilters()
  selectedNode.value = null
  relationshipChartMode.value = 'compare'
  networkSettings.value = {
    depth: '2',
    relationshipFocus: 'all',
    nodeLimit: 50,
  }
  if (fullOverview.value) {
    comparisonArtistIds.value = [
      sailorShift.value?.id,
      ...fullOverview.value.topArtists.filter((artist) => artist.id !== sailorShift.value?.id).slice(0, 2).map((artist) => artist.id),
    ].filter((id) => id !== undefined)
  }
  dashboardMessage.value = 'Dashboard reset to the default full graph view.'
  selectedNode.value = sailorShift.value ?? null
}

function updateFilters(nextFilters) {
  filters.value = normalizeFilterRange({
    ...filters.value,
    ...nextFilters,
  })
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

function setDegreeFilter(bin) {
  const current = filters.value.degreeRange
  const isActive = current?.label === bin.label
  filters.value = {
    ...filters.value,
    degreeRange: isActive ? null : { label: bin.label, min: bin.min, max: bin.max },
  }
}

function removeFilter(key) {
  if (key === 'years') {
    filters.value = { ...filters.value, startYear: '', endYear: '' }
    return
  }
  if (key === 'degreeRange') {
    filters.value = { ...filters.value, degreeRange: null }
    return
  }
  filters.value = { ...filters.value, [key]: '' }
}

function buildFilteredGraph(sourceGraph, options = {}) {
  const graphWithoutDegree = buildFilteredGraphWithoutDegree(sourceGraph, options)
  if (!filters.value.degreeRange) return attachFilteredDegrees(graphWithoutDegree)

  const degreeById = computeDegrees(graphWithoutDegree)
  const range = filters.value.degreeRange
  const degreeFilteredNodes = graphWithoutDegree.nodes.filter((node) => {
    const degree = degreeById.get(node.id)?.degree ?? 0
    return degree >= range.min && degree <= range.max
  })
  const degreeFilteredIds = new Set(degreeFilteredNodes.map((node) => node.id))
  const degreeFilteredLinks = graphWithoutDegree.links.filter(
    (link) => degreeFilteredIds.has(link.source) && degreeFilteredIds.has(link.target),
  )

  return attachFilteredDegrees({
    ...graphWithoutDegree,
    nodes: degreeFilteredNodes,
    links: degreeFilteredLinks,
  })
}

function buildFilteredGraphWithoutDegree(sourceGraph, options = {}) {
  const baseNodes = sourceGraph.nodes.filter((node) => {
    if (!options.ignoreTime && !inYearRange(node.year)) return false
    return true
  })
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
          (options.ignoreTime || inYearRange(node.year)),
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

function attachFilteredDegrees(sourceGraph) {
  return {
    ...sourceGraph,
    degreeById: computeDegrees(sourceGraph),
  }
}

function normalizeFilterRange(nextFilters) {
  const start = Number(nextFilters.startYear)
  const end = Number(nextFilters.endYear)
  if (start && end && start > end) {
    return {
      ...nextFilters,
      startYear: String(end),
      endYear: String(start),
    }
  }
  return nextFilters
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

function updateComparisonArtists(nextIds) {
  comparisonArtistIds.value = nextIds
}

function updateNetworkSettings(nextSettings) {
  networkSettings.value = nextSettings
}

function pausePlayback(restoreManualRange = false) {
  isPlaying.value = false
  if (playbackTimer) {
    window.clearInterval(playbackTimer)
    playbackTimer = null
  }
  if (restoreManualRange && manualYearRangeBeforePlayback.value) {
    filters.value = {
      ...filters.value,
      startYear: manualYearRangeBeforePlayback.value.startYear,
      endYear: manualYearRangeBeforePlayback.value.endYear,
    }
  }
  manualYearRangeBeforePlayback.value = null
}

function playTimeline() {
  pausePlayback(false)
  manualYearRangeBeforePlayback.value = {
    startYear: filters.value.startYear,
    endYear: filters.value.endYear,
  }
  isPlaying.value = true
  playbackTimer = window.setInterval(() => {
    stepYear(1, true)
  }, playbackSpeed.value)
}

function stepYear(direction, fromPlayback = false) {
  const years = availableYears.value
  if (!years.length) return
  const current = Number(filters.value.startYear || years[0])
  const index = Math.max(0, years.indexOf(current))
  const nextIndex = Math.min(years.length - 1, Math.max(0, index + direction))
  selectYear(years[nextIndex])
  if (fromPlayback && nextIndex === years.length - 1 && direction > 0) pausePlayback(true)
}

function resetYear() {
  filters.value = { ...filters.value, startYear: '', endYear: '' }
  pausePlayback(false)
}

function selectRankedEntity(row) {
  if (row.entity) selectNode(row.entity)
}

function selectRisingStar(row) {
  if (row.entity) selectNode(row.entity)
}

function validateSelection(nextGraph) {
  if (!selectedNode.value) return
  const visibleIds = new Set(nextGraph.nodes.map((node) => node.id))
  if (visibleIds.has(selectedNode.value.id)) return

  if (relationshipChartMode.value === 'selected-only') {
    relationshipChartMode.value = 'compare'
  }
  dashboardMessage.value = `${selectedNode.value.label} is kept as the investigation center. Some filters may show limited related evidence.`
}

function validateComparisonArtists(nextGraph) {
  const visibleIds = new Set(nextGraph.nodes.map((node) => node.id))
  comparisonArtistIds.value = comparisonArtistIds.value.filter((id) => visibleIds.has(id))
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
        <label class="learning-toggle">
          <input v-model="learningMode" type="checkbox" />
          Learning Mode
        </label>
        <button class="va-button-primary" type="button" @click="resetDashboard">Reset dashboard</button>
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
        @reset="clearGlobalFilters"
      />

      <section class="dashboard-state-strip" aria-label="Current dashboard state">
        <div class="dashboard-state-group">
          <strong>Active filters</strong>
          <span v-if="!activeFilterChips.length" class="dashboard-state-pill">None</span>
          <button
            v-for="chip in activeFilterChips"
            :key="chip.key"
            type="button"
            class="dashboard-state-chip"
            :aria-label="`Remove ${chip.label}`"
            @click="removeFilter(chip.key)"
          >
            {{ chip.label }} <span aria-hidden="true">x</span>
          </button>
        </div>
        <div class="dashboard-state-group">
          <strong>Selected</strong>
          <span class="dashboard-state-pill">{{ selectedNode?.label ?? 'None' }}</span>
          <button v-if="selectedNode" type="button" class="dashboard-state-link" @click="clearEntitySelection">
            Clear selection
          </button>
        </div>
      </section>

      <p v-if="dashboardMessage" class="dashboard-message">{{ dashboardMessage }}</p>

      <section class="dashboard-board">
        <SummaryCards class="dashboard-kpi-row" :overview="overview" :learning-mode="learningMode" />

        <article class="va-card dashboard-chart-card dashboard-sailor-panel">
          <div class="dashboard-panel-title">
            <h2>Sailor Shift profile</h2>
            <p>Career, influence, and Oceanus Folk context.</p>
          </div>

          <LearningHint
            :learning-mode="learningMode"
            purpose="Profiles Sailor Shift as the default investigation anchor."
            use="Connects the career profile task to graph evidence."
            interaction="Use filters or click network nodes to compare this anchor with other artists."
            reading="Higher counts show stronger graph evidence, but they are not causal proof."
          />

          <div v-if="sailorProfile" class="profile-grid">
            <span><strong>{{ sailorProfile.careerSpan }}</strong><small>career span</small></span>
            <span><strong>{{ sailorProfile.oceanusLinks }}</strong><small>Oceanus links</small></span>
            <span><strong>{{ sailorProfile.influenceReceived }}</strong><small>influence received</small></span>
            <span><strong>{{ sailorProfile.influenceGiven }}</strong><small>influence given</small></span>
            <span><strong>{{ sailorProfile.creativeLinks }}</strong><small>creative links</small></span>
            <span><strong>{{ sailorProfile.directCollaborations }}</strong><small>direct people</small></span>
            <span><strong>{{ sailorProfile.indirectCollaborations }}</strong><small>indirect people</small></span>
            <span><strong>{{ sailorProfile.genreDiversity }}</strong><small>nearby genres</small></span>
          </div>

          <p v-else class="dashboard-empty">Sailor Shift profile is not available in this graph.</p>
        </article>

        <EgoNetwork
          class="dashboard-network-panel"
          :graph="graph"
          :center-node="networkCenter"
          :filters="filters"
          :network-settings="networkSettings"
          :learning-mode="learningMode"
          @select="selectNode"
          @update-network-settings="updateNetworkSettings"
        />

        <BarChart
          class="dashboard-genre-panel"
          title="Genre contribution"
          subtitle="Select a bar to cross-filter the report."
          :data="visibleGenreRows"
          :limit="7"
          :selected="filters.genre"
          :learning-mode="learningMode"
          purpose="Compares genre representation in the current view."
          use="Identify dominant genres and understand the stylistic context of the graph."
          interaction="Click a genre bar to cross-filter the dashboard."
          reading="Longer bars mean more visible entities are related to that genre."
          @select="setFilter('genre', $event)"
        />

        <ColumnChart
          class="dashboard-relationship-panel"
          title="Relationship types"
          :subtitle="
            selectedNode
              ? relationshipChartMode === 'selected-only'
                ? `Relationship types directly connected to ${selectedNode.label}.`
                : `Relationship profile for ${selectedNode.label} compared with the current graph.`
              : 'Top link categories in the current view.'
          "
          :data="relationshipRows"
          :limit="6"
          :selected="filters.edgeType"
          :selected-entity-name="selectedNode?.label ?? ''"
          :selected-total="selectedRelationshipProfile.total"
          :mode="relationshipChartMode"
          :learning-mode="learningMode"
          @select="setFilter('edgeType', $event)"
          @update-mode="relationshipChartMode = $event"
        />

        <DonutChart
          class="dashboard-entity-panel"
          title="Entity composition"
          subtitle="Share of visible entity types."
          :data="overview.nodeTypes"
          :limit="5"
          :selected="filters.nodeType"
          :learning-mode="learningMode"
          @select="setFilter('nodeType', $event)"
        />

        <TimelineChart
          class="dashboard-timeline-panel"
          :data="timelineOverview.timeline"
          :selected-year="filters.startYear === filters.endYear ? filters.startYear : ''"
          :is-playing="isPlaying"
          :playback-speed="playbackSpeed"
          :learning-mode="learningMode"
          @select-year="selectYear"
          @play="playTimeline"
          @pause="pausePlayback(true)"
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
          :learning-mode="learningMode"
          purpose="Ranks possible rising artists using a transparent heuristic score."
          use="Identify candidates for deeper investigation."
          interaction="Select or compare artists if supported."
          reading="Higher scores suggest stronger rising-star potential, not guaranteed prediction."
          method-note="Score combines Oceanus relevance, influence links, creative activity, release activity, and genre diversity. It generates hypotheses, not certainty."
          @select="selectRisingStar"
        />

        <ArtistComparison
          class="dashboard-comparison-panel"
          :artists="comparisonArtists"
          :options="artistOptions"
          :selected-ids="comparisonArtistIds"
          :learning-mode="learningMode"
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
          :learning-mode="learningMode"
          @select="selectRankedEntity"
        />

        <StackedGenreChart
          class="dashboard-oceanus-panel"
          :rows="overview.oceanusGenres"
          :selected="filters.genre"
          :learning-mode="learningMode"
          @select="setFilter('genre', $event)"
        />

        <ArtistBubbleChart
          class="dashboard-artists-panel"
          :rows="artistConnectivityRows"
          :selected-id="selectedNode?.id"
          :learning-mode="learningMode"
          @select="selectNode"
        />

        <HistogramChart
          class="dashboard-degree-panel"
          title="Degree distribution"
          subtitle="Degree is recalculated from the currently visible graph."
          :rows="degreeDistribution"
          :selected="activeDegreeLabel"
          :learning-mode="learningMode"
          @select="setDegreeFilter"
        />

        <EvidenceTable
          class="dashboard-evidence-panel"
          :rows="evidenceRows"
          :selected="filters.edgeType"
          :selected-entity-name="selectedNode?.label ?? ''"
          :learning-mode="learningMode"
          @select="setFilter('edgeType', $event)"
        />
      </section>
    </main>
  </section>
</template>
