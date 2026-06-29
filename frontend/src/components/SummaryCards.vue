<script setup>
import LearningHint from './LearningHint.vue'

defineProps({
  overview: {
    type: Object,
    required: true,
  },
  learningMode: {
    type: Boolean,
    default: false,
  },
})

const mainCards = [
  {
    key: 'totalNodes',
    label: 'Nodes',
    detail: 'Entities in the graph',
    purpose: 'Shows the number of visible entities.',
    use: 'Understand the current graph size after filters.',
    interaction: 'Changes when filters are applied.',
    reading: 'Higher value means more entities are included.',
  },
  {
    key: 'totalLinks',
    label: 'Links',
    detail: 'Directed relationships',
    purpose: 'Shows the number of visible directed relationships.',
    use: 'Understand how connected the current graph view is.',
    interaction: 'Changes with entity, relationship, genre, and year filters.',
    reading: 'Higher value means more relationships remain visible.',
  },
  {
    key: 'artistCount',
    label: 'Artists',
    detail: 'Person entities',
    purpose: 'Shows the number of visible Person entities.',
    use: 'Understand how artist-centered the current view is.',
    interaction: 'Changes with filters.',
    reading: 'Higher value means more people are represented.',
  },
  {
    key: 'songCount',
    label: 'Songs',
    detail: 'Musical works',
    purpose: 'Shows the number of visible musical works.',
    use: 'Understand how much song-level material is present.',
    interaction: 'Changes with filters.',
    reading: 'Higher value means more songs are included.',
  },
]

function formatNumber(value) {
  return new Intl.NumberFormat().format(value ?? 0)
}
</script>

<template>
  <section class="dashboard-kpi-grid">
      <article
        v-for="card in mainCards"
        :key="card.key"
        class="va-card dashboard-kpi-card relative border-t-2 border-t-teal-600"
      >
        <p class="text-xs font-medium text-slate-500">{{ card.label }}</p>
        <div class="mt-1.5 flex items-end justify-between gap-2">
          <p class="dashboard-kpi-value">{{ formatNumber(overview[card.key]) }}</p>
          <p class="text-right text-[11px] text-slate-500">{{ card.detail }}</p>
        </div>
        <LearningHint
          :learning-mode="learningMode"
          :purpose="card.purpose"
          :use="card.use"
          :interaction="card.interaction"
          :reading="card.reading"
        />
      </article>
  </section>
</template>
