import { groupCounts, isAlbum, isArtist, isGenre, isSong } from './graphTransforms'

const COLLABORATION_TYPES = ['collab', 'feature', 'performer', 'composer', 'producer', 'lyricist', 'member']
const INFLUENCE_TYPES = ['influence', 'interpolates', 'reference', 'cover', 'sample', 'instyleof', 'inspired']

export function computeDegrees(graph) {
  const degreeById = new Map(graph.nodes.map((node) => [node.id, { degree: 0, inDegree: 0, outDegree: 0 }]))

  for (const link of graph.links) {
    const sourceDegree = degreeById.get(link.source)
    const targetDegree = degreeById.get(link.target)

    if (sourceDegree) {
      sourceDegree.degree += 1
      sourceDegree.outDegree += 1
    }

    if (targetDegree) {
      targetDegree.degree += 1
      targetDegree.inDegree += 1
    }
  }

  return degreeById
}

export function buildNeighbors(graph) {
  const neighborsById = new Map(graph.nodes.map((node) => [node.id, new Set()]))

  for (const link of graph.links) {
    neighborsById.get(link.source)?.add(link.target)
    neighborsById.get(link.target)?.add(link.source)
  }

  return neighborsById
}

export function computeOverview(graph) {
  const degreeById = computeDegrees(graph)
  const artistNodes = graph.nodes.filter(isArtist)

  return {
    totalNodes: graph.nodes.length,
    totalLinks: graph.links.length,
    artistCount: artistNodes.length,
    songCount: graph.nodes.filter(isSong).length,
    albumCount: graph.nodes.filter(isAlbum).length,
    genreCount: graph.nodes.filter(isGenre).length,
    collaborationCount: graph.links.filter(isCollaborationEdge).length,
    influenceCount: graph.links.filter(isInfluenceEdge).length,
    nodeTypes: groupCounts(graph.nodes, (node) => node.nodeType),
    edgeTypes: groupCounts(graph.links, (link) => link.edgeType),
    allGenres: groupCounts(graph.nodes, (node) => node.genre),
    genres: groupCounts(graph.nodes, (node) => node.genre, 12),
    knownGenres: groupCounts(
      graph.nodes.filter((node) => node.genre !== 'Unknown'),
      (node) => node.genre,
      12,
    ),
    topEntities: graph.nodes
      .map((node) => ({ ...node, ...degreeById.get(node.id) }))
      .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label))
      .slice(0, 12),
    topArtists: artistNodes
      .map((node) => ({ ...node, ...degreeById.get(node.id) }))
      .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label))
      .slice(0, 12),
    timeline: computeTimeline(graph),
    oceanusGenres: computeOceanusGenreLinks(graph, degreeById),
    degreeById,
  }
}

export function computeTimeline(graph) {
  const byYear = new Map()

  for (const node of graph.nodes) {
    if (!node.year) continue
    const row = getTimelineRow(byYear, node.year)
    row.entities += 1
    if (isArtist(node)) row.artists += 1
    if (isSong(node)) row.songs += 1
    if (isAlbum(node)) row.albums += 1
    if (node.genre === 'Oceanus Folk') row.oceanus += 1
  }

  for (const link of graph.links) {
    const year = link.year ?? link.sourceNode?.year ?? link.targetNode?.year
    if (!year) continue
    const row = getTimelineRow(byYear, year)
    row.relationships += 1
    if (isCollaborationEdge(link)) row.collaborations += 1
    if (isInfluenceEdge(link)) row.influences += 1
  }

  return Array.from(byYear.values()).sort((a, b) => a.year - b.year)
}

export function computeOceanusGenreLinks(graph, degreeById = computeDegrees(graph)) {
  const rowsByGenre = new Map()

  for (const link of graph.links) {
    const nodes = [link.sourceNode, link.targetNode].filter(Boolean)
    const hasOceanus = nodes.some((node) => node.genre === 'Oceanus Folk')
    if (!hasOceanus) continue

    for (const node of nodes) {
      if (!node || node.genre === 'Unknown' || node.genre === 'Oceanus Folk') continue
      if (!rowsByGenre.has(node.genre)) {
        rowsByGenre.set(node.genre, {
          label: node.genre,
          value: 0,
          artists: 0,
          songs: 0,
          influence: 0,
          collaboration: 0,
          topEntity: node,
          topDegree: degreeById.get(node.id)?.degree ?? 0,
        })
      }

      const row = rowsByGenre.get(node.genre)
      row.value += 1
      if (isArtist(node)) row.artists += 1
      if (isSong(node)) row.songs += 1
      if (isInfluenceEdge(link)) row.influence += 1
      if (isCollaborationEdge(link)) row.collaboration += 1

      const degree = degreeById.get(node.id)?.degree ?? 0
      if (degree > row.topDegree) {
        row.topEntity = node
        row.topDegree = degree
      }
    }
  }

  return Array.from(rowsByGenre.values())
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 12)
}

export function computeArtistMetrics(graph, artistIds = []) {
  const degreeById = computeDegrees(graph)
  const selectedIds = new Set(artistIds)
  const releaseCounts = new Map()
  const genreSets = new Map()
  const collaborationCounts = new Map()
  const influenceReceived = new Map()
  const influenceGiven = new Map()
  const oceanusLinks = new Map()

  for (const link of graph.links) {
    const endpoints = [link.sourceNode, link.targetNode]

    for (const node of endpoints) {
      if (!node || !selectedIds.has(node.id)) continue

      const other = node.id === link.source ? link.targetNode : link.sourceNode
      if (isCollaborationEdge(link)) {
        collaborationCounts.set(node.id, (collaborationCounts.get(node.id) ?? 0) + 1)
      }
      if (isInfluenceEdge(link) && link.target === node.id) {
        influenceReceived.set(node.id, (influenceReceived.get(node.id) ?? 0) + 1)
      }
      if (isInfluenceEdge(link) && link.source === node.id) {
        influenceGiven.set(node.id, (influenceGiven.get(node.id) ?? 0) + 1)
      }
      if (other?.genre === 'Oceanus Folk' || node.genre === 'Oceanus Folk') {
        oceanusLinks.set(node.id, (oceanusLinks.get(node.id) ?? 0) + 1)
      }
      if (other?.genre && other.genre !== 'Unknown') {
        if (!genreSets.has(node.id)) genreSets.set(node.id, new Set())
        genreSets.get(node.id).add(other.genre)
      }
      if (other && (isSong(other) || isAlbum(other))) {
        releaseCounts.set(node.id, (releaseCounts.get(node.id) ?? 0) + 1)
      }
    }
  }

  return graph.nodes
    .filter((node) => selectedIds.has(node.id))
    .map((artist) => ({
      artist,
      degree: degreeById.get(artist.id)?.degree ?? 0,
      collaborations: collaborationCounts.get(artist.id) ?? 0,
      influenceReceived: influenceReceived.get(artist.id) ?? 0,
      influenceGiven: influenceGiven.get(artist.id) ?? 0,
      releases: releaseCounts.get(artist.id) ?? 0,
      genreDiversity: genreSets.get(artist.id)?.size ?? 0,
      oceanusLinks: oceanusLinks.get(artist.id) ?? 0,
      recentActivity: artist.year && artist.year >= 2035 ? 1 : 0,
    }))
}

function getTimelineRow(byYear, year) {
  if (!byYear.has(year)) {
    byYear.set(year, {
      year,
      entities: 0,
      artists: 0,
      songs: 0,
      albums: 0,
      relationships: 0,
      collaborations: 0,
      influences: 0,
      oceanus: 0,
    })
  }

  return byYear.get(year)
}

export function isCollaborationEdge(link) {
  return COLLABORATION_TYPES.some((token) => link.edgeTypeKey.includes(token))
}

export function isInfluenceEdge(link) {
  return INFLUENCE_TYPES.some((token) => link.edgeTypeKey.includes(token))
}

export function getEgoNetwork(graph, centerId, hops = 1) {
  if (centerId === null || centerId === undefined) {
    return { nodes: [], links: [] }
  }

  const neighborsById = buildNeighbors(graph)
  const included = new Set([centerId])
  let frontier = new Set([centerId])

  for (let depth = 0; depth < hops; depth += 1) {
    const next = new Set()
    for (const id of frontier) {
      for (const neighborId of neighborsById.get(id) ?? []) {
        if (!included.has(neighborId)) {
          included.add(neighborId)
          next.add(neighborId)
        }
      }
    }
    frontier = next
  }

  return {
    nodes: graph.nodes.filter((node) => included.has(node.id)),
    links: graph.links.filter((link) => included.has(link.source) && included.has(link.target)),
  }
}
