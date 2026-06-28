import { extractYear, formatUnknown } from '../utils/dateUtils'

const ARTIST_TYPES = new Set(['artist', 'person', 'singer', 'producer', 'musician'])
const SONG_TYPES = new Set(['song', 'track'])
const ALBUM_TYPES = new Set(['album', 'record'])
const GENRE_TYPES = new Set(['genre'])

// The raw JSON has many field names and some missing values.
// This function converts the raw graph into one predictable format used by all components.
export function normalizeGraph(rawGraph) {
  const nodes = (rawGraph.nodes ?? []).map(normalizeNode)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  const links = (rawGraph.links ?? []).map((link, index) => normalizeLink(link, index, nodeById))

  return {
    directed: Boolean(rawGraph.directed),
    multigraph: Boolean(rawGraph.multigraph),
    nodes,
    links,
    nodeById,
  }
}

// One clean node object means the UI does not need to remember every possible raw field name.
export function normalizeNode(node) {
  const nodeType = formatUnknown(node['Node Type'] ?? node.type)
  const genre = formatUnknown(node.genre)
  const releaseYear = extractYear(node.release_date)
  const writtenYear = extractYear(node.written_date)
  const notorietyYear = extractYear(node.notoriety_date)
  const year = releaseYear ?? writtenYear ?? notorietyYear

  return {
    ...node,
    id: node.id,
    label: formatUnknown(node.name ?? node.stage_name ?? node.id),
    nodeType,
    nodeTypeKey: nodeType.toLowerCase(),
    genre,
    year,
    releaseYear,
    writtenYear,
    notorietyYear,
    notable: Boolean(node.notable),
  }
}

// One clean link object also stores direct references to its source and target nodes.
export function normalizeLink(link, index, nodeById) {
  const edgeType = formatUnknown(link['Edge Type'] ?? link.type)
  const sourceId = getEndpointId(link.source)
  const targetId = getEndpointId(link.target)
  const source = nodeById.get(sourceId)
  const target = nodeById.get(targetId)

  return {
    ...link,
    id: `${sourceId}-${targetId}-${link.key ?? index}`,
    source: sourceId,
    target: targetId,
    sourceNode: source,
    targetNode: target,
    edgeType,
    edgeTypeKey: edgeType.toLowerCase(),
    year: extractYear(link.date ?? link.year ?? link.release_date ?? link.written_date),
  }
}

export function getEndpointId(endpoint) {
  if (endpoint && typeof endpoint === 'object') {
    return endpoint.id ?? endpoint.entityId ?? endpoint.nodeId ?? endpoint.name ?? null
  }

  return endpoint
}

export function isArtist(node) {
  const type = node.nodeTypeKey
  return ARTIST_TYPES.has(type) || Boolean(node.stage_name)
}

export function isSong(node) {
  return SONG_TYPES.has(node.nodeTypeKey)
}

export function isAlbum(node) {
  return ALBUM_TYPES.has(node.nodeTypeKey)
}

export function isGenre(node) {
  return GENRE_TYPES.has(node.nodeTypeKey)
}

export function groupCounts(items, accessor, limit = null) {
  const counts = new Map()

  for (const item of items) {
    const key = formatUnknown(accessor(item))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const rows = Array.from(counts, ([label, value]) => ({ label, value })).sort(
    (a, b) => b.value - a.value || a.label.localeCompare(b.label),
  )

  return limit ? rows.slice(0, limit) : rows
}

export function findSailorShift(nodes) {
  return (
    nodes.find((node) => node.label.toLowerCase() === 'sailor shift') ??
    nodes.find((node) => node.label.toLowerCase().includes('sailor shift')) ??
    null
  )
}
