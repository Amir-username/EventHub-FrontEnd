<script setup lang="ts">
/**
 * Smooth dark/light toggle — drop-in replacement for <UColorModeButton />.
 *
 * Nuxt UI flips the .dark class on <html> in a single frame, so every
 * surface snap-changes. This toggle first adds .theme-transitioning to
 * <html> (see main.css), then flips the mode, then removes the class:
 * colors cross-fade for ~300ms instead of snapping. Page loads and hover
 * states are unaffected because the transition window only exists during
 * the flip.
 */
const colorMode = useColorMode();

const isDark = computed(() => colorMode.value === "dark");

let resetTimer: ReturnType<typeof setTimeout> | undefined;

function toggle() {
  const root = document.documentElement;
  root.classList.add("theme-transitioning");

  colorMode.preference = isDark.value ? "light" : "dark";

  // 300ms fade + one paint of buffer; reset on rapid re-clicks.
  clearTimeout(resetTimer);
  resetTimer = setTimeout(
    () => root.classList.remove("theme-transitioning"),
    400,
  );
}

onBeforeUnmount(() => {
  clearTimeout(resetTimer);
  if (import.meta.client)
    document.documentElement.classList.remove("theme-transitioning");
});
</script>

<template>
  <ClientOnly>
    <UButton
      :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
      color="neutral"
      variant="ghost"
      :aria-label="`Switch to ${isDark ? 'light' : 'dark'} mode`"
      @click="toggle"
    />

    <!-- Same footprint as the real button: no layout shift before hydration -->
    <template #fallback>
      <div class="size-8" />
    </template>
  </ClientOnly>
</template>
