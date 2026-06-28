<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  learningMode: { type: Boolean, default: false },
  purpose: { type: String, required: true },
  use: { type: String, required: true },
  interaction: { type: String, required: true },
  reading: { type: String, required: true },
})

const localOpen = ref(null)

const isOpen = computed(() => localOpen.value ?? props.learningMode)

watch(
  () => props.learningMode,
  () => {
    localOpen.value = null
  },
)

function toggleGuide() {
  localOpen.value = !isOpen.value
}
</script>

<template>
  <aside class="learning-guide" :class="{ 'is-open': isOpen }" aria-label="Chart visual guide">
    <button
      class="learning-button"
      type="button"
      :aria-expanded="isOpen"
      @click="toggleGuide"
    >
      Visual Guide
    </button>

    <div class="learning-panel" :aria-hidden="!isOpen">
      <p><strong>Purpose:</strong> {{ purpose }}</p>
      <p><strong>Meaning:</strong> {{ use }}</p>
      <p><strong>Interaction:</strong> {{ interaction }}</p>
      <p><strong>Reading:</strong> {{ reading }}</p>
    </div>
  </aside>
</template>
