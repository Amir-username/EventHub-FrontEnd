<template>
  <div class="min-h-screen flex">
    <aside class="hidden w-64 shrink-0 border-e border-(--ui-border) p-4 sm:block">
      <p class="mb-4 text-sm font-semibold font-display tracking-tight">EventHub Admin</p>
      <!-- Admin nav goes here (ROADMAP Phase 6) -->
    </aside>
    <main class="flex-1 p-6">
      <slot />
    </main>
  </div>
</template>
