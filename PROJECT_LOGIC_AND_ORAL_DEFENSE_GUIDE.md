# Project Logic and Oral Defense Guide

Project: The Rise of Oceanus Folk  
Course: Visual Analytics 602AA, University of Pisa  
Dataset: VAST Challenge 2025, Mini Challenge 1  
Repository audited: `i-am-building-my-final-project`  
Audit date: 2026-06-29

This document explains what the implemented dashboard actually does. It is based on the repository code and the bundled MC1 graph file. It intentionally separates implemented behavior from intended interpretation, because this is important for an oral exam.

## 1. Repository Architecture

### Main folders

| Folder | Purpose |
| --- | --- |
| `frontend/` | Vue/Vite web application. This is the runnable dashboard. |
| `frontend/src/components/` | Vue components for every dashboard card and chart. Several of these components use D3 for SVG rendering. |
| `frontend/src/data/` | Data loading, normalization, metrics, and scoring logic. |
| `frontend/src/utils/` | Small utility functions, currently mainly date and missing-value handling. |
| `frontend/public/data/` | Browser-accessible copy of the graph data, loaded at runtime by the dashboard. |
| `data/MC1_release/` | Original released data files copied into the repository. |
| `report/` | LaTeX report, compiled PDF, and report figures. |
| `docs/` | Supporting documentation files. |

### Application stack

The app is a Vue 3 application with Vite. This is shown in `frontend/package.json`.

Important dependencies:

- `vue`: component framework.
- `d3`: SVG scales, layouts, paths, axes, grouping, and chart calculations.
- `vue-router`: page routing.
- `pinia`: installed, but not used as the dashboard state store in the current implementation.

The dashboard state is not stored in Pinia. It is stored directly in `frontend/src/components/Dashboard.vue` using Vue `ref` and `computed`.

### Important files

| File | Role |
| --- | --- |
| `frontend/src/data/graphLoader.js` | Loads `/data/MC1_graph.json` with `fetch`. |
| `frontend/src/data/graphTransforms.js` | Normalizes raw nodes and links into predictable fields. Defines `normalizeGraph`, `normalizeNode`, `normalizeLink`, `isArtist`, `isSong`, `isAlbum`, `isGenre`, `groupCounts`, and `findSailorShift`. |
| `frontend/src/data/metrics.js` | Computes graph metrics: degree, overview counts, timeline rows, Oceanus genre links, artist metrics, relationship grouping, and ego-network traversal. |
| `frontend/src/data/scoring.js` | Computes the rising-star heuristic score. |
| `frontend/src/utils/dateUtils.js` | Extracts years and converts missing values to `Unknown`. |
| `frontend/src/components/Dashboard.vue` | Main dashboard controller. Stores global state, applies filters, computes derived data, and connects all components. |
| `frontend/src/components/EgoNetwork.vue` | Original D3 radial ego-network visualization. |
| `frontend/src/components/TimelineChart.vue` | Combined column and line chart for temporal spread. |
| `frontend/src/components/ColumnChart.vue` | Relationship types chart with pagination and selected-artist comparison. |
| `frontend/src/components/BarChart.vue` | Generic horizontal bar chart used for genre contribution. |
| `frontend/src/components/DonutChart.vue` | Entity composition donut. |
| `frontend/src/components/RankedBarChart.vue` | Ranking chart used for rising-star hypotheses. |
| `frontend/src/components/ArtistComparison.vue` | Grouped horizontal bar chart for comparing three artists. |
| `frontend/src/components/ArtistBubbleChart.vue` | Scatter/bubble chart for artist connectivity. |
| `frontend/src/components/StackedGenreChart.vue` | Stacked External Genre Influence on Oceanus Folk chart. |
| `frontend/src/components/HistogramChart.vue` | Degree distribution histogram. |
| `frontend/src/components/LollipopChart.vue` | Most connected entities ranking. |
| `frontend/src/components/EvidenceTable.vue` | Exact relationship count table. |
| `frontend/src/components/SummaryCards.vue` | KPI cards. |
| `frontend/src/components/FilterPanel.vue` | Global filter strip. |
| `frontend/src/components/LearningHint.vue` | Reusable Learning Mode / Visual Guide component. |

### Data loading path

1. `Dashboard.vue` calls `loadGraph()` inside `onMounted`.
2. `loadGraph()` in `graphLoader.js` fetches `/data/MC1_graph.json`.
3. The raw JSON is passed to `normalizeGraph()` in `graphTransforms.js`.
4. `computeOverview()` is run once to attach `degreeById` to the normalized graph.
5. The dashboard starts centered on Sailor Shift using `findSailorShift()`.

Code references:

- `frontend/src/components/Dashboard.vue`: `onMounted`
- `frontend/src/data/graphLoader.js`: `loadGraph`
- `frontend/src/data/graphTransforms.js`: `normalizeGraph`
- `frontend/src/data/metrics.js`: `computeOverview`

### Vue and D3 interaction model

Vue manages state and data flow. D3 is used inside chart components for scales, paths, grouping, color scales, and SVG geometry. The chart components generally follow this pattern:

1. Receive already prepared data as props.
2. Use Vue `computed` values to derive chart rows, scales, and paths.
3. Use D3 functions such as `scaleLinear`, `scaleBand`, `scaleOrdinal`, `pie`, `arc`, `line`, and `extent`.
4. Render SVG marks through Vue templates.
5. Emit events such as `select`, `select-year`, or `update-mode`.
6. `Dashboard.vue` receives the event and updates shared state.
7. All dependent computed values update automatically.

This is not a pure imperative D3 app. It is a Vue app that uses D3 for visualization math.

## 2. Dataset Dictionary

### Top-level graph structure

The loaded JSON contains:

- `directed`: `true`
- `multigraph`: `true`
- `nodes`: 17,412 normalized nodes
- `links`: 37,857 normalized directed links

The dashboard keeps duplicate links if they exist as separate records. In the bundled data, a raw duplicate check found:

- duplicate node IDs: 0
- duplicate raw edge keys: 0
- dangling source IDs: 0
- dangling target IDs: 0

No geographic fields such as country, city, latitude, or longitude are used by the code. Geographic spread is therefore not implemented. In this project, "spread" means diffusion through the music knowledge graph ecosystem: people, songs, albums, labels, groups, genres, and time.

### Normalized node fields

Defined in `frontend/src/data/graphTransforms.js`, `normalizeNode`.

Each normalized node contains:

| Field | Meaning |
| --- | --- |
| `id` | Raw node identifier. |
| `label` | `name`, `stage_name`, or `id`, with missing values converted to `Unknown`. |
| `nodeType` | Raw `Node Type` or `type`, converted to `Unknown` if missing. |
| `nodeTypeKey` | Lowercase version of `nodeType`. |
| `genre` | Raw `genre`, converted to `Unknown` if missing. |
| `releaseYear` | Year extracted from `release_date`. |
| `writtenYear` | Year extracted from `written_date`. |
| `notorietyYear` | Year extracted from `notoriety_date`. |
| `year` | First available year in this order: release, written, notoriety. |
| `notable` | `Boolean(node.notable)`. |

Important limitation: `Boolean(node.notable)` treats any truthy value as true. If the raw data used the string `"false"`, JavaScript would still treat it as true. In the current observed examples, this was not found as a visible issue, but the implementation is simple rather than strict.

### Entity types in the data

Actual node type counts:

| Node type | Count | Main attributes | Missing patterns | Dashboard use |
| --- | ---: | --- | --- | --- |
| `Person` | 11,361 | `name`, `id`, sometimes `stage_name` | all Person nodes have `genre = Unknown` and no year in the audited data | Artists, Sailor profile, rising stars, comparison, connectivity, ego network |
| `Song` | 3,615 | `name`, `release_date`, `written_date`, `genre`, `single`, `notable` | genre and year are present in audited sample | Timeline, genre contribution, External Genre Influence on Oceanus Folk, relationship context |
| `Album` | 996 | `name`, `release_date`, `written_date`, `notoriety_date`, `genre`, `notable` | genre and year are present in audited sample | Timeline, genre contribution, releases, ego network |
| `RecordLabel` | 1,217 | `name`, `id` | all have `genre = Unknown` and no year in audited data | Entity composition, relationship types, centrality, ego network |
| `MusicalGroup` | 223 | `name`, `id` | all have `genre = Unknown` and no year in audited data | Entity composition, membership links, ego network |

There are no nodes whose normalized type is `Genre`; therefore `genreCount` is 0. Genre exists as a node attribute, not as separate genre nodes.

Top genre values:

| Genre | Count |
| --- | ---: |
| Unknown | 12,801 |
| Dream Pop | 742 |
| Indie Folk | 450 |
| Synthwave | 382 |
| Doom Metal | 348 |
| Oceanus Folk | 305 |

Because most people, labels, and groups have `Unknown` genre, genre charts exclude `Unknown` in some places to reveal interpretable genre patterns.

### Relationship types

Normalized in `graphTransforms.js`, `normalizeLink`. Each link stores:

| Field | Meaning |
| --- | --- |
| `id` | `${sourceId}-${targetId}-${key or index}` |
| `source` | Normalized source node ID |
| `target` | Normalized target node ID |
| `sourceNode` | Direct reference to the source node object |
| `targetNode` | Direct reference to the target node object |
| `edgeType` | Raw `Edge Type` or `type`, or `Unknown` |
| `edgeTypeKey` | Lowercase relationship type |
| `year` | Extracted from link date fields only; in this dataset no links have their own year |

If a link does not have its own year, temporal logic often falls back to `sourceNode.year` or `targetNode.year`.

Actual relationship types:

| Relationship | Count | Main source -> target types | Example from data | Dashboard interpretation |
| --- | ---: | --- | --- | --- |
| `PerformerOf` | 13,587 | Person -> Song, Person -> Album, MusicalGroup -> Song, MusicalGroup -> Album | Carlos Duffy -> Breaking These Chains | Creative/performance evidence |
| `RecordedBy` | 3,798 | Song -> RecordLabel, Album -> RecordLabel | Breaking These Chains -> Nautical Mile Records | Label/release context |
| `ComposerOf` | 3,290 | Person -> Song, Person -> Album | Carlos Duffy -> Siege of Barcelona's Twilight | Creative evidence |
| `ProducerOf` | 3,209 | Person -> Song, Person -> Album, RecordLabel -> Person/Group | Min Qin -> Siege of Barcelona's Twilight | Creative/production evidence |
| `DistributedBy` | 3,013 | Song -> RecordLabel, Album -> RecordLabel | Unshackled Heart -> Colline-Cascade Studios | Release/industry context |
| `LyricistOf` | 2,985 | Person -> Song, Person -> Album | Xiulan Zeng -> Echoes from Zion's Walls | Creative evidence |
| `InStyleOf` | 2,289 | Song -> Song, Album -> Song, Song -> Album, Album -> Album | Unshackled Heart -> Amber Twilight | Influence-style genre/stylistic evidence |
| `InterpolatesFrom` | 1,574 | Song -> Song, Album -> Song, Song -> Album | Breaking These Chains -> Ripples and Whispers | Influence-style borrowing/reference evidence |
| `LyricalReferenceTo` | 1,496 | Song -> Song, Album -> Song, Song -> Album | Unshackled Heart -> Echoes of Infinity | Influence-style reference evidence |
| `CoverOf` | 1,429 | Song -> Song, Album -> Song, Song -> Album | Unshackled Heart -> When Pigs Fly | Influence-style cover evidence |
| `DirectlySamples` | 619 | Song -> Song, Song -> Album, Album -> Song | Clean Lungs, Clear Mind -> Hydraulic Heart, Gerd | Influence-style sample evidence |
| `MemberOf` | 568 | Person -> MusicalGroup | Xiulan Zeng -> Green Haze Collective | Membership/collaboration evidence |

### Edge direction

The graph is directed. The code counts:

```text
outDegree(v) = number of links where source == v
inDegree(v)  = number of links where target == v
degree(v)    = inDegree(v) + outDegree(v)
```

Important direction warning:

The code does not contain a semantic dictionary that says which side of `CoverOf`, `InterpolatesFrom`, or `DirectlySamples` is historically older. In `computeArtistMetrics`, direction is interpreted mechanically:

- if an influence edge has `target === artist.id`, it increases `influenceReceived`;
- if an influence edge has `source === artist.id`, it increases `influenceGiven`.

For relationships such as `Song A -> DirectlySamples -> Song B`, the relationship name suggests that Song A samples Song B. That would normally mean Song A is influenced by Song B. However, the current code would treat the source as "giving influence" and the target as "receiving influence" only when the endpoint is the artist being measured. For most sample/reference edges, endpoints are songs and albums, not artists, so this issue mostly affects artist-like endpoints in unusual relationship pairs. This is an oral-exam risk and should be stated honestly.

## 3. Relationship Group Classifications

Relationship grouping appears in two places.

### Global metric grouping

File: `frontend/src/data/metrics.js`

```js
const COLLABORATION_TYPES = ['collab', 'feature', 'performer', 'composer', 'producer', 'lyricist', 'member']
const INFLUENCE_TYPES = ['influence', 'interpolates', 'reference', 'cover', 'sample', 'instyleof', 'inspired']
```

Functions:

- `isCollaborationEdge(link)`
- `isInfluenceEdge(link)`
- `classifyRelationship(link)`

The matching is substring-based on `link.edgeTypeKey`. It is not an exact enum lookup.

#### Collaboration / creative group

Raw relationship types matched in this dataset:

- `PerformerOf`
- `ComposerOf`
- `ProducerOf`
- `LyricistOf`
- `MemberOf`

Meaning: these are treated as creative, performance, writing, production, or membership evidence.

Direction:

- For total collaboration counts, direction does not matter.
- In `computeArtistMetrics`, a selected artist gets one collaboration count if they are either source or target of a collaboration edge.

Charts using this:

- KPI hidden detail / overview values
- Artist comparison
- Sailor Shift profile
- Rising-star score
- Timeline collaboration count, although this is not currently the visible line
- External Genre Influence on Oceanus Folk classification

#### Influence group

Raw relationship types matched in this dataset:

- `InStyleOf`
- `InterpolatesFrom`
- `LyricalReferenceTo`
- `CoverOf`
- `DirectlySamples`

The token `reference` matches `LyricalReferenceTo`, `sample` matches `DirectlySamples`, and `instyleof` matches `InStyleOf`.

Meaning: these are treated as evidence of stylistic, sampling, cover, interpolation, or reference relationships.

Direction:

- In total influence counts, direction does not matter.
- In `computeArtistMetrics`, direction matters mechanically: source means influence given, target means influence received.
- In `computeRisingStarScores`, direction does not matter because `countEdgesByArtist` counts both endpoints.

Charts using this:

- Temporal Spread line
- Artist comparison influence received/given
- Sailor Shift profile influence received/given
- Rising-star score
- External Genre Influence on Oceanus Folk
- Overview influence count

#### Other group

Everything that is neither collaboration nor influence becomes `other` in `classifyRelationship`.

In this dataset, this includes:

- `RecordedBy`
- `DistributedBy`

These are release/label/industry context relationships.

### Ego-network relationship focus grouping

File: `frontend/src/components/EgoNetwork.vue`, function `relationshipCategory`.

This is a separate grouping:

| Focus mode | Raw substring logic |
| --- | --- |
| `influence` | includes `interpolates`, `reference`, `cover`, or `sample` |
| `collaboration` | includes `composer`, `producer`, `lyricist`, or `member` |
| `performance` | includes `performer` or `recorded` |
| `genre` | includes `style` or `genre` |
| `other` | anything else |

Important inconsistency:

- `InStyleOf` is an influence link in `metrics.js`.
- `InStyleOf` becomes `genre` in `EgoNetwork.vue`.

This is not necessarily wrong, but the definitions are not identical. During the exam, describe it as: "The dashboard uses a broad influence group for metrics, while the ego network separates style links into a Genre related focus so the analyst can inspect stylistic context."

## 4. Derived Measures and Formulas

### Degree, in-degree, and out-degree

File: `frontend/src/data/metrics.js`, `computeDegrees`.

Formula:

```text
outDegree(v) = |{ e in E : e.source = v }|
inDegree(v)  = |{ e in E : e.target = v }|
degree(v)    = outDegree(v) + inDegree(v)
```

Duplicates are not removed. Direction matters for in/out degree, but total degree ignores direction after counting.

Example:

Sailor Shift:

- degree = 60
- in-degree = 8
- out-degree = 52

### Graph totals

File: `metrics.js`, `computeOverview`.

```text
totalNodes = number of nodes in filtered graph
totalLinks = number of links in filtered graph
artistCount = number of nodes where isArtist(node)
songCount = number of nodes where isSong(node)
albumCount = number of nodes where isAlbum(node)
genreCount = number of nodes where isGenre(node)
```

Because genre is an attribute, not a node type, `genreCount` is 0 in the audited data.

### Creative links

Files:

- `metrics.js`, `isCollaborationEdge`
- `metrics.js`, `computeArtistMetrics`

Formula for artist `a`:

```text
creativeLinks(a) = count of collaboration-class edges incident to a
```

Direction does not matter.

Example:

Sailor Shift has 49 creative links.

### Release links

File: `metrics.js`, `computeArtistMetrics`.

Formula for artist `a`:

```text
releaseLinks(a) = count of links incident to a where the opposite endpoint is Song or Album
```

This is not restricted to a specific relationship type. It counts any incident link to a Song or Album.

Example:

Sailor Shift has 47 release links.

### Influence received and influence given

File: `metrics.js`, `computeArtistMetrics`.

Formula:

```text
influenceReceived(a) = count of influence-class edges where target == a
influenceGiven(a)    = count of influence-class edges where source == a
```

Direction matters. Missing values do not contribute.

Example:

Sailor Shift:

- influence received = 7
- influence given = 4

Limitation:

The code uses graph direction directly. It does not validate whether the semantic direction of every raw influence edge matches the "received/given" label.

### Oceanus links

File: `metrics.js`, `computeArtistMetrics`.

Formula for selected artist `a`:

```text
oceanusLinks(a) = count of incident links where
                 a.genre == "Oceanus Folk"
                 OR oppositeEndpoint.genre == "Oceanus Folk"
```

Because all Person nodes have `Unknown` genre in the audited data, this usually means the artist is linked to Oceanus Folk songs or albums.

Example:

Sailor Shift has 45 Oceanus links.

### Genre diversity

File: `metrics.js`, `computeArtistMetrics`.

Formula:

```text
genreDiversity(a) = number of distinct non-Unknown genres among nodes adjacent to a
```

It uses neighboring node genres. It does not use the artist's own genre, because Person genres are `Unknown`.

Example:

Sailor Shift has genre diversity 3.

### Relationship shares

Files:

- `Dashboard.vue`, `relationshipRows`
- `Dashboard.vue`, `evidenceRows`

Formula:

```text
graphShare(type) = graphCount(type) / totalVisibleLinks * 100
selectedShare(type) = selectedDirectCount(type) / allDirectLinksOfSelectedEntity * 100
```

Example for Sailor Shift:

- direct relationship total = 60
- `PerformerOf` selected count = 26
- selected share = 26 / 60 = 43.3 percent

### Artist connectivity

Files:

- `Dashboard.vue`, `artistConnectivityRows`
- `ArtistBubbleChart.vue`

Rows are based on the top 12 artists by degree in the current filtered graph. For each artist:

- x = creative links
- y = release links
- bubble size = total degree

Bubble radius uses D3 `scaleSqrt`, so bubble area is closer to proportional to degree than if a linear radius scale were used.

### Most connected entities

Files:

- `metrics.js`, `computeOverview`
- `Dashboard.vue`, `topEntityRows`
- `LollipopChart.vue`

Formula:

```text
topEntities = nodes sorted by degree descending, then label ascending
```

Example top entity in full graph:

- Echo Chamber Records, RecordLabel, degree 224.

### Temporal activity

File: `metrics.js`, `computeTimeline`.

Entity rows:

```text
If node.year exists:
  entities[year] += 1
  oceanus[year] += 1 if node.genre == "Oceanus Folk"
```

Link rows:

```text
year = link.year ?? link.sourceNode.year ?? link.targetNode.year
relationships[year] += 1
influences[year] += 1 if isInfluenceEdge(link)
```

In the audited data, links do not have their own years, so source node year or target node year is used.

### Normalized artist comparison

File: `ArtistComparison.vue`, `normalizedArtists`.

Modes:

```text
raw: value = metric
degree: value = metric / max(degree, 1)
releases: value = metric / max(releases, 1)
```

The denominator is forced to at least 1 to avoid division by zero.

Limitation:

All metrics are divided by the same denominator, including genre diversity and release links. This is simple and explainable, but not a statistically rigorous normalization model.

## 5. Rising-Star Heuristic

File: `frontend/src/data/scoring.js`, `computeRisingStarScores`.

### Candidate selection

Candidates are all nodes where `isArtist(node)` returns true. In this dataset, that includes all `Person` nodes and any node with `stage_name`.

Sailor Shift is not excluded. This is why Sailor Shift appears as the top rising-star hypothesis. This is a known interpretation risk: the heuristic ranks graph evidence, not only unknown future artists.

### Exact formula

For artist `a`:

```text
score(a) =
  collaborations(a) * 2
  + influence(a) * 1.5
  + genreDiversity(a) * 1.25
  + recentActivity(a) * 3
  + oceanusSignal(a) * 3
  + sailorConnectionScore(a)
  + ln(1 + degree(a))
  + notablePenalty(a)
```

Where:

- `collaborations` = incident collaboration-class edges.
- `influence` = incident influence-class edges, direction ignored.
- `genreDiversity` = distinct non-Unknown genres among neighbors.
- `recentActivity` = 1 if artist has `year >= 2035`, else 0. In the audited data, Person nodes have no year, so this is usually 0.
- `oceanusSignal` = 2 if artist.genre is exactly `Oceanus Folk`, 1 if artist.genre contains `Oceanus`, else 0. In the audited data, Person genres are `Unknown`, so this is usually 0.
- `sailorConnectionScore` = 2 for Sailor Shift itself, 4 if directly connected to Sailor Shift, 2 if indirectly connected through a common neighbor, else 0.
- `notablePenalty` = -2 if `artist.notable` is true, else 0.

### Component table

| Component | Formula | Weight | Interpretation | Limitation |
| --- | --- | ---: | --- | --- |
| Creative activity | `collaborations * 2` | 2.00 | Artists with many creative/performance/writing links score higher. | Strongly favors high-degree artists. |
| Influence evidence | `incidentInfluenceLinks * 1.5` | 1.50 | Artists near influence-style relationships score higher. | Direction is ignored. |
| Genre diversity | `distinctNeighborGenres * 1.25` | 1.25 | Artists connected to diverse genres score higher. | Depends on neighboring Song/Album genre metadata. |
| Recent activity | `1 or 0` times 3 | 3.00 | Intended to reward activity after 2035. | Person nodes usually lack year, so it rarely matters. |
| Oceanus relevance | `0, 1, or 2` times 3 | 3.00 | Intended to reward Oceanus-labeled artists. | Person genres are `Unknown`, so it rarely matters. |
| Sailor connection | `0, 2, or 4` | fixed | Rewards closeness to Sailor Shift. | Sailor Shift gets anchor score and is not excluded. |
| Degree damping | `ln(1 + degree)` | 1.00 | Adds hub evidence without letting degree dominate linearly. | Still rewards popularity/connectivity. |
| Notable penalty | `-2 if notable` | -2.00 | Intended to reduce established stars. | Person notable is usually absent, so effect is limited. |

### Manual score examples

#### Sailor Shift

Actual values:

- collaborations = 49
- influence = 11
- genre diversity = 3
- recent activity = 0
- Oceanus signal = 0
- Sailor connection score = 2
- degree = 60
- notable penalty = 0

Calculation:

```text
49*2 + 11*1.5 + 3*1.25 + 0*3 + 0*3 + 2 + ln(61) + 0
= 98 + 16.5 + 3.75 + 2 + 4.1109
= 124.3609
```

Displayed as 124.4.

#### Szymon Pyc

Actual values:

- collaborations = 49
- influence = 0
- genre diversity = 5
- recent activity = 0
- Oceanus signal = 0
- Sailor connection score = 0
- degree = 49
- notable penalty = 0

Calculation:

```text
49*2 + 0*1.5 + 5*1.25 + ln(50)
= 98 + 6.25 + 3.9120
= 108.1620
```

Displayed as 108.2.

#### Jay Walters

Actual values:

- collaborations = 47
- influence = 0
- genre diversity = 4
- recent activity = 0
- Oceanus signal = 0
- Sailor connection score = 0
- degree = 47
- notable penalty = 0

Calculation:

```text
47*2 + 4*1.25 + ln(48)
= 94 + 5 + 3.8712
= 102.8712
```

Displayed as 102.9.

### What the heuristic can claim

It can generate hypotheses about artists with strong graph evidence: many creative links, influence links, genre diversity, and graph connectivity.

It cannot prove future success, popularity, artistic quality, or real-world commercial impact. It is not trained, validated, or tested as a predictive model.

## 6. Temporal Spread Timeline

Component: `frontend/src/components/TimelineChart.vue`  
Data function: `frontend/src/data/metrics.js`, `computeTimeline`

### What the bars represent

Bars show `row.oceanus`, the number of visible nodes in that year whose `genre` is exactly `Oceanus Folk`.

These are mostly Song and Album nodes, because Person nodes have `Unknown` genre.

### What the line represents

The line shows `row.influences`, the number of influence-class links assigned to that year.

Influence-class means:

- `InStyleOf`
- `InterpolatesFrom`
- `LyricalReferenceTo`
- `CoverOf`
- `DirectlySamples`

### Year assignment

For nodes:

```text
node.year = releaseYear ?? writtenYear ?? notorietyYear
```

For links:

```text
year = link.year ?? link.sourceNode.year ?? link.targetNode.year
```

In the audited data:

- node with year: 4,611
- links with own year: 0
- min node year: 1975
- max node year: 2040

Therefore link years come from source or target nodes.

### Scales

The bars use `yScale` based on max Oceanus entity count.  
The line uses `lineScale` based on max influence link count.

Both are drawn in the same vertical area, but they use separate y scales. This means the line height and bar height are not directly comparable as values. The chart is meant to compare temporal shape and peaks, not absolute bar-to-line magnitude.

### Peak annotations

The chart computes:

- highest Oceanus activity year: 2023
- highest influence year: 2026

These are computed from the graph, not manually typed, except the note "Sailor Shift became a solo artist in 2028", which is story context.

### Worked example

For 2023, the computed timeline row is:

```text
entities = 405
artists = 0
songs = 332
albums = 73
relationships = 3557
collaborations = 2196
influences = 734
oceanus = 34
```

So the 2023 bar height is based on `oceanus = 34`, while the line point is based on `influences = 734`.

For 2026, the influence peak row is:

```text
entities = 317
songs = 258
albums = 59
relationships = 2939
collaborations = 1732
influences = 739
oceanus = 25
```

### Interaction

- Clicking a year calls `selectYear(year)` in `Dashboard.vue`.
- If the same year is already selected, clicking it again clears the year filter.
- Playback calls `stepYear(1, true)` at an interval controlled by `playbackSpeed`.
- Playback changes the global year filter, so linked views update.
- Missing-year nodes and links are kept visible by `inYearRange`; if year is missing, the item is not removed.

Pseudocode:

```text
for each node:
  if node.year exists:
    row = timeline[node.year]
    row.entities += 1
    if node.genre == "Oceanus Folk":
      row.oceanus += 1

for each link:
  year = link.year or source.year or target.year
  if year exists:
    row = timeline[year]
    row.relationships += 1
    if isInfluenceEdge(link):
      row.influences += 1
```

## 7. Visualization-by-Visualization Explanation

### KPI cards

Component: `SummaryCards.vue`  
Data: `overview` from `computeOverview(filteredGraph)`

Purpose: overview-first summary of visible graph size.

Fields:

- Nodes = visible nodes
- Links = visible links
- Artists = visible Person/artist nodes
- Songs = visible Song nodes

Filters: affected by relationship type, genre context, year range, and degree range. Entity focus does not destructively filter the graph.

Encoding: text KPIs. No chart scale.

Interaction: no direct click interaction. Values update through global filters.

Insight: full graph has 17,412 nodes and 37,857 links.

Limitation: counts indicate dataset coverage, not real-world popularity.

### Sailor Shift Profile

Component: `Dashboard.vue`, template section `dashboard-sailor-panel`  
Data: `sailorProfile` computed property

Purpose: directly supports the MC1 career profile task.

Metrics:

- career span from years in Sailor Shift's two-hop ego network and one-hop links
- Oceanus links from `computeArtistMetrics`
- influence received/given from `computeArtistMetrics`
- creative links from collaboration-class edges
- direct people from one-hop collaboration edges to Person nodes
- indirect people from two-hop Person nodes not already direct
- genre diversity from neighboring genres

Important detail: this profile uses the full graph, not the globally filtered graph.

Insight: Sailor Shift has 45 Oceanus links, 49 creative links, 7 influence received, and 4 influence given.

Limitation: because Person nodes have missing years, career span depends mainly on nearby songs/albums.

### Radial Ego Network

Component: `EgoNetwork.vue`  
Data: full normalized graph, selected center node, filters, network settings  
D3 usage: ordinal color scale, radial layout, SVG paths, node sizing

Purpose: original D3 visualization for local graph exploration around Sailor Shift or another selected entity.

Encoding:

- center = selected entity
- inner ring = direct neighbors
- outer ring = indirect neighbors
- node color = entity type
- node radius = degree-based importance, using `sqrt(degree)` with clipping
- edge line style = relationship category or indirect context
- opacity = focus/highlight state
- stroke color = selected, genre context, or unknown metadata

Interaction:

- hover node: dims unrelated nodes/edges and shows SVG title details
- click node: emits `select`, updates selected entity in `Dashboard.vue`
- network depth: direct only or direct plus indirect
- relationship focus: all, influence, collaboration, performance, genre
- node limit: top 25, 50, or 100
- entity focus: visually emphasizes node type without removing bridge nodes

Insight: Sailor Shift's local graph is dominated by links to songs and creative/performance relationships.

What it does not prove: it does not prove causal influence; it shows graph connectivity evidence.

### Genre Contribution

Component: `BarChart.vue`  
Data: `overview.knownGenres`

Purpose: identify dominant known genres in the current visible graph.

Encoding:

- horizontal bar length = number of visible nodes in that genre
- sorted descending
- teal highlight for selected genre
- gray/low opacity for non-selected genres

Interaction:

- clicking a genre calls `setFilter('genre', genre)`
- clicking again clears it
- the genre filter is contextual: it keeps direct graph context around genre-matching nodes

Insight: Dream Pop is the most common known genre in the full graph, with 742 nodes.

Limitation: since 12,801 nodes have `Unknown` genre, genre patterns are incomplete.

### Entity Composition

Component: `DonutChart.vue`  
Data: `overview.nodeTypes`

Purpose: show the composition of visible entity types.

Encoding:

- donut slice angle = share of visible nodes
- hue = nominal entity type
- center value = total of displayed top entity types

Interaction:

- click a slice or legend row to set `filters.nodeType`
- this is an entity focus in the network and active state, not destructive traversal filtering

Insight: the full graph is dominated by Person nodes.

Limitation: donut angles are less precise than bars, but the category count is small and the chart is mainly for composition.

### Relationship Types

Component: `ColumnChart.vue`  
Data: `relationshipRows` in `Dashboard.vue`

Purpose: show which relationship categories dominate the graph, and when an entity is selected compare that entity's relationship profile with the graph context.

Encoding:

- blue bars = graph-level link counts for relationship types
- green marker/line = selected entity's share of direct links for that type
- teal bars in selected-only mode = selected entity direct link counts
- x axis = relationship type, displayed as readable labels such as "Performer Of"
- y axis = graph count in compare mode, selected count in selected-only mode

Pagination:

- rows sorted by graph frequency descending
- default page size equals `limit`, currently 6
- right arrow shows less frequent relationship types
- left arrow returns to previous page
- y-axis scale is global across all sorted rows in the current mode, not page-local

Interaction:

- click bar = set global relationship type filter
- local mode select = compare with graph or selected only
- tooltip shows graph count, selected count, incoming, outgoing, selected share, and graph share

Sailor Shift example:

- total direct links = 60
- PerformerOf = 26 direct links, 43.3 percent of Sailor Shift direct links
- LyricistOf = 21 direct links, 35.0 percent
- InStyleOf = 4 direct links, 6.7 percent

Important limitation:

The green marker and blue bar do not use the same unit. Blue bars are counts. Green markers are selected-profile percentages.

### Temporal Spread of Oceanus Folk

Component: `TimelineChart.vue`  
Data: `timelineOverview.timeline`

Purpose: answer whether Oceanus Folk growth appears gradual or intermittent.

Encoding:

- columns = Oceanus Folk entities by year
- line = influence-class links by year
- x = time from 1975 to 2040
- bar y-scale and line y-scale are separate
- selected year is teal

Interaction:

- click year = global year filter
- play = automatically steps through years
- step back/forward = one-year movement through available years
- reset year = clears year filter

Insight: Oceanus activity peaks in 2023; influence links peak in 2026.

Limitation: missing-year items remain visible under filters, so time filters are conservative rather than strict.

### Rising-Star Hypotheses

Component: `RankedBarChart.vue`  
Data: `risingStarRows` from `computeRisingStarScores(filteredGraph)`

Purpose: rank artists by a transparent heuristic score.

Encoding:

- horizontal bar length = heuristic score
- orange color distinguishes hypothesis/ranking from structural graph charts
- selected row background = currently selected entity

Interaction:

- clicking a row selects that artist and refocuses linked views

Insight: full graph top ranked artists include Sailor Shift, Szymon Pyc, Jay Walters, Kimberly Snyder, Ping Tian, and Angelika Osojca.

Limitation: this is not a validated predictive model. Sailor Shift appears because established stars are not excluded.

### Artist Comparison

Component: `ArtistComparison.vue`  
Data: `comparisonArtists` from `computeArtistMetrics(filteredGraph, comparisonArtistIds)`

Purpose: compare three selected artists across multiple career/influence signals.

Metrics:

- Oceanus links
- Influence received
- Influence given
- Creative links
- Release links
- Genre diversity

Encoding:

- grouped horizontal bars
- x-position/length = metric value
- color hue = selected artist
- shared scale across artists

Interaction:

- dropdowns replace artists
- normalization mode changes formulas
- clicking legend/name selects artist

Insight: raw mode often favors artists with many total links; normalized mode can reduce that dominance.

Limitation: normalization is simple and not a statistical adjustment.

### Degree Distribution

Component: `HistogramChart.vue`  
Data: `degreeDistribution` in `Dashboard.vue`

Purpose: show whether the graph has many low-degree nodes or a few hubs.

Bins:

- 0
- 1-2
- 3-5
- 6-10
- 11-20
- 21-50
- 51+

Encoding:

- columns = number of entities in each degree bin
- x = degree interval
- y = entity count
- y-axis starts at zero

Interaction:

- click bin = set degree range filter
- click active bin again clears it

Insight: the graph is long-tailed, with many low-degree entities and few hubs.

Limitation: binning hides variation inside each interval.

### Evidence Table

Component: `EvidenceTable.vue`  
Data: first five `relationshipRows`

Purpose: exact numerical support for relationship patterns.

Columns:

- Relationship
- Graph links
- Entity links, if an entity is selected
- Share

Interaction:

- click row = set relationship type filter
- row highlights if related to selected entity

Insight: PerformerOf is the most common relationship type in the full graph, 13,587 links, 35.9 percent.

Limitation: it only shows the top five rows.

### Most Connected Entities

Component: `LollipopChart.vue`  
Data: `topEntityRows`

Purpose: identify graph hubs.

Encoding:

- lollipop line/dot position = degree
- label = entity name
- selected entity has larger teal dot

Interaction:

- click entity = select and refocus network

Insight: Echo Chamber Records is the highest-degree entity in the full graph.

Limitation: degree is connectivity, not causal importance.

### Artist Connectivity

Component: `ArtistBubbleChart.vue`  
Data: `artistConnectivityRows`

Purpose: compare top artists by creative links and release links.

Encoding:

- x-position = creative links
- y-position = release links
- bubble area roughly encodes degree through a square-root radius scale
- diagonal guide = balanced creative/release connectivity
- right panel = top 10 connected artists or search matches

Interaction:

- hover bubble = tooltip
- click bubble or side row = select artist
- search filters the side list only

Insight: Sailor Shift appears near the high end of both creative and release links.

Limitation: axes use padded extents rather than zero, which is acceptable for scatterplots but should not be read like bar lengths.

### External Genre Influence on Oceanus Folk

Component: `StackedGenreChart.vue`  
Data: `overview.oceanusGenres` from `computeOceanusGenreLinks`

Purpose: show external genres connected to Oceanus Folk through links involving Oceanus Folk nodes.

Encoding:

- stacked horizontal bar length = total links connecting that external genre to Oceanus Folk nodes
- segment color = relationship class: influence, creative, other
- currently displayed top rows contain only influence links, so the chart shows the note "The current view contains only influence links."

Interaction:

- click genre = set global genre filter

Insight: Indie Folk is the strongest external genre linked to Oceanus Folk in the full graph, with 142 links.

Limitation: because the current top rows are all influence, this chart mostly documents stylistic/influence diffusion, not collaboration diffusion.

## 8. Radial Ego Network Algorithm

An ego network is the local neighborhood around a selected node, called the ego. In this project, the default ego is Sailor Shift.

### Data pipeline

File: `EgoNetwork.vue`, computed `visibleNetwork`.

1. Start with the full graph.
2. Build an ego network around `centerNode.id` using `getEgoNetwork(graph, centerId, depth)`.
3. Filter ego links by relationship type and relationship focus.
4. Apply year range to nodes and links.
5. If a genre is selected, identify genre seed nodes and keep context/bridge nodes.
6. Rank candidate nodes by distance, genre role, degree, and label.
7. Keep the top `nodeLimit`.
8. Draw only links whose endpoints are both selected for display.

### Direct and indirect neighbors

File: `metrics.js`, `getEgoNetwork`.

The traversal uses undirected neighbors from `buildNeighbors`. Edge direction is not used for graph distance.

```text
included = {center}
frontier = {center}
repeat hops times:
  next = empty set
  for each id in frontier:
    for each neighbor of id:
      if neighbor not included:
        add neighbor to included
        add neighbor to next
  frontier = next
```

### Ring assignment

File: `EgoNetwork.vue`, `positionedNodes`.

- distance 0: center
- distance 1: inner ring
- distance 2: outer ring

Angular position is assigned evenly around each ring:

```text
angle = index / numberOfItemsInRing * 2pi - pi/2
x = centerX + cos(angle) * radius
y = centerY + sin(angle) * radius
```

### Node prioritization

When too many nodes exist:

```text
sort by:
  distance ascending
  genre role descending
  degree descending
  label ascending
take first nodeLimit
```

Genre role rank:

- seed = direct match to selected genre
- context = neighbor of genre seed
- bridge = retained to preserve explanation

### What makes it original

It is not a standard force-directed hairball. It is a task-specific radial influence map:

- fixes the selected entity in the center;
- separates direct and indirect context into rings;
- limits node count;
- allows relationship focus;
- keeps bridge nodes for interpretability;
- uses entity focus as visual emphasis instead of destructive graph filtering;
- uses D3 scales and SVG paths but remains explainable.

## 9. Filtering, Selection, Highlighting, and Linked Views

### Shared state

Defined in `Dashboard.vue`.

| State variable | Default | Changed by | Meaning | Filters or presentation? |
| --- | --- | --- | --- | --- |
| `selectedNode` | Sailor Shift | network, ranking, lollipop, artist comparison, artist connectivity | selected investigation entity | selection/refocus, not global filtering |
| `comparisonArtistIds` | Sailor Shift plus top two artists | artist comparison dropdowns, selected Person | selected artists for comparison | local comparison state |
| `relationshipChartMode` | `compare` | Relationship Types local select | compare graph vs selected profile, or selected only | local chart mode |
| `learningMode` | false | header toggle | open all Visual Guides | presentation/help |
| `networkSettings.depth` | `2` | network control | one-hop or two-hop ego network | local network traversal |
| `networkSettings.relationshipFocus` | `all` | network control | relationship category focus | local network link filtering |
| `networkSettings.nodeLimit` | 50 | network control | max displayed ego nodes | local network display limit |
| `filters.nodeType` | empty | filter panel, donut | entity focus | visual focus, not destructive global filter |
| `filters.edgeType` | empty | filter panel, relationship chart, evidence table | relationship type filter | global link filter |
| `filters.genre` | empty | filter panel, genre charts | genre context filter | global context filter |
| `filters.startYear` | empty | filter panel, timeline | time filter | global filter |
| `filters.endYear` | empty | filter panel, timeline | time filter | global filter |
| `filters.degreeRange` | null | degree histogram | degree bin filter | global filter after degree calculation |
| `isPlaying` | false | timeline controls | playback state | temporal interaction |
| `playbackSpeed` | 900 | timeline speed select | playback interval | temporal interaction |

### Filter pipeline

File: `Dashboard.vue`, `buildFilteredGraph`.

1. Apply time filter to nodes unless `ignoreTime`.
2. If a genre is selected, build a genre context set:
   - nodes whose genre or label matches selected genre;
   - direct neighbors of those nodes.
3. Keep links whose endpoints are visible.
4. Apply relationship type filter to links.
5. Apply time filter to links unless `ignoreTime`.
6. Apply degree range filter after computing degrees on this intermediate graph.
7. Attach recalculated `degreeById`.

Entity focus is deliberately not applied as a destructive node filter.

### Cross-filter matrix

| Interaction source | Network | Timeline | Genre chart | Relationship chart | Artist comparison | KPIs | Other |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Filter panel relationship | filters links | updates through filtered graph | updates | selected relationship highlighted | updates | updates | evidence table updates |
| Filter panel genre | contextual focus | updates with `timelineGraph` unless time ignored | selected bar | updates | updates | updates | External Genre Influence on Oceanus Folk highlights |
| Timeline year click | network year context | selected year | updates | updates | updates | updates | state strip updates |
| Ego node click | recenters network | no hard filter | no hard filter | selected profile overlay | may add person to comparison | no hard filter | selected state updates |
| Rising-star click | recenters network | no hard filter | no hard filter | selected profile overlay | selected person may enter comparison | no hard filter | row highlighted |
| Relationship bar click | filters links | updates | updates | highlights/filter active | updates | updates | evidence table matches |
| Degree histogram click | filters by degree bin | updates | updates | updates | updates | updates | centrality view changes |
| Donut entity click | visual entity focus | mostly unaffected | unaffected except state | unaffected | unaffected | mostly unchanged | network de-emphasizes other types |
| Reset dashboard | returns Sailor Shift | clears time | clears genre | compare mode | default artists | full graph | clears network settings |

## 10. Relationship Types Chart Details

Component: `ColumnChart.vue`  
Data source: `Dashboard.vue`, `relationshipRows`

### Graph totals

Graph totals are `overview.edgeTypes`, produced by `groupCounts(filteredGraph.links, link.edgeType)`.

### Selected profile

Computed in `Dashboard.vue`, `selectedRelationshipProfile`.

For selected entity `s`:

```text
for each link in filteredGraph.links:
  if source == s or target == s:
    count link.edgeType
    if target == s: incoming += 1
    if source == s: outgoing += 1
    if source == s and target == s: count once as incoming
```

### What the marks mean

In compare mode:

- blue bar = graph total count
- green line/dot = selected entity's percentage share among its direct links

In selected-only mode:

- teal bar = selected entity direct link count

The green marker does not use the graph count scale. It uses `selectedShareScale`.

### Pagination

Rows are sorted by:

1. graph count descending
2. selected count descending
3. label ascending

Each page shows `limit` rows, currently 6. Page labels such as `1-6 of 12` show whether more relationship types exist. The y-axis uses the maximum over all sorted rows in the current mode, not just the current page.

## 11. Artist Comparison Metrics

Component: `ArtistComparison.vue`  
Data source: `computeArtistMetrics`

Metrics:

| Metric | Formula |
| --- | --- |
| Oceanus links | incident links where selected artist or opposite endpoint has `genre == Oceanus Folk` |
| Influence received | influence edges where target is artist |
| Influence given | influence edges where source is artist |
| Creative links | collaboration-class incident edges |
| Release links | incident links where opposite endpoint is Song or Album |
| Genre diversity | distinct non-Unknown neighbor genres |

Raw mode uses raw counts.

Normalized by degree:

```text
metric / max(degree, 1)
```

Normalized by releases:

```text
metric / max(releases, 1)
```

Why normalization exists: raw counts can make generally connected artists dominate every metric. Normalization can show whether a metric is strong relative to total graph activity.

Limitation: normalized metrics are simple ratios, not statistical controls. Some ratios, such as release links divided by releases, may become mechanically high.

## 12. Missing and Unknown Data

### Unknown genre

Detected by `formatUnknown` in `dateUtils.js` and `normalizeNode`.

Behavior:

- missing genre becomes `Unknown`;
- genre contribution uses `overview.knownGenres`, excluding Unknown;
- entity/network tooltips still show Unknown;
- unknown genre nodes have lower opacity and amber stroke in the ego network.

Bias:

Because all Person, RecordLabel, and MusicalGroup nodes have Unknown genre in the audited data, genre analysis mostly describes songs and albums.

### Missing year

Detected by `extractYear`, which returns null if no 19xx or 20xx year is found.

Behavior:

- timeline does not plot missing-year nodes;
- time filters do not remove missing-year nodes or links because `inYearRange` returns true for missing years.

Bias:

Time filtering is conservative. It avoids losing missing metadata, but it also means filtered years may still include undated artists, labels, and groups.

### Missing entity type

`normalizeNode` converts missing type to `Unknown`. No `Unknown` node type was found in the audited node type counts.

### Invalid links

No dangling sources or targets were found in the data. The code still uses optional chaining in many places.

### Duplicate data

No duplicate raw node IDs or raw edge keys were found in the audit. The code does not deduplicate links in normal metric calculations.

### Empty strings and nulls

`formatUnknown` converts `null`, `undefined`, and empty string to `Unknown`.

## 13. Claims Versus Evidence

### What the system can support

| Claim type | Evidence |
| --- | --- |
| Structural connectivity | Degree, ego network, most connected entities |
| Relationship frequency | Relationship Types and Evidence Table |
| Temporal patterns in metadata | Timeline bars and line |
| Genre association | Genre Contribution and External Genre Influence on Oceanus Folk |
| Artist comparison | Artist Comparison and Artist Connectivity |
| Rising-star hypotheses | Transparent heuristic score |

### What the system cannot prove

| Unsupported claim | Why not |
| --- | --- |
| Artistic quality | No audio, reviews, or qualitative ratings are analyzed. |
| Real-world popularity | No streaming, sales, social media, or chart data is present. |
| Causal influence | Graph links are evidence, not causal proof. |
| Future commercial success | Rising-star score is not trained or validated. |
| Complete historical truth | Missing genres and years limit interpretation. |
| Absence of a relationship | Missing data may hide relationships. |
| Geographic spread | No explicit geographic fields are used. |

## 14. Oral-Exam Questions and Model Answers

Each question includes a short answer, a deeper answer, and a code reference.

### Dataset and preprocessing

1. **What is the dataset?**  
Short: It is a directed multigraph about music entities and relationships.  
Deep: The graph contains 17,412 nodes and 37,857 directed links. Nodes include people, songs, albums, record labels, and musical groups. Links include performer, composer, producer, label, membership, and influence-style relationships.  
Code: `graphLoader.js`, `graphTransforms.js`.

2. **What is a knowledge graph here?**  
Short: Entities are nodes and music relationships are edges.  
Deep: A song, artist, label, or album is a node. A relationship such as `PerformerOf` or `CoverOf` is a typed directed edge. This supports graph traversal and linked visual analysis.  
Code: `normalizeNode`, `normalizeLink`.

3. **How are missing values handled?**  
Short: Empty, null, or undefined values become `Unknown`.  
Deep: `formatUnknown` turns missing text fields into `Unknown`; `extractYear` returns null for missing dates. The UI keeps missing-year items visible under time filters to avoid losing incomplete metadata.  
Code: `dateUtils.js`, `Dashboard.vue` `inYearRange`.

4. **Does the dataset contain geography?**  
Short: No explicit geography is used.  
Deep: The code does not load countries, coordinates, cities, or map layers. Spread is interpreted as musical ecosystem diffusion through genres, artists, songs, albums, labels, and time.  
Code: no geographic fields found in data-processing files.

5. **Why is genre often Unknown?**  
Short: Genre is mostly present on songs and albums, not people or labels.  
Deep: All audited Person, RecordLabel, and MusicalGroup nodes have `Unknown` genre. This means artist genre is usually inferred indirectly through neighboring songs/albums.  
Code: `normalizeNode`, data audit.

6. **How are identifiers normalized?**  
Short: IDs are kept from raw nodes; link endpoints are converted to IDs.  
Deep: `getEndpointId` handles endpoints that are objects or primitive IDs. Normalized links store `source`, `target`, `sourceNode`, and `targetNode`.  
Code: `graphTransforms.js`, `getEndpointId`, `normalizeLink`.

### Relationship definitions

7. **What exactly is an influence link?**  
Short: It is a relationship whose type matches influence tokens.  
Deep: In metrics, influence means edge type contains `influence`, `interpolates`, `reference`, `cover`, `sample`, `instyleof`, or `inspired`. In this dataset that includes `InStyleOf`, `InterpolatesFrom`, `LyricalReferenceTo`, `CoverOf`, and `DirectlySamples`.  
Code: `metrics.js`, `INFLUENCE_TYPES`.

8. **What is a creative link?**  
Short: It is a collaboration-class relationship.  
Deep: It matches `collab`, `feature`, `performer`, `composer`, `producer`, `lyricist`, or `member`. In this data it includes performer, composer, producer, lyricist, and member links.  
Code: `metrics.js`, `COLLABORATION_TYPES`.

9. **Does direction matter?**  
Short: Sometimes.  
Deep: Degree uses direction for in/out counts. Artist influence received/given uses target/source. But rising-star influence counts ignore direction and count both endpoints.  
Code: `computeDegrees`, `computeArtistMetrics`, `countEdgesByArtist`.

10. **How is influence direction determined?**  
Short: Mechanically from source and target.  
Deep: `computeArtistMetrics` treats target as receiving influence and source as giving influence. This may not perfectly match semantic direction for names like `DirectlySamples`, so it is a limitation.  
Code: `metrics.js`, `computeArtistMetrics`.

11. **Can a relationship belong to multiple groups?**  
Short: In counts yes conceptually, but `classifyRelationship` returns one class.  
Deep: `isCollaborationEdge` and `isInfluenceEdge` are independent predicates, but `classifyRelationship` checks influence first, then creative, then other.  
Code: `metrics.js`, `classifyRelationship`.

12. **Why is `InStyleOf` sometimes influence and sometimes genre-related?**  
Short: The metric grouping and network focus grouping differ.  
Deep: Metrics classify `InStyleOf` as influence. The ego network's `relationshipCategory` classifies style links as genre-related so users can isolate style context. This should be explained as a design choice and inconsistency.  
Code: `metrics.js`, `EgoNetwork.vue`.

### Metrics and formulas

13. **How is degree calculated?**  
Short: In-degree plus out-degree.  
Deep: Every link increments source out-degree and target in-degree. Total degree is their sum. No deduplication is applied.  
Code: `metrics.js`, `computeDegrees`.

14. **Why is degree not the same as importance?**  
Short: Degree only counts links.  
Deep: A high-degree label or song may be structurally central but not necessarily artistically influential or popular outside the dataset.  
Code: `LollipopChart.vue`, `computeDegrees`.

15. **How are Oceanus links calculated?**  
Short: Incident links to Oceanus Folk nodes.  
Deep: For an artist, the code counts links where the artist or the opposite endpoint has genre `Oceanus Folk`. Since people have Unknown genre, it usually means linked to Oceanus songs/albums.  
Code: `metrics.js`, `computeArtistMetrics`.

16. **How is genre diversity calculated?**  
Short: Count distinct neighboring genres.  
Deep: For selected artists, the code gathers genres of adjacent nodes, excludes Unknown, and counts the distinct set.  
Code: `metrics.js`, `computeArtistMetrics`.

17. **Are duplicate links removed?**  
Short: No.  
Deep: The metric functions count links as records. The audit found no duplicate raw edge keys, but the code does not deduplicate by default.  
Code: `computeDegrees`, `computeOverview`.

18. **Do metrics change after filtering?**  
Short: Most dashboard metrics do.  
Deep: KPI, relationship types, genre contribution, comparison, rising stars, degree distribution, and rankings use `filteredGraph`. Sailor Shift Profile uses the full graph.  
Code: `Dashboard.vue`, computed values.

### Rising-star heuristic

19. **How is the rising-star score calculated?**  
Short: Weighted sum of creative links, influence links, genre diversity, recent activity, Oceanus relevance, Sailor closeness, log degree, and notable penalty.  
Deep: The exact formula is in `computeRisingStarScores`. It is intentionally simple and explainable, not machine learning.  
Code: `scoring.js`.

20. **Why is Sailor Shift shown in the rising-star ranking?**  
Short: The code does not exclude established stars.  
Deep: All artist nodes are candidates. Sailor Shift has many creative and influence links, so she ranks highly. This is a limitation if the task is strictly future stars.  
Code: `scoring.js`, `artistNodes.map`.

21. **Is the rising-star model validated?**  
Short: No.  
Deep: There is no training set, test set, or statistical validation. It is a transparent hypothesis generator for visual analytics.  
Code: `scoring.js` comment and formula.

22. **What is the biggest weakness of the score?**  
Short: It strongly rewards high creative degree.  
Deep: The largest term is `collaborations * 2`, so well-connected artists dominate. Recent and Oceanus terms often do not matter because Person metadata lacks year and genre.  
Code: `scoring.js`.

23. **Does the score use influence received or given?**  
Short: No, it uses combined incident influence links.  
Deep: `countEdgesByArtist` increments both source and target for influence edges. Direction is ignored in the score.  
Code: `scoring.js`, `countEdgesByArtist`.

24. **What does the score predict?**  
Short: It does not truly predict; it ranks hypotheses.  
Deep: It suggests artists worth investigating based on graph evidence. It cannot guarantee future success.  
Code: `RankedBarChart.vue`, method note.

### Timeline

25. **What do the timeline bars show?**  
Short: Oceanus Folk entities by year.  
Deep: `computeTimeline` increments `oceanus` for nodes whose genre equals `Oceanus Folk` and have a year.  
Code: `metrics.js`, `computeTimeline`.

26. **What does the timeline line show?**  
Short: Influence-class links by year.  
Deep: Links are assigned to `link.year`, or source year, or target year. The line counts influence-class relationships.  
Code: `computeTimeline`, `TimelineChart.vue`.

27. **Are the timeline bars and line directly comparable?**  
Short: No.  
Deep: They use separate y scales and different units. The chart compares temporal patterns, not exact bar-to-line magnitudes.  
Code: `TimelineChart.vue`, `yScale` and `lineScale`.

28. **How does playback work?**  
Short: It changes the selected year over time.  
Deep: `playTimeline` starts an interval. Each step calls `selectYear`, which updates the global year filter and recomputes linked views.  
Code: `Dashboard.vue`, `playTimeline`, `stepYear`.

29. **How are missing years treated?**  
Short: They are not removed by time filters.  
Deep: `inYearRange` returns true when year is missing, preserving incomplete metadata.  
Code: `Dashboard.vue`, `inYearRange`.

### Radial ego network

30. **Why use a radial layout instead of a force-directed graph?**  
Short: It is more structured and explainable.  
Deep: A force graph can become a hairball. The radial layout fixes the ego in the center, separates direct and indirect context, and makes graph distance visually clear.  
Code: `EgoNetwork.vue`.

31. **How are direct and indirect nodes selected?**  
Short: By undirected BFS from the selected center.  
Deep: `getEgoNetwork` uses neighbor sets and expands one or two hops depending on network depth.  
Code: `metrics.js`, `getEgoNetwork`.

32. **Does entity focus remove bridge nodes?**  
Short: No.  
Deep: Entity focus changes opacity and size. It does not filter traversal, so songs/albums can remain as bridges between people.  
Code: `EgoNetwork.vue`, `isNodeTypeFocused`, `nodeOpacity`.

33. **How does genre focus work in the network?**  
Short: It keeps genre matches plus context and bridges.  
Deep: Genre seed nodes are nodes whose genre or label matches. The network keeps direct context and bridge nodes to avoid collapse.  
Code: `EgoNetwork.vue`, `visibleNetwork`.

34. **How is node size calculated?**  
Short: From degree with square root and clipping.  
Deep: Non-center radius is `3.8 + sqrt(degree) * 0.8`, clipped between 4.5 and 10.5. Center radius is 19.  
Code: `EgoNetwork.vue`, `nodeRadius`.

35. **How are edges styled?**  
Short: Influence is dashed, indirect is dotted, other/direct is solid.  
Deep: `edgeStrokeDash` uses the relationship category and whether either endpoint is on the outer ring.  
Code: `EgoNetwork.vue`, `edgeStrokeDash`.

36. **What makes the D3 visualization original?**  
Short: It is a task-specific radial ego map, not a generic graph viewer.  
Deep: It combines BFS traversal, ring layout, node limiting, relationship focus, genre bridges, entity focus, and linked selection.  
Code: `EgoNetwork.vue`.

### Linked views and interaction

37. **What are linked displays?**  
Short: Multiple views respond to shared state.  
Deep: A genre click, year click, or relationship filter changes `filters`, which recomputes `filteredGraph` and updates KPIs, charts, rankings, and tables.  
Code: `Dashboard.vue`, `filteredGraph`.

38. **What changes globally and what changes locally?**  
Short: Filters are global; chart modes and network settings are local.  
Deep: `filters.edgeType`, `filters.genre`, year, and degree affect `filteredGraph`. `relationshipChartMode` only affects Relationship Types. Network depth only affects the ego network.  
Code: `Dashboard.vue`.

39. **What does selecting an artist do?**  
Short: It changes the selected entity, not the global graph filter.  
Deep: `selectNode` sets `selectedNode`, recenters the network, updates relationship profile overlays, and may update comparison artists.  
Code: `Dashboard.vue`, `selectNode`.

40. **How does reset work?**  
Short: It clears filters and returns to Sailor Shift.  
Deep: `resetDashboard` clears global filters, resets network settings and relationship mode, restores comparison artists, and selects Sailor Shift.  
Code: `Dashboard.vue`, `resetDashboard`.

41. **How does Learning Mode work?**  
Short: It expands Visual Guide panels.  
Deep: `learningMode` is global. `LearningHint.vue` also allows each chart to override locally.  
Code: `Dashboard.vue`, `LearningHint.vue`.

### Chart choice and visual variables

42. **Why use bar charts for genres and rankings?**  
Short: Bars support accurate categorical comparison by length.  
Deep: Genre contribution and ranking tasks require comparing category magnitudes, where aligned bar lengths are effective.  
Code: `BarChart.vue`, `RankedBarChart.vue`.

43. **Why use a donut chart for entity composition?**  
Short: It shows a small part-to-whole distribution.  
Deep: The entity types are few and categorical. A donut is acceptable for overview composition, but not for precise comparison.  
Code: `DonutChart.vue`.

44. **Why use a histogram for degree?**  
Short: It summarizes a distribution.  
Deep: Thousands of degree values would be unreadable individually. Binning reveals the long-tail structure.  
Code: `Dashboard.vue`, `degreeDistribution`, `HistogramChart.vue`.

45. **Why use a scatter/bubble plot for artist connectivity?**  
Short: It shows relationships between creative links and releases.  
Deep: Position encodes two quantitative metrics; bubble size adds total degree. It reveals balanced or unusual artists.  
Code: `ArtistBubbleChart.vue`.

46. **How do you avoid misleading bubble sizes?**  
Short: Bubble radius uses a square-root scale.  
Deep: Since viewers perceive area, `scaleSqrt` makes area closer to the encoded degree value than a linear radius scale.  
Code: `ArtistBubbleChart.vue`, `radiusScale`.

47. **Why combine bars and a line in the timeline?**  
Short: They show two temporal signals together.  
Deep: Bars show Oceanus entity activity; the line shows influence-link activity. They use separate scales, so the pattern should be compared, not exact height.  
Code: `TimelineChart.vue`.

48. **Why use a lollipop chart for centrality?**  
Short: It is a compact ranking.  
Deep: It reduces ink compared with full bars while preserving aligned position for degree comparison.  
Code: `LollipopChart.vue`.

### Limitations and alternatives

49. **What is the main data limitation?**  
Short: Missing genre and year metadata.  
Deep: People, labels, and groups mostly have Unknown genre and no year. Temporal and genre analysis therefore relies heavily on songs and albums.  
Code: `normalizeNode`, data audit.

50. **Could this be done in Gephi or Cytoscape?**  
Short: Partly, but not with the same task workflow.  
Deep: Gephi and Cytoscape are strong for graph exploration, but this dashboard combines graph, timeline, External Genre Influence on Oceanus Folk, rankings, comparison, and guided Visual Guides in one MC1-specific workflow.  
Code: whole dashboard architecture.

51. **Why not show the full graph?**  
Short: It would become unreadable.  
Deep: The full graph has 17,412 nodes and 37,857 links. The ego network uses a subset rule and node limit to support focus plus context.  
Code: `EgoNetwork.vue`, `visibleNetwork`.

52. **What would you improve before final publication?**  
Short: Exclude established stars from rising candidates and clarify influence direction.  
Deep: The heuristic currently includes Sailor Shift and uses simple direction assumptions. A stronger version would use a curated candidate set and semantic direction mapping per relationship type.  
Code: `scoring.js`, `metrics.js`.

## 15. One-Page Project Summary

The Rise of Oceanus Folk dashboard is a Vue and D3 visual analytics system for exploring the VAST 2025 MC1 music knowledge graph. The graph contains 17,412 entities and 37,857 directed relationships connecting people, songs, albums, record labels, and musical groups. The dashboard is centered by default on Sailor Shift and supports the main MC1 tasks: profiling her career context, exploring direct and indirect collaborations, studying Oceanus Folk temporal growth, identifying connected genres, comparing artists, and generating rising-star hypotheses.

The main original visualization is a D3 radial ego network. It avoids a full graph hairball by showing only the selected entity's local one-hop or two-hop context. Direct neighbors appear in the inner ring and indirect neighbors appear in the outer ring. Node color encodes entity type, node size reflects degree, and edge style reflects relationship category. Controls allow network depth, relationship focus, node limit, and entity focus.

The dashboard uses linked displays. Global filters for relationship type, genre, year, and degree recompute a shared filtered graph. KPIs, genre contribution, relationship types, timeline, centrality, artist comparison, and rankings update from this shared state. Selecting an artist does not remove graph context; instead it recenters the network and adds profile comparison in the relationship chart.

The rising-star score is a transparent heuristic, not machine learning. It combines creative links, incident influence links, genre diversity, recent activity, Oceanus relevance, Sailor Shift proximity, log degree, and a notable penalty. It helps generate hypotheses but cannot prove future success.

The main limitations are missing metadata and simple assumptions. Most Person, RecordLabel, and MusicalGroup nodes have Unknown genre and no year. Link direction is used mechanically, which may not perfectly match the semantics of cover/sample/interpolation relationships. Therefore the dashboard supports exploration and hypothesis generation, not final truth.

## 16. Complete Glossary

| Term | Meaning in this project |
| --- | --- |
| Knowledge graph | A directed graph of music entities and relationships. |
| Node/entity | Person, Song, Album, RecordLabel, or MusicalGroup. |
| Edge/link | Typed directed relationship such as `PerformerOf`. |
| Ego network | Local neighborhood around selected entity. |
| Direct neighbor | One-hop node connected to selected entity. |
| Indirect neighbor | Two-hop node reachable through one intermediate node. |
| Degree | In-degree plus out-degree. |
| In-degree | Number of incoming links. |
| Out-degree | Number of outgoing links. |
| Creative link | Collaboration-class edge such as performer, composer, producer, lyricist, member. |
| Influence link | Influence-class edge such as style, cover, sample, interpolation, reference. |
| Oceanus link | Incident link to an Oceanus Folk node. |
| Genre diversity | Number of distinct known genres among neighbors. |
| Entity focus | Visual emphasis by node type, not destructive filtering. |
| Relationship focus | Local ego-network relationship category filter. |
| Genre context filter | Global genre filter that keeps direct graph context. |
| Visual Guide | Per-chart explanation panel. |
| Learning Mode | Global toggle that opens Visual Guides. |

## 17. Formulas Cheat Sheet

```text
degree(v) = inDegree(v) + outDegree(v)
outDegree(v) = count(e.source == v)
inDegree(v) = count(e.target == v)

creativeLinks(a) = count(collaboration-class edges incident to a)
releaseLinks(a) = count(incident edges where opposite endpoint is Song or Album)
influenceReceived(a) = count(influence edges where target == a)
influenceGiven(a) = count(influence edges where source == a)
oceanusLinks(a) = count(incident edges where a.genre == Oceanus Folk or neighbor.genre == Oceanus Folk)
genreDiversity(a) = count(distinct non-Unknown genres among neighbors)

graphShare(type) = graphCount(type) / totalVisibleLinks * 100
selectedShare(type) = selectedDirectCount(type) / selectedDirectLinkTotal * 100

risingScore =
  collaborations*2
  + incidentInfluence*1.5
  + genreDiversity*1.25
  + recentActivity*3
  + oceanusSignal*3
  + sailorConnectionScore
  + ln(1 + degree)
  + notablePenalty

normalizedByDegree(metric) = metric / max(degree, 1)
normalizedByReleases(metric) = metric / max(releases, 1)
```

## 18. Relationship Groups Cheat Sheet

Metrics grouping in `metrics.js`:

| Group | Raw relationships in this data |
| --- | --- |
| Creative/collaboration | `PerformerOf`, `ComposerOf`, `ProducerOf`, `LyricistOf`, `MemberOf` |
| Influence | `InStyleOf`, `InterpolatesFrom`, `LyricalReferenceTo`, `CoverOf`, `DirectlySamples` |
| Other | `RecordedBy`, `DistributedBy` |

Ego-network focus grouping in `EgoNetwork.vue`:

| Focus | Raw relationships |
| --- | --- |
| Influence | `InterpolatesFrom`, `LyricalReferenceTo`, `CoverOf`, `DirectlySamples` |
| Collaboration | `ComposerOf`, `ProducerOf`, `LyricistOf`, `MemberOf` |
| Performance | `PerformerOf`, `RecordedBy` |
| Genre related | `InStyleOf` |
| Other | Remaining types |

## 19. Filters and Interactions Cheat Sheet

| Control/action | Type | Result |
| --- | --- | --- |
| Entity focus | visual focus | highlights selected node type, keeps bridges |
| Relationship type filter | global filter | keeps only selected raw relationship type |
| Genre filter | global context filter | keeps genre seed nodes and direct context |
| From/to year | global filter | removes dated items outside range, keeps missing-year items |
| Degree histogram click | global degree filter | keeps nodes in selected degree bin |
| Network depth | local network control | one-hop or two-hop ego network |
| Relationship focus | local network control | filters ego-network links by broad category |
| Node limit | local network control | limits displayed ego nodes |
| Timeline play | global temporal interaction | steps year filter through time |
| Rising-star click | selection | selects artist, recenters network |
| Relationship bar click | global filter | sets raw relationship type |
| Reset dashboard | reset | clears filters, resets settings, selects Sailor Shift |
| Clear filters | partial reset | clears global filters, preserves selection |

## 20. Top 20 Oral-Exam Risks

1. Sailor Shift appears in the rising-star ranking because established stars are not excluded.
2. Rising-star score is not validated as a prediction model.
3. Person genres are all Unknown in the audited data.
4. Person years are missing, weakening artist career timing.
5. Timeline bars and line use separate y scales.
6. Missing-year items are kept under time filters.
7. Influence direction is mechanically source/target based and may not match semantic direction for sample/cover/reference links.
8. `InStyleOf` is influence in metrics but genre-related in ego-network focus.
9. Entity focus is not a hard global filter, despite appearing in the filter panel.
10. Degree centrality is not the same as importance or popularity.
11. Artist comparison normalization is simple ratio normalization.
12. External Genre Influence on Oceanus Folk top rows are currently all influence links.
13. No geographic spread is implemented.
14. The code does not deduplicate links during metric computation.
15. `notable` normalization uses `Boolean`, which is simple and may be unsafe for string values.
16. Link years are missing, so timeline link years fall back to endpoint years.
17. Rising-star score heavily weights creative links.
18. Relationship Type green markers are percentages, not counts.
19. The Evidence Table only shows top five relationship types.
20. Some SVG tooltips use browser-native title behavior, not custom accessible tooltip panels.

## 21. Recommended Corrections Before the Exam

These are not implemented in this audit, but they would reduce oral-exam risk:

1. Exclude Sailor Shift and already-famous artists from the rising-star ranking, or label the chart "artist evidence ranking".
2. Add a semantic direction map for influence relationships:
   - `A DirectlySamples B` means A receives influence from B.
   - `A CoverOf B` means A receives influence from B.
3. Make `InStyleOf` grouping consistent or explicitly document the difference in the UI.
4. Add a note near the timeline that bars and line use separate y scales.
5. Improve `notable` parsing to treat string `"false"` as false.
6. Add a candidate eligibility rule for rising stars.
7. Add a small note that Person genre is missing and inferred through neighboring works.
8. Consider renaming "Influence given/received" to "Outgoing/incoming influence-class links" if semantic direction is not corrected.

## 22. Five-Minute Project Presentation Script

Good morning. My project is a visual analytics dashboard for VAST 2025 Mini Challenge 1, focused on Sailor Shift and the rise of Oceanus Folk. The dataset is a directed music knowledge graph with 17,412 entities and 37,857 relationships. The entities include people, songs, albums, record labels, and musical groups. The relationships include performance, composition, production, label, membership, and influence-style links such as covers, samples, interpolations, references, and style relationships.

The goal is not just to display the graph. A full node-link diagram would be unreadable. Instead, I built a coordinated dashboard that supports overview, filtering, details on demand, and hypothesis generation.

The main original D3 visualization is the radial ego network. It starts with Sailor Shift in the center. Direct neighbors are placed in the inner ring and indirect neighbors in the outer ring. Node color represents entity type, node size reflects graph degree, and edge style represents relationship category. The analyst can change network depth, relationship focus, and node limit. This makes the graph readable while preserving context.

The other views provide complementary evidence. KPI cards show the size of the current graph subset. The timeline shows Oceanus Folk entities by year and influence-style links over time, so we can see whether the rise is gradual or intermittent. The genre contribution and External Genre Influence on Oceanus Folk charts show which genres are associated with the current view and which external genres connect to Oceanus Folk. Relationship types and the evidence table show exact relationship distributions. Artist comparison and artist connectivity compare selected artists by creative links, releases, influence, Oceanus relevance, and genre diversity.

The dashboard is interactive. Clicking a genre, relationship type, year, degree bin, or entity updates linked views. Selecting an artist recenters the ego network and overlays that artist's relationship profile in the relationship chart, without destroying the global context. This is the key visual analytics idea: computational summaries guide the user, while the user interactively tests hypotheses.

For prediction, I implemented a transparent rising-star heuristic. It combines creative links, influence links, genre diversity, Oceanus relevance, recent activity, proximity to Sailor Shift, log degree, and a small penalty for notability. This is not machine learning and I do not claim it predicts success with certainty. It is a hypothesis generator that identifies artists worth further investigation.

The main limitations are missing metadata and direction semantics. Most Person nodes have Unknown genre and no year, so genre and temporal analysis rely mostly on songs and albums. Also, influence direction is counted mechanically from source and target, which may not always match the real-world semantics of covers or samples. I therefore interpret the dashboard as evidence for exploration, not final truth.

Overall, the project demonstrates visual analytics by combining D3 graph visualization, standard charts, linked displays, filtering, visual encodings, and transparent reasoning around the Oceanus Folk knowledge graph.

