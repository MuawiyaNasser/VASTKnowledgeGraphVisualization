export async function loadGraph(url = '/data/MC1_graph.json') {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Unable to load graph data from ${url}`)
  }

  return response.json()
}
