<script setup>
const props = defineProps({
  filters: {
    type: Object,
    required: true,
  },
  nodeTypes: {
    type: Array,
    required: true,
  },
  edgeTypes: {
    type: Array,
    required: true,
  },
  genres: {
    type: Array,
    required: true,
  },
  years: {
    type: Array,
    required: true,
  },
  reportStrip: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:filters', 'reset'])

function updateFilter(key, value) {
  emit('update:filters', { ...props.filters, [key]: value })
}

</script>

<template>
  <section class="va-card" :class="reportStrip ? 'dashboard-filter-strip' : 'va-card-pad'">
    <div v-if="!reportStrip" class="mb-3 flex flex-col gap-1">
      <h2 class="text-sm font-semibold text-slate-950">Filters</h2>
      <p class="text-xs text-slate-600">Linked across all visuals.</p>
    </div>

    <div
      :class="
        reportStrip ? 'dashboard-filter-grid' : 'grid gap-3 md:grid-cols-2 xl:grid-cols-7'
      "
    >
      <label class="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
        Entity focus
        <select
          class="va-control normal-case"
          :value="filters.nodeType"
          @change="updateFilter('nodeType', $event.target.value)"
        >
          <option value="">All entity types</option>
          <option v-for="row in nodeTypes" :key="row.label" :value="row.label">{{ row.label }}</option>
        </select>
      </label>

      <label class="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
        Relationship type
        <select
          class="va-control normal-case"
          :value="filters.edgeType"
          @change="updateFilter('edgeType', $event.target.value)"
        >
          <option value="">All relationships</option>
          <option v-for="row in edgeTypes" :key="row.label" :value="row.label">{{ row.label }}</option>
        </select>
      </label>

      <label class="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
        Genre
        <select
          class="va-control normal-case"
          :value="filters.genre"
          @change="updateFilter('genre', $event.target.value)"
        >
          <option value="">All genres</option>
          <option v-for="row in genres" :key="row.label" :value="row.label">{{ row.label }}</option>
        </select>
      </label>

      <label class="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
        From year
        <select
          class="va-control normal-case"
          :value="filters.startYear"
          @change="updateFilter('startYear', $event.target.value)"
        >
          <option value="">First year</option>
          <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
        </select>
      </label>

      <label class="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
        To year
        <select
          class="va-control normal-case"
          :value="filters.endYear"
          @change="updateFilter('endYear', $event.target.value)"
        >
          <option value="">Last year</option>
          <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
        </select>
      </label>

      <button
        class="va-button-secondary"
        :class="reportStrip ? 'self-end' : 'md:col-span-2 xl:col-span-1 xl:mt-5'"
        type="button"
        @click="emit('reset')"
      >
        Clear Filters
      </button>
    </div>
  </section>
</template>
