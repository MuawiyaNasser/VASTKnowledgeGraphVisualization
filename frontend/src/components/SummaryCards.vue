<script setup>
defineProps({
  overview: {
    type: Object,
    required: true,
  },
})

const mainCards = [
  { key: 'totalNodes', label: 'Nodes', detail: 'Entities in the graph' },
  { key: 'totalLinks', label: 'Links', detail: 'Directed relationships' },
  { key: 'artistCount', label: 'Artists', detail: 'Person entities' },
  { key: 'songCount', label: 'Songs', detail: 'Musical works' },
]

function formatNumber(value) {
  return new Intl.NumberFormat().format(value ?? 0)
}
</script>

<template>
  <section class="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <article
        v-for="card in mainCards"
        :key="card.key"
        class="va-card border-t-2 border-t-teal-600 px-3 py-2.5"
      >
        <p class="text-xs font-medium text-slate-500">{{ card.label }}</p>
        <div class="mt-1 flex items-end justify-between gap-3">
          <p class="text-2xl font-semibold leading-none text-slate-950">{{ formatNumber(overview[card.key]) }}</p>
          <p class="text-right text-[11px] text-slate-500">{{ card.detail }}</p>
        </div>
      </article>
  </section>
</template>
