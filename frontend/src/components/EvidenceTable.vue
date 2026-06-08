<script setup>
defineProps({
  rows: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <article class="va-card dashboard-chart-card">
    <div class="dashboard-panel-title">
      <h2>Evidence table</h2>
      <p>Exact relationship counts.</p>
    </div>

    <table class="evidence-table">
      <thead>
        <tr>
          <th>Relationship</th>
          <th>Links</th>
          <th>Share</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.label">
          <td>{{ row.label }}</td>
          <td>{{ row.value.toLocaleString() }}</td>
          <td>{{ row.share }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
