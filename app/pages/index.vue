<script setup lang="ts">
useSeoMeta({
  title: 'EventHub',
  description: 'Scaffold ready — design tokens live. Build Phase 3 per ROADMAP.md.'
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-16">
    <h1 class="font-display text-5xl font-semibold tracking-tight">EventHub</h1>
    <p class="mt-3 max-w-2xl text-lg text-(--ui-text-muted)">
      Base structure is ready. The design tokens from <code>app/assets/css/main.css</code> are
      live — the button below uses the coral brand color, and typography uses Space Grotesk
      for display and Inter for body.
    </p>

    <div class="mt-6 flex gap-3">
      <UButton label="Primary action" size="lg" />
      <UButton label="Secondary" color="neutral" variant="outline" size="lg" />
    </div>

    <div class="card-surface mt-10 max-w-xl p-5">
      <p class="text-sm font-medium">Next steps</p>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-(--ui-text-muted)">
        <li>Run <code>pnpm types</code> with the backend up to generate <code>shared/types/api.d.ts</code></li>
        <li>Build Phase 2 infrastructure (<code>useApi</code>, auth store, middleware) per <code>ROADMAP.md</code></li>
        <li>Feature folders are scaffolded with <code>.gitkeep</code> — replace them as you build</li>
      </ul>
    </div>
  </div>
</template>
