# Code Walkthrough for the Oral Exam

This file explains the project code in simple terms. It is written for studying and oral defense, not for advanced programmers.

## The One-Sentence Idea

The application loads a music knowledge graph, cleans it into a simpler format, computes useful metrics, and shows several linked visual widgets that help an analyst explore Sailor Shift and the rise of Oceanus Folk.

## How the App Starts

The entry point is:

```text
frontend/src/App.vue
```

`App.vue` only provides the page frame and navigation. The real dashboard is in:

```text
frontend/src/components/Dashboard.vue
```

Think of `Dashboard.vue` as the control center of the project.

## The Main Data Flow

The dashboard follows this order:

```text
Load JSON graph
-> Normalize nodes and links
-> Compute metrics
-> Store selected entity and filters
-> Send filtered data to charts
-> User clicks something
-> Filters or selection update
-> Every linked widget updates
```

This is the visual analytics loop: the computer calculates summaries, and the human analyst explores by clicking, filtering, and comparing.

## Important Folders

```text
frontend/src/data
```

This folder prepares the graph data. It should be explained as the "data processing layer".

```text
frontend/src/components
```

This folder contains the visual widgets: dashboard, filters, network, timeline, genre view, comparison, tables, and insight panels.

```text
frontend/src/assets/main.css
```

This file contains the visual style: colors, spacing, cards, and the general dashboard appearance.

## The Most Important Files

### `graphLoader.js`

This file loads the JSON dataset from:

```text
frontend/public/data/MC1_graph.json
```

Simple explanation:

> This is where the browser fetches the VAST knowledge graph file.

### `graphTransforms.js`

This file makes the raw graph easier to use.

It creates clean fields such as:

- `label`
- `nodeType`
- `genre`
- `year`
- `edgeType`
- `sourceNode`
- `targetNode`

Simple explanation:

> The raw data has inconsistent and missing fields, so this file normalizes it into a predictable format.

### `metrics.js`

This file computes values used by the dashboard:

- total nodes
- total links
- node type counts
- edge type counts
- most common genres
- degree centrality
- timeline values
- top entities
- ego network neighbors

Simple explanation:

> This file turns the graph into numbers that can be visualized.

### `scoring.js`

This file computes the Rising Star Score.

The score is based on:

- creative links
- influence links
- genre diversity
- recent activity
- Oceanus Folk relevance
- connection to Sailor Shift
- graph degree

Simple explanation:

> The score is not machine learning. It is a transparent heuristic used to generate hypotheses.

### `Dashboard.vue`

This is the main page.

It stores:

- the graph
- the selected entity
- active filters
- comparison artists
- network settings
- playback state
- insight text

Simple explanation:

> This file connects all widgets together and controls the linked display behavior.

It also defines the compact report layout:

- top: title, horizontal filters, and four KPI cards;
- center: radial ego network and current focus;
- supporting views: timeline, genre, entity type, and relationship charts;
- comparison views: artist comparison, centrality, Oceanus genres, and rising-star ranking.

### `EgoNetwork.vue`

This is the main original D3 visualization.

It shows:

- selected entity in the center
- direct neighbors on the inner ring
- indirect neighbors on the outer ring
- node color by entity type
- node size by degree
- edge style by relationship type

Simple explanation:

> This is a focused radial ego network. It avoids a full graph hairball by showing only the local context around the selected entity.

### `TimelineChart.vue`

This chart shows Oceanus Folk over time.

It includes:

- bars for Oceanus Folk entities by year
- line for influence-style relationships
- year click filtering
- playback mode

Simple explanation:

> The timeline lets the analyst see whether Oceanus Folk grew gradually or in bursts.

### `ArtistComparison.vue`

This compares selected artists using shared scales.

It includes:

- raw count mode
- normalized by degree
- normalized by releases

Simple explanation:

> The comparison helps avoid misleading conclusions based only on popularity.

## What Happens When the User Clicks Something

Example: the user clicks a genre bar.

1. `BarChart.vue` emits the selected genre.
2. `Dashboard.vue` receives it through `setFilter('genre', value)`.
3. The `filters` object changes.
4. `filteredGraph` recomputes automatically.
5. `overview`, rising stars, tables, and charts recompute from the filtered graph.
6. The KPI cards, network, timeline, observation, and supporting views update.

This is what "linked displays" means.

## Difference Between Selection and Global Filter

This is important for the oral exam.

Selecting an entity:

- changes the radial ego network center,
- updates the detail panel,
- updates the current focus,
- does not reduce the whole graph count by itself.

Applying a filter:

- reduces the visible graph subset,
- changes the summary cards,
- changes charts and tables,
- changes visible node and edge counts.

Simple explanation:

> Selection changes the focus. Filters change the dataset subset.

This distinction also explains why clicking a person does not always reduce the
node and link totals. The click changes who is being investigated. The left-side
filters change which records are included.

## Why the Network Is Radial

A full node-link diagram would be unreadable because the graph has thousands of nodes and links.

The radial design makes the structure easier:

- center means current focus,
- inner ring means direct relationships,
- outer ring means indirect relationships,
- color means entity type,
- size means degree,
- line style means relationship category.

This is a visual analytics design choice, not decoration.

## Why Unknown Values Are Visible

The dataset has missing genre and date values.

The dashboard does not invent missing data. Instead:

- unknown genres are shown as `Unknown`,
- genre charts can exclude unknown values to reveal patterns,
- the Data and Limitations section explains this,
- unknown metadata is treated as uncertainty.

Simple explanation:

> Missing data is part of the analysis, not something to hide.

## How to Explain the Rising Star Score

Use this wording:

> The rising star score is a transparent heuristic. It combines collaboration, influence, genre diversity, recent activity, Oceanus Folk relevance, and proximity to Sailor Shift. It is not a prediction model. It creates candidates for further investigation.

## How to Explain the Project to the Professor

A strong short explanation:

> My project is a visual analytics dashboard for a music knowledge graph. Instead of showing the entire graph as a confusing hairball, it uses linked views: a radial ego network, timeline, categorical bar charts, artist comparison, centrality ranking, and explainable rising-star hypotheses. The user can select entities and apply filters, and every widget updates to support exploratory reasoning.

## Why the Layout Looks Like a Report

The page uses a compact dashboard canvas rather than a long article:

- the filters stay in one compact horizontal strip;
- the four KPI cards give an immediate overview;
- the radial network is visually dominant because relationships are the main task;
- smaller charts answer secondary questions using common scales;
- lists were replaced with visual rankings to reduce reading effort.

Simple explanation:

> Size and position create visual hierarchy. The main relationship question gets
> the largest area, while supporting evidence is smaller and details are shown on demand.

## Main Functions to Remember

You do not need to memorize every line. Remember these responsibilities:

- `loadGraph()` fetches the JSON file.
- `normalizeGraph()` cleans inconsistent node and link fields.
- `applyGraphFilters()` creates the current graph subset.
- `computeOverview()` calculates KPI values and distributions.
- `computeRisingStarScores()` creates the explainable candidate ranking.
- `setFilter()` changes one filter.
- `selectNode()` changes the entity being investigated.
- `resetSelection()` restores the initial dashboard state.

Vue computed properties perform most updates automatically. When a filter changes,
Vue recalculates the filtered graph and passes the new data to each component.

## Visual Variables Used

- Position: places years on the timeline and nodes on radial rings.
- Length: compares counts in bars.
- Color hue: distinguishes entity types.
- Size: represents node degree in the ego network.
- Line style: distinguishes direct, influence, and indirect relationships.
- Opacity: mutes incomplete or less relevant context.

These mappings are intentionally simple so the viewer does not need to decode too
many visual variables at once.

## Why Each Chart Was Chosen

| Analytical question | Data type | Visual variable | Chart choice |
| --- | --- | --- | --- |
| Who surrounds the selected entity? | Graph relationships | Position, color, size, line style | Radial ego network |
| Which genres dominate? | Nominal categories with counts | Bar length on a common scale | Horizontal bar chart |
| How is the graph composed? | Parts of one entity total | Arc angle and color hue | Donut chart |
| Which relationships are most common? | Discrete relationship counts | Column height | Vertical column chart |
| How did activity change over time? | Ordered yearly values | Horizontal position and vertical position/length | Combined line and column chart |
| Which artist has stronger signals? | Several metrics across three artists | Grouped bar length | Grouped bar chart |
| How is connectivity distributed? | Quantitative degree values | Bin position and column height | Histogram |
| Which entities are most central? | Ranked nominal categories | Horizontal position and stem length | Lollipop chart |
| Which artists combine creative and release activity? | Two quantitative variables plus degree | X/Y position and bubble area | Bubble scatterplot |
| How are Oceanus genre links composed? | Genre totals split by relationship role | Stacked segment length and hue | Stacked horizontal bars |
| What are the exact relationship values? | Exact supporting values | Text in aligned columns | One compact evidence table |

Simple explanation:

> I selected each chart from the analytical task and data type. I use bars for
> ranking, columns for a few discrete totals, a line for ordered time, a donut
> for a small part-to-whole composition, a bubble plot for two-variable artist
> comparison, and the network only for relationships.

## Five Oral-Defense Points

1. The full graph is too large for one readable node-link diagram, so the main view is a focused ego network.
2. Filters change the data subset, while entity selection changes the analytical focus.
3. All major views are linked through one shared state in `Dashboard.vue`.
4. Rising-star scores are explainable hypotheses, not machine-learning predictions.
5. Missing genre and date values are shown honestly and never replaced with invented data.

## What You Should Be Able to Defend

You should be ready to explain:

- what a knowledge graph is,
- why full graph visualization is difficult,
- why the ego network is radial,
- what each visual encoding means,
- how linked displays work,
- why missing values are shown honestly,
- why the rising star score is a heuristic,
- how the dashboard supports human reasoning.
