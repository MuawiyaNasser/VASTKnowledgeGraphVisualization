<script setup>
import { RouterLink, RouterView } from 'vue-router'

const navItems = [
  { label: 'Overview', to: '/' },
  { label: 'About', to: '/about' },
]
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-slate-200 bg-white px-3 py-1.5">
      <div class="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-teal-700">VA602AA</span>
          <span class="h-4 w-px bg-slate-200" />
          <h1 class="text-sm font-semibold text-slate-950">Oceanus Folk Knowledge Graph</h1>
        </div>

        <nav class="flex flex-wrap items-center gap-2">
          <RouterLink
            v-for="item in navItems"
            :key="item.label"
            :to="item.to"
            class="rounded px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"
            active-class="bg-teal-50 text-teal-800"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

      </div>
    </header>

    <main class="va-page">
      <RouterView />
    </main>
  </div>
</template>
