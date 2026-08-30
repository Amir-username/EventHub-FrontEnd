<script setup lang="ts">
// Access control lives on the PAGE (definePageMeta: 'admin-only') — never in
// this layout. Layouts render for whatever reaches them; guards decide that.
const route = useRoute();
const auth = useAuthStore();

const mobileNavOpen = ref(false);

const navItems = [
  { label: "Dashboard", icon: "i-lucide-layout-dashboard", to: "/admin" },
  { label: "Events", icon: "i-lucide-calendar-days", to: "/admin/events" },
  { label: "Venues", icon: "i-lucide-map-pin", to: "/admin/venues" },
  { label: "Users", icon: "i-lucide-users", to: "/admin/users" },
  { label: "Settings", icon: "i-lucide-settings", to: "/admin/settings" },
];

function isActive(to: string) {
  return to === "/admin" ? route.path === "/admin" : route.path.startsWith(to);
}
</script>

<template>
  <div class="min-h-screen flex flex-col sm:flex-row">
    <!-- Mobile top bar -->
    <header
      class="flex h-14 items-center justify-between border-b border-(--ui-border) px-4 sm:hidden"
    >
      <UButton
        icon="i-lucide-menu"
        variant="ghost"
        color="neutral"
        aria-label="Open admin menu"
        @click="mobileNavOpen = true"
      />
      <span class="font-display font-semibold tracking-tight">Admin</span>
      <UColorModeButton />
    </header>

    <!-- Sidebar (desktop) -->
    <aside
      class="hidden w-64 shrink-0 flex-col border-e border-(--ui-border) p-4 sm:flex"
    >
      <NuxtLink to="/admin" class="mb-6 flex items-center gap-2 px-2">
        <span
          class="size-2.5 rounded-full bg-(--ui-primary)"
          aria-hidden="true"
        />
        <span class="font-display font-semibold tracking-tight"
          >EventHub Admin</span
        >
      </NuxtLink>

      <nav class="flex flex-col gap-1" aria-label="Admin">
        <UButton
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :icon="item.icon"
          :label="item.label"
          color="neutral"
          :variant="isActive(item.to) ? 'soft' : 'ghost'"
          justify="start"
          class="w-full"
        />
      </nav>

      <div class="mt-auto flex flex-col gap-1 pt-4">
        <UButton
          to="/"
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          label="Back to site"
          justify="start"
        />
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-log-out"
          label="Sign out"
          justify="start"
          @click="auth.logout()"
        />
      </div>
    </aside>

    <!-- Mobile nav -->
    <USlideover v-model:open="mobileNavOpen" title="Admin" side="left">
      <template #body>
        <nav class="flex flex-col gap-1">
          <UButton
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :icon="item.icon"
            :label="item.label"
            color="neutral"
            :variant="isActive(item.to) ? 'soft' : 'ghost'"
            justify="start"
            block
            @click="mobileNavOpen = false"
          />

          <USeparator class="my-2" />

          <UButton
            to="/"
            variant="ghost"
            color="neutral"
            block
            icon="i-lucide-arrow-left"
            label="Back to site"
            @click="mobileNavOpen = false"
          />
          <UButton
            variant="ghost"
            color="neutral"
            block
            icon="i-lucide-log-out"
            label="Sign out"
            @click="auth.logout()"
          />
        </nav>
      </template>
    </USlideover>

    <main class="min-w-0 flex-1 p-4 sm:p-6">
      <slot />
    </main>
  </div>
</template>
