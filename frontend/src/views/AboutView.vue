<template>
  <section class="space-y-5">
    <div class="va-card va-card-pad">
      <p class="va-label">About and Method</p>
      <h1 class="mt-1 text-2xl font-semibold text-slate-950">How to Read This Project</h1>
      <p class="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
        This dashboard treats visual analytics as a collaboration between computation and human reasoning. The system
        computes graph summaries, rankings, and filtered views; the analyst uses interaction to inspect evidence and
        form hypotheses about Sailor Shift, Oceanus Folk, and possible rising stars.
      </p>
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <article class="va-card va-card-pad">
        <h2 class="text-base font-semibold text-slate-950">Dataset</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          The data is a directed music knowledge graph from VAST 2025 Mini Challenge 1. Nodes represent people, songs,
          albums, record labels, and musical groups. Links represent relationships such as performer, composer,
          producer, lyricist, member, cover, sample, interpolation, lyrical reference, and style.
        </p>
      </article>

      <article class="va-card va-card-pad">
        <h2 class="text-base font-semibold text-slate-950">Analytical Tasks</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          The main tasks are to profile Sailor Shift, inspect influence and collaboration, study Oceanus Folk growth
          over time, identify genre connections, compare artists, and generate rising-star hypotheses.
        </p>
      </article>

      <article class="va-card va-card-pad">
        <h2 class="text-base font-semibold text-slate-950">Visual Encodings</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          Position and length encode quantitative values. The radial network uses rings for graph distance, node size
          for degree, and line style for relationship meaning. Entity colors stay consistent across the network and
          donut. Teal marks selection, blue supports factual comparison, orange marks provisional hypotheses, slate
          represents neutral structure, and rose identifies influence evidence.
        </p>
      </article>

      <article class="va-card va-card-pad">
        <h2 class="text-base font-semibold text-slate-950">Interaction Model</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          The dashboard uses linked views. Clicking a node changes the selected entity. Clicking a year, genre, entity
          type, or relationship type filters the visible graph. The context row, analytical reading, evidence trail,
          network, timeline, genre charts, and hypotheses update together.
        </p>
      </article>

      <article class="va-card va-card-pad">
        <h2 class="text-base font-semibold text-slate-950">Rising Star Heuristic</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          The rising-star score is not a machine learning prediction. It is a transparent heuristic based on creative
          links, influence links, genre diversity, recent activity, Oceanus Folk relevance, graph degree, and proximity
          to Sailor Shift.
        </p>
      </article>

      <article class="va-card va-card-pad">
        <h2 class="text-base font-semibold text-slate-950">Limitations</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          Some dates and genres are unknown. Unknown values are shown honestly and can be included or excluded in genre
          charts. The dashboard focuses on subsets to avoid graph overload. A geographic map is not included because
          reliable location fields are not available.
        </p>
      </article>
    </div>
  </section>
</template>
