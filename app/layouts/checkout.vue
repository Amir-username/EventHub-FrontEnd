<script setup lang="ts">
// Distraction-free chrome: no marketing nav, no footer links — checkout focus.
// The 10-minute reservation countdown lives in the page, not here.
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-(--ui-border)">
      <UContainer class="flex h-14 items-center justify-between">
        <NuxtLink
          to="/"
          class="flex items-center gap-2"
          aria-label="EventHub home"
        >
          <span
            class="size-2.5 rounded-full bg-(--ui-primary)"
            aria-hidden="true"
          />
          <span class="font-display text-base font-semibold tracking-tight"
            >EventHub</span
          >
        </NuxtLink>
        <UBadge
          color="neutral"
          variant="subtle"
          icon="i-lucide-lock"
          label="Secure checkout"
        />
      </UContainer>
    </header>

    <main class="flex flex-1 justify-center px-4 py-8">
      <div class="w-full max-w-lg">
        <slot />
      </div>
    </main>

    <footer class="py-6 text-center text-xs text-(--ui-text-dimmed)">
      Need help? Contact support — your reservation is held for 10 minutes.
    </footer>
  </div>
</template>
