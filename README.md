# Oceanus Folk Knowledge Graph Dashboard

Visual analytics project for the University of Pisa **Visual Analytics 602AA** course, based on the **VAST Challenge 2025 Mini-Challenge 1: The Rise of Oceanus Folk**.

Challenge page: https://vast-challenge.github.io/2025/MC1.html

## Overview

This repository contains a Vue and D3.js dashboard for exploring a music knowledge graph about Sailor Shift, Oceanus Folk, artists, songs, albums, record labels, musical groups, and relationships such as performance, composition, production, sampling, covers, references, and stylistic influence.

The dashboard is designed for a journalist or domain expert analyst who wants to understand the rise of Oceanus Folk without needing to be a graph visualization specialist. It supports three visual analytics goals:

- discover new information or relationships,
- identify anomalies or inconsistencies,
- infer missing information from context.

Knowledge graphs combine graph structure with rich, heterogeneous node and edge attributes. This creates visualization challenges related to scale, uncertainty, incomplete information, and interpretability. The project addresses these issues through linked dashboard views, focused ego-network exploration, temporal context, genre analysis, artist comparison, and explainable rising-star scoring.

## Current Status

The dashboard is a working visual analytics application:

- MC1 data is stored under `data/MC1_release/MC1_graph.json`.
- The frontend serves the graph from `frontend/public/data/MC1_graph.json`.
- The app loads and normalizes the graph in the browser.
- Four compact KPI cards show visible nodes, links, artists, and songs.
- A left analysis panel contains the global entity, relationship, genre, and time filters.
- A detail panel updates when the user selects an entity.
- A custom D3 radial ego network shows the local context around Sailor Shift or the selected entity.
- Timeline playback animates the visible year.
- Genre, relationship, entity type, and year filters update linked views.
- Rising-star hypotheses are shown with transparent score contributions.
- A concise observation panel explains the current filtered state.
- Artist comparison, centrality ranking, relationship distribution, and Oceanus-linked genres are visible as chart cards.
- The View Insight action previews report-ready text before copying.

For a beginner-friendly explanation of the code, read `docs/CODE_WALKTHROUGH.md`.

## How to Run

From the frontend folder:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

To build the production version:

```bash
cd frontend
npm run build
```

## Dataset

The graph follows the NetworkX JSON graph structure:

- `directed`
- `multigraph`
- `graph`
- `nodes`
- `links`

Current dataset size:

- 17,412 nodes
- 37,857 links

Observed node types:

- `Person`
- `Song`
- `RecordLabel`
- `Album`
- `MusicalGroup`

Observed edge types:

- `PerformerOf`
- `RecordedBy`
- `ComposerOf`
- `ProducerOf`
- `DistributedBy`
- `LyricistOf`
- `InStyleOf`
- `InterpolatesFrom`
- `LyricalReferenceTo`
- `CoverOf`
- `DirectlySamples`
- `MemberOf`

## Dashboard Design

The interface uses a compact 12-column report canvas. Its hierarchy is:

1. compact report header and global reset;
2. horizontal global filter strip;
3. KPI overview;
4. radial ego network as the dominant visualization;
5. selected-entity and current-observation panel;
6. timeline, genre, entity-type, and relationship-type charts;
7. visible artist comparison, centrality, rising-star, and Oceanus-genre rankings.

The dashboard is organized around analytical questions from Mini-Challenge 1:

- Who is connected to Sailor Shift?
- Which artists, songs, albums, and genres are central in the graph?
- Which relationship types dominate the music ecosystem?
- Which relationships indicate collaboration or influence?
- Which artists look like plausible future Oceanus Folk stars?

The visual hierarchy deliberately gives the ego network the most space. Timeline,
genre, comparison, centrality, and ranking charts provide supporting evidence.
Lists were replaced with bars wherever position and length communicate the values
more clearly.

The visible chart set includes:

- a radial ego network for graph structure;
- horizontal bars for genres and ranked evidence;
- a donut chart for entity-type composition;
- vertical columns for relationship-type totals;
- a combined line and column timeline;
- grouped bars for artist comparison;
- a degree-distribution histogram;
- a lollipop chart for entity centrality;
- a bubble scatterplot for artist creative and release activity;
- stacked bars for Oceanus genre-link composition;
- one compact evidence table for exact values.

## Interaction Guide

The dashboard uses linked displays. A change in one widget updates the others:

- Selecting an entity updates the radial ego network and detail panel.
- Clicking a genre or year applies a global filter.
- The left filter panel controls entity type, relationship type, genre, and time.
- Clicking the same selected chart item again clears that filter.
- Rising-star candidates and comparison artist labels can be clicked to inspect that artist.
- The KPI cards and observation panel immediately show the effect of filtering.
- The View Insight button opens a preview before copying report-ready text.
- Reset Filters restores the complete graph and returns the network focus to Sailor Shift.

## Visual Encoding Choices

The design follows the course principles for visual variables:

- bar length encodes counts and metric values;
- position over time encodes temporal patterns;
- node color encodes entity type;
- node size encodes graph degree;
- teal indicates the active analytical focus;
- gray and slate colors provide context without competing with selected data;
- Unknown genre values are not deleted, but genre charts exclude them by default to reveal interpretable patterns.

The color palette is intentionally limited and color-blind friendlier than random categorical colors. The same entity colors are used in the radial network and encoding legend.

## Original D3.js Visualization

The main custom visualization is the radial ego network. It avoids showing the entire graph at once. Instead, it starts from the selected entity, defaults to Sailor Shift, and shows a readable local neighborhood:

- center node: selected entity,
- inner ring: direct relationships,
- outer ring: indirect relationships,
- node color: entity type,
- node size: graph degree,
- curved links: relationships among visible nodes.

When the graph has too many neighboring nodes, the component keeps the most relevant subset by distance and degree. This is a deliberate visual analytics choice: the user gets a focused explanation instead of an unreadable graph hairball.

The network includes controls for:

- direct-only versus direct-plus-indirect depth;
- relationship focus, such as influence, collaboration, performance, and genre-related links;
- node limits of 25, 50, or 100.

Hovering a node highlights related links and dims unrelated context. Clicking a node changes the selected entity and updates the linked detail panel and other views.

## Rising Star Score

The rising-star score is a transparent heuristic, not a black-box prediction. It combines:

- creative collaboration links,
- influence links,
- genre diversity,
- recent activity,
- Oceanus Folk relevance,
- graph degree.

The score is used to create hypotheses for investigation. It should be discussed as an explainable ranking, not as a guaranteed forecast.

## Analytical Use Case

A journalist begins with Sailor Shift selected in the radial ego network. They inspect direct and indirect relationships, then focus the network on influence links. Next, they click a peak year in the Oceanus Folk timeline to filter the dashboard. They inspect which genres remain connected to Oceanus Folk, compare Sailor Shift with two rising candidates, and open the candidate explanations to see collaboration, influence, genre diversity, recent activity, and Sailor Shift connection evidence. The result is not a final truth, but a defensible hypothesis about future Oceanus Folk stars.

## Course Requirements Coverage

This project addresses the Visual Analytics 602AA requirements as follows:

- several visual widgets: overview cards, radial network, timeline, bar charts, genre analysis, artist comparison, rising-star hypotheses, evidence tables;
- original D3.js visualization: custom radial ego network;
- interactivity: search, filters, chart clicks, node selection, hover highlighting, removable filter chips;
- linked displays: filters and selections update multiple widgets;
- analytical reasoning: rising-star scoring and current-reading text explain evidence;
- report support: README, About page, encoding legend, and Data and Limitations section document the design rationale.

## Implementation Structure

Key frontend folders:

```text
frontend/src
  components
    Dashboard.vue
    FilterPanel.vue
    SummaryCards.vue
    EgoNetwork.vue
    TimelineChart.vue
    BarChart.vue
    ArtistComparison.vue
    RankedBarChart.vue
  data
    graphLoader.js
    graphTransforms.js
    metrics.js
    scoring.js
  utils
    dateUtils.js
```

For oral defense preparation, see:

```text
docs/CODE_WALKTHROUGH.md
```

## Report Notes

The report can use the following structure:

1. Introduction: knowledge graphs are powerful but hard to interpret when large and heterogeneous.
2. Data description: MC1 music graph with entities and typed relationships.
3. Analytical goals: profile Sailor Shift, inspect influence, explore Oceanus Folk growth, compare artists, predict rising stars.
4. Design choices: linked dashboard views, focused ego-network instead of a full graph hairball, temporal and genre summaries, transparent scoring.
5. State of the art: node-link diagrams, ego networks, timelines, Sankey-style flow, linked views, explainable visual analytics.
6. Visualization description: explain each widget and its question.
7. Interactions: selection, linked detail panel, filters for time, genre, node type, and edge type.
8. Use case: start with Sailor Shift, inspect the overview, select related entities, compare influence signals, examine rising-star evidence.
9. Limitations: missing fields, incomplete dates, no geographic map unless reliable location data exists, heuristic prediction is not a causal model.
10. Conclusion: the tool supports discovery, auditing, and hypothesis generation in a complex knowledge graph.

## Project Goals

The main goals of this project are to:

1. build a working visual analytics dashboard;
2. implement an original D3.js radial ego-network visualization;
3. provide linked displays across graph, time, genre, comparison, and scoring views;
4. keep the implementation readable and exam-ready;
5. document the design rationale, limitations, and intended user workflow.

## Working Approach

The project is developed incrementally:

1. inspect and normalize the graph data;
2. create overview widgets;
3. build the D3 radial ego network;
4. add timeline and genre evolution views;
5. add artist comparison;
6. refine rising-star scoring;
7. polish interactions and documentation.

## References

- VAST Challenge 2025 Mini-Challenge 1: https://vast-challenge.github.io/2025/MC1.html
- VAST Challenge 2025 Design Challenge: https://vast-challenge.github.io/2025/DC.html
- IEEE VIS / VAST community resources on visual analytics, graph visualization, and knowledge graphs
