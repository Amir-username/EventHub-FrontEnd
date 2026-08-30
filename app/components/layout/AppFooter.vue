<script setup lang="ts">
const year = new Date().getFullYear();
</script>

<template>
  <footer class="border-t border-(--ui-border)">
    <UContainer
      class="flex flex-col items-center justify-between gap-3 py-8 text-sm sm:flex-row"
    >
      <NuxtLink to="/" class="flex items-center gap-2 text-(--ui-text-muted)">
        <span
          class="size-2 rounded-full bg-(--ui-primary)"
          aria-hidden="true"
        />
        <span class="font-display font-semibold tracking-tight">EventHub</span>
      </NuxtLink>

      <nav class="flex items-center gap-4" aria-label="Footer">
        <NuxtLink
          to="/events"
          class="text-(--ui-text-muted) transition-colors hover:text-(--ui-text)"
        >
          Events
        </NuxtLink>
        <span class="text-(--ui-text-dimmed)">Terms</span>
        <span class="text-(--ui-text-dimmed)">Privacy</span>
      </nav>

      <p class="text-(--ui-text-dimmed)">
        © {{ year }} EventHub. All rights reserved.
      </p>
    </UContainer>
  </footer>
</template>
