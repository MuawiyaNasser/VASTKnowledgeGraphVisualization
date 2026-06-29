# Oceanus Folk Visual Analytics Dashboard - Technical Documentation

This document explains the final project in a technical but student-friendly way. It is meant to be used for study notes, oral exam preparation, and explaining the project to another assistant.

## 1. Project Purpose

The project is a Visual Analytics dashboard for the University of Pisa course Visual Analytics 602AA. It is based on VAST Challenge 2025 Mini Challenge 1: Sailor Shift and the Rise of Oceanus Folk.

The dashboard helps an analyst explore a music knowledge graph. The main goal is not only to show statistics, but to support reasoning about influence, collaboration, External Genre Influence on Oceanus Folk, temporal growth, artist comparison, and rising-star hypotheses.

The project avoids showing the full graph as a large unreadable hairball. Instead, it combines a focused D3 radial ego network with multiple linked visual widgets.

## 2. Technology Stack

The frontend uses:

- Vue.js for the application and components.
- JavaScript for logic and data processing.
- D3.js for custom SVG visualizations and scales.
- CSS/Tailwind-style utility classes in `frontend/src/assets/main.css`.
- Vite for local development and build.
- JSON knowledge graph data loaded from the public data folder.

The most important command is:

```bash
cd frontend
npm install
npm run dev
```

The production build is checked with:

```bash
npm run build
```

## 3. Main Project Structure

Important folders:

```text
frontend/src/data
```

Contains the data loading, normalization, metrics, and scoring logic.

```text
frontend/src/components
```

Contains the dashboard and all visual widgets.

```text
frontend/src/assets/main.css
```

Contains the dashboard layout, cards, colors, spacing, visual guide styling, and responsive behavior.

```text
report
```

Contains the LaTeX report, compiled PDF, screenshots, and report tools.

## 4. Data Model

The dataset is a JSON knowledge graph with:

- `nodes`: graph entities.
- `links`: directed graph relationships.
- metadata such as `directed`, `multigraph`, and `graph`.

Node examples:

- Person
- Song
- Album
- RecordLabel
- MusicalGroup
- Genre or other music entities

Node fields may include:

- `Node Type`
- `name`
- `genre`
- `release_date`
- `written_date`
- `notoriety_date`
- `notable`
- `id`

Link examples:

- PerformerOf
- RecordedBy
- ComposerOf
- ProducerOf
- DistributedBy
- InStyleOf
- CoverOf
- DirectlySamples
- LyricalReferenceTo

The dataset has missing metadata. Many artists have `Unknown` genre because genre mostly belongs to songs or albums, not people. The dashboard does not invent missing values.

## 5. Data Processing Pipeline

The data flow is:

```text
Load raw JSON
-> Normalize nodes and links
-> Extract dates and years
-> Compute graph metrics
-> Store dashboard state
-> Apply filters
-> Render linked visual widgets
```

Important files:

```text
frontend/src/data/graphLoader.js
```

Loads the JSON file.

```text
frontend/src/data/graphTransforms.js
```

Normalizes raw node and link fields into cleaner fields:

- `id`
- `label`
- `nodeType`
- `genre`
- `year`
- `edgeType`
- `source`
- `target`

It also handles unknown or missing values safely.

```text
frontend/src/data/metrics.js
```

Computes:

- total nodes
- total links
- node type counts
- relationship type counts
- degree centrality
- in-degree and out-degree
- timeline aggregates
- Oceanus genre links
- ego network neighborhoods
- artist comparison metrics

```text
frontend/src/data/scoring.js
```

Computes Rising-Star Hypotheses.

## 6. Dashboard State

The central state is in:

```text
frontend/src/components/Dashboard.vue
```

This is the control center of the app.

The shared state includes:

- selected entity
- entity focus
- relationship type filter
- genre filter
- year range
- degree range
- network depth
- relationship focus
- node limit
- Learning Mode
- relationship chart mode

When one state value changes, the computed graph subset updates, and all linked widgets receive the updated data.

## 7. Important Design Decision: Entity Focus

Originally, entity type worked like a destructive filter. For example, selecting `Person` removed songs, albums, and labels before building the ego network. This was analytically wrong because bridge nodes are needed to explain connections.

Final behavior:

```text
Compute ego network first using the full graph.
Then visually emphasize the selected entity type.
```

So if the user selects `Person`, people stay visually strong, but songs or albums that connect people remain visible as faded bridge nodes.

This preserves graph connectivity and supports interpretation.

## 8. Important Design Decision: Genre Focus

Genre filtering was also changed to avoid collapsing the radial network.

Because genre is often attached to songs and albums, not artists, the network should not only show nodes whose own `genre` equals the selected genre.

Final behavior:

A node is genre-relevant if:

- it has the selected genre,
- or it is directly connected to a song/album with that genre,
- or it is needed as a bridge from the center to genre-relevant context.

This means selecting a genre such as Indie Folk keeps the selected artist and relevant context visible instead of reducing the network to one node.

## 9. Main Visual Widgets

### KPI Cards

Show:

- Nodes
- Links
- Artists
- Songs

Purpose:

Give a fast overview of the visible graph after filters.

Chart logic:

These are exact values, so cards are better than charts.

### Sailor Shift Profile

Small card that profiles Sailor Shift.

Shows:

- career span
- Oceanus links
- influence received
- influence given
- creative links
- direct people
- indirect people
- nearby genre diversity

Purpose:

Directly supports the MC1 task of profiling Sailor Shift.

### Radial Ego Network

This is the main original D3 visualization.

File:

```text
frontend/src/components/EgoNetwork.vue
```

Purpose:

Explore the local graph around the selected entity.

Encoding:

- center node = selected entity
- inner ring = direct relationships
- outer ring = indirect relationships
- node color = entity type
- node size = degree/connectivity
- edge style = relationship meaning
- opacity = focus/muted context
- amber outline = unknown genre metadata

Controls:

- Network depth
- Relationship focus
- Node limit
- Entity focus from global filter panel

Why it is original:

It is not a force-directed hairball. It uses a structured radial layout to show graph distance and preserve context.

### Genre Contribution

Horizontal bar chart.

Purpose:

Shows dominant genres in the current filtered view.

Interaction:

Click a genre to apply genre focus across the dashboard.

Why horizontal bars:

Genre names can be long, and aligned bar length is good for categorical comparison.

### Entity Composition

Donut chart.

Purpose:

Shows what entity types dominate the current view.

Why donut:

The number of categories is small and forms one whole.

### Relationship Types

Column chart.

Purpose:

Shows which relationship categories dominate the current graph.

Special behavior:

If an artist is selected, the chart can compare the selected artist's relationship profile with the whole current graph.

### Temporal Spread of Oceanus Folk

Combined bar and line chart.

Purpose:

Shows whether Oceanus Folk growth is gradual or intermittent.

Encoding:

- bars = Oceanus Folk entities by year
- line = influence-style relationships by year
- selected year = highlighted

Interactions:

- click a year
- play timeline
- pause
- step back
- step forward
- reset year
- speed selector

### Rising-Star Hypotheses

Ranked horizontal bar chart.

Purpose:

Suggest possible future Oceanus Folk stars.

Important:

This is not machine learning and not certainty. It is a transparent heuristic.

Formula:

```text
score =
  creative links * 2
+ influence links * 1.5
+ genre diversity * 1.25
+ recent activity * 3
+ Oceanus relevance * 3
+ Sailor Shift connection score
+ log(1 + total degree)
- already-notable penalty
```

Meaning:

Artists score higher if they have strong creative activity, influence evidence, diverse nearby genres, Oceanus relevance, recent activity, and connection to Sailor Shift.

### Artist Comparison

Grouped horizontal bar chart.

Purpose:

Compare three selected artists across multiple signals.

Metrics:

- Oceanus links
- influence received
- influence given
- creative links
- release links
- genre diversity

Modes:

- raw counts
- normalized by degree
- normalized by releases

### Degree Distribution

Histogram.

Purpose:

Shows whether the graph has many low-degree entities and a few hubs.

Why histogram:

Degree is numeric, and the question is about distribution.

### Most Connected Entities

Lollipop chart.

Purpose:

Shows top degree entities in the visible graph.

Important:

Degree means connectivity, not automatically influence or quality.

### Artist Connectivity

Bubble scatterplot plus top 10 list.

Purpose:

Compare artists by creative links and release links.

Encoding:

- x-axis = creative links
- y-axis = release links
- bubble size = total degree
- teal = selected artist
- sky blue = comparable artists

### External Genre Influence on Oceanus Folk

Stacked/horizontal genre influence chart.

Purpose:

Shows external genres connected to Oceanus Folk.

Relationship classes:

- Influence
- Creative
- Other

If only influence links exist in the visible data, zero categories are hidden and the chart explains that.

### Evidence Table

Compact table.

Purpose:

Provides exact relationship counts and percentages.

Why table:

Exact verification is easier in a table than in a chart.

## 10. Learning Mode and Visual Guide

A global Learning Mode toggle was added to the dashboard header.

Behavior:

- Learning Mode OFF: all guides start collapsed.
- Learning Mode ON: all guides start expanded.
- Each chart also has its own `Visual Guide` button.
- Local Visual Guide buttons work independently.

Each Visual Guide explains:

- Purpose
- Meaning
- Interaction
- Reading

This helps first-time users and supports oral exam presentation without cluttering the dashboard by default.

Implementation file:

```text
frontend/src/components/LearningHint.vue
```

## 11. Linked Displays

The dashboard uses coordinated multiple views.

Examples:

- Clicking a genre updates genre charts, timeline, rising stars, and radial network context.
- Clicking a node selects the entity and recenters the ego network.
- Clicking a rising-star candidate selects that artist and updates relationship comparison.
- Clicking a timeline year filters temporal views.
- Clicking a relationship type filters relationship evidence.
- Reset dashboard restores the default view.

This is important because Visual Analytics is about interaction and reasoning, not static charts.

## 12. Color System

The dashboard uses color intentionally.

Main meanings:

- teal = selection and interaction
- blue = factual comparison
- orange = rising-star hypotheses
- rose = influence evidence
- slate/gray = neutral structure
- amber = uncertainty or unknown metadata

Entity type colors:

- Person = blue
- Song = green
- Album = amber
- RecordLabel = pink
- MusicalGroup = sky blue
- Other = gray

The same entity colors are used in both the radial network and entity composition chart.

## 13. Report Work

The report is in:

```text
report/VA_Muawia_Nasser_725006.tex
report/VA_Muawia_Nasser_725006.pdf
```

The report was revised to cover:

- data description
- design choices
- state of the art
- detailed visual descriptions
- interactions
- original D3 visualization
- use case
- limitations
- AI-assisted development acknowledgement

The final report is 8 pages.

## 14. GitHub Submission

The final work was committed with:

```text
Finalize dashboard and report
```

It was pushed to:

```text
origin/main
```

and to the fork:

```text
fork/main
```

Direct push to the professor repository was denied because the student does not have write access. The correct method is to submit through a Pull Request from the fork.

## 15. Main Oral Exam Explanation

A good short explanation:

> This project is a visual analytics dashboard for a music knowledge graph. The computer prepares graph metrics, timeline summaries, External Genre Influence on Oceanus Folk, artist comparison, and rising-star scores. The user then explores these results through linked visual widgets. The original D3 visualization is a radial ego network that avoids the graph hairball problem by showing direct and indirect context around Sailor Shift or another selected entity.

## 16. Why This Is Visual Analytics

This project is Visual Analytics because it combines:

- computational processing,
- interactive visualization,
- human reasoning,
- linked displays,
- filtering,
- comparison,
- hypothesis generation,
- details on demand.

The dashboard does not claim automatic truth. It helps the analyst form and test interpretations.

## 17. Important Limitations

Limitations to mention:

- Some genres and years are unknown.
- The graph has no reliable geographic fields.
- Spread is interpreted as music-ecosystem diffusion, not geographic spread.
- Degree means connectivity, not guaranteed influence.
- Rising-star score is heuristic, not machine learning.
- The radial network shows a focused subset, not the entire graph.

## 18. Files to Know for the Exam

Most important files:

```text
frontend/src/components/Dashboard.vue
```

Main state and dashboard coordination.

```text
frontend/src/components/EgoNetwork.vue
```

Original D3 radial ego network.

```text
frontend/src/components/LearningHint.vue
```

Learning Mode and Visual Guide system.

```text
frontend/src/data/graphTransforms.js
```

Data normalization.

```text
frontend/src/data/metrics.js
```

Graph metrics and aggregations.

```text
frontend/src/data/scoring.js
```

Rising-star heuristic.

```text
frontend/src/assets/main.css
```

Dashboard design and layout.

## 19. Best Defense Points

Mention these points in the oral exam:

- I avoided a full graph hairball by using a radial ego network.
- Direct and indirect relationships are separated into rings.
- Entity focus preserves bridge nodes instead of destroying graph traversal.
- Genre focus is contextual because artist genres are often unknown.
- Every chart answers a specific analytical question.
- The dashboard uses linked displays, not isolated charts.
- Visual Guide helps non-technical users understand each chart.
- Rising-star score is explainable and transparent.
- No geographic map was added because the data does not contain reliable geography.
- The dashboard supports hypothesis generation, not automatic truth.

