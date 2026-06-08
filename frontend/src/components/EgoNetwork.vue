<script setup>
import * as d3 from 'd3'
import { computed, ref } from 'vue'
import { getEgoNetwork } from '../data/metrics'

const props = defineProps({
  graph: {
    type: Object,
    required: true,
  },
  centerNode: {
    type: Object,
    default: null,
  },
  filters: {
    type: Object,
    required: true,
  },
  networkSettings: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['select', 'select-edge', 'update-network-settings'])

const hoveredNodeId = ref(null)
const hoveredEdge = ref(null)

const width = 620
const height = 410
const cx = width / 2
const cy = height / 2 + 12
const innerRadius = 112
const outerRadius = 180

const typeColor = d3
  .scaleOrdinal()
  .domain(['Person', 'Song', 'Album', 'RecordLabel', 'MusicalGroup', 'Other'])
  .range(['#0072b2', '#009e73', '#e69f00', '#cc79a7', '#56b4e9', '#6b7280'])

const legendItems = computed(() =>
  typeColor.domain().map((label) => ({
    label,
    color: typeColor(label),
  })),
)

// Build only the local neighborhood around the selected node.
// This keeps the graph readable: we never draw the full knowledge graph here.
const visibleNetwork = computed(() => {
  if (!props.centerNode) {
    return { nodes: [], links: [] }
  }

  const ego = getEgoNetwork(props.graph, props.centerNode.id, Number(props.networkSettings.depth))
  const selected = new Set([props.centerNode.id])
  let genreContextIds = null

  if (props.filters.genre) {
    const genreSeedIds = new Set(
      ego.nodes
        .filter((node) => node.genre === props.filters.genre || node.label === props.filters.genre)
        .map((node) => node.id),
    )
    genreContextIds = new Set(genreSeedIds)
    for (const link of ego.links) {
      if (genreSeedIds.has(link.source) || genreSeedIds.has(link.target)) {
        genreContextIds.add(link.source)
        genreContextIds.add(link.target)
      }
    }
  }

  const ranked = ego.nodes
    .filter((node) => node.id !== props.centerNode.id)
    .filter((node) => !props.filters.nodeType || node.nodeType === props.filters.nodeType)
    .filter((node) => !genreContextIds || genreContextIds.has(node.id))
    .filter((node) => inYearRange(node.year))
    .map((node) => ({
      node,
      distance: isDirectNeighbor(ego.links, props.centerNode.id, node.id) ? 1 : 2,
      degree: props.graph.degreeById?.get(node.id)?.degree ?? 0,
    }))
    // Prioritize closer and more connected nodes when the neighborhood is too large.
    .sort((a, b) => a.distance - b.distance || b.degree - a.degree || a.node.label.localeCompare(b.node.label))
    .slice(0, props.networkSettings.nodeLimit)

  for (const row of ranked) selected.add(row.node.id)

  const links = ego.links
    .filter((link) => selected.has(link.source) && selected.has(link.target))
    .filter((link) => !props.filters.edgeType || link.edgeType === props.filters.edgeType)
    .filter(
      (link) =>
        props.networkSettings.relationshipFocus === 'all' ||
        relationshipCategory(link) === props.networkSettings.relationshipFocus,
    )
    .filter((link) => inYearRange(link.year ?? link.sourceNode?.year ?? link.targetNode?.year))

  return {
    nodes: [
      { node: props.centerNode, distance: 0, degree: props.graph.degreeById?.get(props.centerNode.id)?.degree ?? 0 },
      ...ranked,
    ],
    links,
  }
})

// Radial layout:
// center = selected entity, inner ring = direct neighbors, outer ring = indirect neighbors.
const positionedNodes = computed(() => {
  const groups = d3.group(visibleNetwork.value.nodes, (row) => row.distance)
  const rows = []

  for (const [distance, items] of groups) {
    if (distance === 0) {
      rows.push({ ...items[0], x: cx, y: cy, angle: 0 })
      continue
    }

    const radius = distance === 1 ? innerRadius : outerRadius
    items.forEach((item, index) => {
      const angle = (index / items.length) * Math.PI * 2 - Math.PI / 2
      rows.push({
        ...item,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        angle,
      })
    })
  }

  return rows
})

const nodeById = computed(() => new Map(positionedNodes.value.map((row) => [row.node.id, row])))

const visibleLinks = computed(() =>
  visibleNetwork.value.links
    .map((link) => ({
      ...link,
      sourcePosition: nodeById.value.get(link.source),
      targetPosition: nodeById.value.get(link.target),
    }))
    .filter((link) => link.sourcePosition && link.targetPosition),
)

function isDirectNeighbor(links, centerId, nodeId) {
  return links.some(
    (link) => (link.source === centerId && link.target === nodeId) || (link.source === nodeId && link.target === centerId),
  )
}

function inYearRange(year) {
  const start = Number(props.filters.startYear)
  const end = Number(props.filters.endYear)
  if (!year) return true
  if (start && year < start) return false
  if (end && year > end) return false
  return true
}

// Simplify detailed dataset edge names into categories that are easier to explain.
function relationshipCategory(link) {
  const type = link.edgeTypeKey
  if (type.includes('interpolates') || type.includes('reference') || type.includes('cover') || type.includes('sample')) return 'influence'
  if (type.includes('composer') || type.includes('producer') || type.includes('lyricist') || type.includes('member')) return 'collaboration'
  if (type.includes('performer') || type.includes('recorded')) return 'performance'
  if (type.includes('style') || type.includes('genre')) return 'genre'
  return 'other'
}

function nodeTypeKey(type) {
  return typeColor.domain().includes(type) ? type : 'Other'
}

function nodeRadius(row) {
  return row.distance === 0 ? 19 : Math.max(4.5, Math.min(10.5, 3.8 + Math.sqrt(row.degree) * 0.8))
}

// Hovering dims unrelated items instead of hiding them, so the analyst does not lose orientation.
function isHighlightedLink(link) {
  if (!hoveredNodeId.value) return true
  return link.source === hoveredNodeId.value || link.target === hoveredNodeId.value
}

function isRelatedToHover(row) {
  if (!hoveredNodeId.value) return true
  if (row.node.id === hoveredNodeId.value) return true
  return visibleLinks.value.some(
    (link) =>
      (link.source === hoveredNodeId.value && link.target === row.node.id) ||
      (link.target === hoveredNodeId.value && link.source === row.node.id),
  )
}

function shouldLabel(row) {
  if (row.distance === 0) return true
  if (hoveredNodeId.value === row.node.id) return true
  if (positionedNodes.value.length <= 35 && row.distance === 1) return true
  return row.degree > 18
}

function updateSetting(key, value) {
  emit('update-network-settings', {
    ...props.networkSettings,
    [key]: value,
  })
}

function edgeStrokeDash(link) {
  const category = relationshipCategory(link)
  if (category === 'influence') return '5 5'
  if (link.sourcePosition?.distance === 2 || link.targetPosition?.distance === 2) return '2 4'
  return ''
}

// Repeated relationships between the same source and target become slightly thicker.
function edgeWidth(link) {
  const duplicateCount = visibleLinks.value.filter((item) => item.source === link.source && item.target === link.target).length
  return Math.min(3.2, 1.2 + duplicateCount * 0.35)
}

function edgeMatters(link) {
  const category = relationshipCategory(link)
  if (category === 'influence') return 'Influence evidence: this relation may show stylistic borrowing, covers, samples, or references.'
  if (category === 'collaboration') return 'Creative evidence: this relation connects people or works through production, writing, or membership.'
  if (category === 'performance') return 'Performance evidence: this relation ties an entity to recorded or performed music.'
  return 'Context evidence: this relation adds local graph context around the selected entity.'
}
</script>

<template>
  <article class="va-card dashboard-visual-card flex h-full flex-col p-3">
    <div class="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <h2 class="text-sm font-semibold text-slate-950">Radial Ego Network</h2>
        <p class="mt-0.5 text-[11px] text-slate-500">
          Center is the selected entity. Inner ring is direct context; outer ring is indirect context.
        </p>
      </div>
      <p class="text-xs text-slate-500">{{ positionedNodes.length }} nodes | {{ visibleLinks.length }} links</p>
    </div>

    <div class="mt-2 grid gap-2 lg:grid-cols-[1.1fr_1fr_0.8fr]">
      <label class="text-xs font-medium uppercase text-slate-500">
        Network depth
        <select
          :value="networkSettings.depth"
          class="va-control mt-1 h-9 w-full normal-case"
          @change="updateSetting('depth', $event.target.value)"
        >
          <option value="1">Direct only</option>
          <option value="2">Direct plus indirect</option>
        </select>
      </label>

      <label class="text-xs font-medium uppercase text-slate-500">
        Relationship focus
        <select
          :value="networkSettings.relationshipFocus"
          class="va-control mt-1 h-9 w-full normal-case"
          @change="updateSetting('relationshipFocus', $event.target.value)"
        >
          <option value="all">All</option>
          <option value="influence">Influence</option>
          <option value="collaboration">Collaboration</option>
          <option value="performance">Performance</option>
          <option value="genre">Genre related</option>
        </select>
      </label>

      <label class="text-xs font-medium uppercase text-slate-500">
        Node limit
        <select
          :value="networkSettings.nodeLimit"
          class="va-control mt-1 h-9 w-full normal-case"
          @change="updateSetting('nodeLimit', Number($event.target.value))"
        >
          <option :value="25">Top 25</option>
          <option :value="50">Top 50</option>
          <option :value="100">Top 100</option>
        </select>
      </label>
    </div>

    <div class="mt-2 flex flex-wrap gap-1 text-[11px] text-slate-600">
      <span
        v-for="item in legendItems"
        :key="item.label"
        class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1"
      >
        <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: item.color }" />
        {{ item.label }}
      </span>
      <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1">
        <span class="h-px w-6 bg-slate-500" /> creative/direct
      </span>
      <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1">
        <span class="h-px w-6 border-t border-dashed border-slate-500" /> influence
      </span>
      <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1">
        <span class="h-px w-6 border-t border-dotted border-slate-500" /> indirect
      </span>
    </div>

    <div v-if="!positionedNodes.length" class="mt-4 rounded-lg bg-slate-50 p-5 text-sm text-slate-600">
      No sufficient graph evidence for this filter. Try expanding the year range, choosing all relationships, or increasing the node limit.
    </div>

    <svg v-else class="mx-auto mt-1 block h-auto w-full max-w-[680px]" :viewBox="`0 0 ${width} ${height}`" role="img">
      <circle :cx="cx" :cy="cy" :r="innerRadius" fill="none" stroke="#cbd5e1" stroke-dasharray="4 5" />
      <circle v-if="networkSettings.depth === '2'" :cx="cx" :cy="cy" :r="outerRadius" fill="none" stroke="#e2e8f0" stroke-dasharray="4 5" />
      <text :x="cx" :y="cy - innerRadius - 10" text-anchor="middle" class="fill-slate-500 text-[11px]">
        direct relationships
      </text>
      <text v-if="networkSettings.depth === '2'" :x="cx" :y="cy - outerRadius - 10" text-anchor="middle" class="fill-slate-400 text-[11px]">
        indirect relationships
      </text>

      <path
        v-for="link in visibleLinks"
        :key="link.id"
        :d="`M ${link.sourcePosition.x} ${link.sourcePosition.y} Q ${cx} ${cy} ${link.targetPosition.x} ${link.targetPosition.y}`"
        fill="none"
        :stroke="hoveredEdge?.id === link.id || filters.edgeType === link.edgeType ? '#0f766e' : isHighlightedLink(link) ? '#64748b' : '#cbd5e1'"
        :stroke-width="hoveredEdge?.id === link.id || filters.edgeType === link.edgeType ? edgeWidth(link) + 1 : edgeWidth(link)"
        :stroke-dasharray="edgeStrokeDash(link)"
        :opacity="isHighlightedLink(link) ? 0.68 : 0.18"
        class="cursor-pointer"
        @mouseenter="hoveredEdge = link"
        @mouseleave="hoveredEdge = null"
        @click="emit('select-edge', link.edgeType)"
      >
        <title>
          {{ link.sourceNode.label }} -> {{ link.targetNode.label }}
          Relationship: {{ link.edgeType }}
          Year: {{ link.year ?? link.sourceNode.year ?? link.targetNode.year ?? 'Unknown' }}
          Genre: {{ link.sourceNode.genre }} / {{ link.targetNode.genre }}
          {{ edgeMatters(link) }}
        </title>
      </path>

      <g
        v-for="row in positionedNodes"
        :key="row.node.id"
        class="cursor-pointer transition-opacity"
        :transform="`translate(${row.x}, ${row.y})`"
        @click="emit('select', row.node)"
        @mouseenter="hoveredNodeId = row.node.id"
        @mouseleave="hoveredNodeId = null"
      >
        <circle
          :r="nodeRadius(row)"
          :fill="typeColor(nodeTypeKey(row.node.nodeType))"
          :stroke="row.distance === 0 || hoveredNodeId === row.node.id ? '#0f766e' : row.node.genre === 'Unknown' ? '#f59e0b' : '#ffffff'"
          :stroke-width="row.distance === 0 || hoveredNodeId === row.node.id ? 3 : 1.5"
          :opacity="row.node.genre === 'Unknown' ? 0.64 : isRelatedToHover(row) ? 1 : 0.22"
        >
          <title>
            {{ row.node.label }}
            Type: {{ row.node.nodeType }}
            Genre: {{ row.node.genre }}
            Year: {{ row.node.year ?? 'Unknown' }}
            Degree: {{ row.degree }}
          </title>
        </circle>
        <text
          v-if="shouldLabel(row)"
          :y="nodeRadius(row) + 11"
          text-anchor="middle"
          class="pointer-events-none fill-slate-700 text-[9px]"
        >
          {{ row.node.label.slice(0, 18) }}
        </text>
      </g>
    </svg>

  </article>
</template>
