<script setup>
import LearningHint from './LearningHint.vue'

defineProps({
  rows: {
    type: Array,
    required: true,
  },
  selected: {
    type: String,
    default: '',
  },
  selectedEntityName: {
    type: String,
    default: '',
  },
  learningMode: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select'])
</script>

<template>
  <article class="va-card dashboard-chart-card">
    <div class="dashboard-panel-title">
      <h2>Evidence table</h2>
      <p>{{ selectedEntityName ? `Graph counts plus direct links for ${selectedEntityName}.` : 'Exact relationship counts.' }}</p>
    </div>

    <LearningHint
      :learning-mode="learningMode"
      purpose="Provides exact numerical support for chart patterns."
      use="Verify visual impressions with precise counts and percentages."
      interaction="Click a relationship row to apply the relationship filter."
      reading="Larger counts show more frequent relationship categories in the current view."
    />

    <table class="evidence-table">
      <thead>
        <tr>
          <th>Relationship</th>
          <th>Graph links</th>
          <th v-if="selectedEntityName">Entity links</th>
          <th>Share</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.label"
          tabindex="0"
          class="evidence-row"
          :class="{ 'is-selected': selected === row.label, 'is-related': selectedEntityName && row.selectedValue > 0 }"
          :aria-label="`${row.label}, ${row.value.toLocaleString()} graph links, ${row.selectedValue ?? 0} selected entity links, ${row.share}. Press Enter to filter relationship.`"
          :title="
            selectedEntityName
              ? `${row.label}: ${row.selectedValue ?? 0} links for ${selectedEntityName}; ${row.value.toLocaleString()} links in the current graph.`
              : `${row.label}: ${row.value.toLocaleString()} links in the current graph.`
          "
          @click="emit('select', row.label)"
          @keydown.enter.prevent="emit('select', row.label)"
          @keydown.space.prevent="emit('select', row.label)"
        >
          <td>{{ row.label }}</td>
          <td>{{ row.value.toLocaleString() }}</td>
          <td v-if="selectedEntityName">{{ (row.selectedValue ?? 0).toLocaleString() }}</td>
          <td>{{ row.share }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
