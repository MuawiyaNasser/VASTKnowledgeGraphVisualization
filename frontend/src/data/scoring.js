import { findSailorShift, isArtist } from './graphTransforms'
import { buildNeighbors, computeDegrees, isCollaborationEdge, isInfluenceEdge } from './metrics'

export function computeRisingStarScores(graph) {
  const degreeById = computeDegrees(graph)
  const artistNodes = graph.nodes.filter(isArtist)
  const collaborationByArtist = countEdgesByArtist(graph, isCollaborationEdge)
  const influenceByArtist = countEdgesByArtist(graph, isInfluenceEdge)
  const genreDiversityByArtist = countGenresNearArtists(graph)
  const sailor = findSailorShift(graph.nodes)
  const neighborsById = buildNeighbors(graph)

  return artistNodes
    .map((artist) => {
      const degree = degreeById.get(artist.id)?.degree ?? 0
      const collaborations = collaborationByArtist.get(artist.id) ?? 0
      const influence = influenceByArtist.get(artist.id) ?? 0
      const genreDiversity = genreDiversityByArtist.get(artist.id) ?? 0
      const recentActivity = artist.year && artist.year >= 2035 ? 1 : 0
      const oceanusSignal = artist.genre === 'Oceanus Folk' ? 2 : artist.genre.includes('Oceanus') ? 1 : 0
      const notablePenalty = artist.notable ? -2 : 0
      const sailorConnection = computeSailorConnection(artist.id, sailor?.id, neighborsById)

      // This is intentionally simple and explainable. It is a heuristic score,
      // not a machine learning model.
      const score =
        collaborations * 2 +
        influence * 1.5 +
        genreDiversity * 1.25 +
        recentActivity * 3 +
        oceanusSignal * 3 +
        sailorConnection.score +
        Math.log1p(degree) +
        notablePenalty

      return {
        artist,
        score,
        breakdown: {
          collaborations,
          influence,
          genreDiversity,
          recentActivity,
          oceanusSignal,
          sailorConnection: sailorConnection.label,
          sailorConnectionScore: sailorConnection.score,
          degree,
          notable: artist.notable,
          contributions: [
            { key: 'creative', label: 'Creative links', value: collaborations * 2 },
            { key: 'influence', label: 'Influence links', value: influence * 1.5 },
            { key: 'genre', label: 'Genre diversity', value: genreDiversity * 1.25 },
            { key: 'activity', label: 'Recent activity', value: recentActivity * 3 },
            { key: 'oceanus', label: 'Oceanus relevance', value: oceanusSignal * 3 },
            { key: 'nearby', label: 'Nearby important entities', value: Math.log1p(degree) + sailorConnection.score },
          ],
        },
      }
    })
    .sort((a, b) => b.score - a.score || a.artist.label.localeCompare(b.artist.label))
}

function computeSailorConnection(artistId, sailorId, neighborsById) {
  if (!artistId || !sailorId || artistId === sailorId) {
    return { label: 'Selected anchor artist', score: 2 }
  }

  const sailorNeighbors = neighborsById.get(sailorId) ?? new Set()
  if (sailorNeighbors.has(artistId)) {
    return { label: 'Directly connected to Sailor Shift', score: 4 }
  }

  const artistNeighbors = neighborsById.get(artistId) ?? new Set()
  for (const neighborId of artistNeighbors) {
    if (sailorNeighbors.has(neighborId)) {
      return { label: 'Indirectly connected to Sailor Shift', score: 2 }
    }
  }

  return { label: 'No close Sailor Shift link in visible graph', score: 0 }
}

function countEdgesByArtist(graph, predicate) {
  const counts = new Map()

  for (const link of graph.links) {
    if (!predicate(link)) continue
    counts.set(link.source, (counts.get(link.source) ?? 0) + 1)
    counts.set(link.target, (counts.get(link.target) ?? 0) + 1)
  }

  return counts
}

function countGenresNearArtists(graph) {
  const genresByArtist = new Map()

  for (const link of graph.links) {
    addNeighborGenre(genresByArtist, link.sourceNode, link.targetNode)
    addNeighborGenre(genresByArtist, link.targetNode, link.sourceNode)
  }

  return new Map(Array.from(genresByArtist, ([id, genres]) => [id, genres.size]))
}

function addNeighborGenre(genresByArtist, artist, neighbor) {
  if (!artist || !neighbor || !isArtist(artist) || neighbor.genre === 'Unknown') {
    return
  }

  if (!genresByArtist.has(artist.id)) {
    genresByArtist.set(artist.id, new Set())
  }

  genresByArtist.get(artist.id).add(neighbor.genre)
}
