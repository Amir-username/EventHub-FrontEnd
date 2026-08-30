<script setup lang="ts">
const route = useRoute();
const auth = useAuthStore();

const mobileNavOpen = ref(false);

const navLinks = [
  { label: "Events", to: "/events", icon: "i-lucide-calendar-days" },
];

function isActive(to: string) {
  return to === "/" ? route.path === "/" : route.path.startsWith(to);
}

/**
 * Account menu (grouped items = separators between groups).
 * Session chrome is client-rendered only — SWR pages are cached and shared
 * across users, so the server must never render user state here.
 */
const accountItems = computed(() => [
  [
    { label: "My account", icon: "i-lucide-user", to: "/account" },
    { label: "My tickets", icon: "i-lucide-ticket", to: "/account/tickets" },
    ...(auth.isAdmin
      ? [
          {
            label: "Admin dashboard",
            icon: "i-lucide-shield-check",
            to: "/admin",
          },
        ]
      : []),
  ],
  [
    {
      label: "Sign out",
      icon: "i-lucide-log-out",
      onSelect: () => auth.logout(),
    },
  ],
]);
</script>

<template>
  <header
    class="sticky top-0 z-50 border-b border-(--ui-border) bg-(--ui-bg)/80 backdrop-blur"
  >
    <UContainer class="flex h-16 items-center justify-between gap-3">
      <div class="flex items-center gap-6">
        <NuxtLink
          to="/"
          class="flex items-center gap-2"
          aria-label="EventHub home"
        >
          <span
            class="size-2.5 rounded-full bg-(--ui-primary)"
            aria-hidden="true"
          />
          <span class="font-display text-lg font-semibold tracking-tight"
            >EventHub</span
          >
        </NuxtLink>

        <nav class="hidden items-center gap-1 sm:flex" aria-label="Main">
          <UButton
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            :label="link.label"
            color="neutral"
            :variant="isActive(link.to) ? 'soft' : 'ghost'"
          />
        </nav>
      </div>

      <div class="flex items-center gap-1.5">
        <ColorModeToggle />
        <!-- SWR-safe account area: fallback = signed-out CTAs, so crawlers see
             real links in cached HTML; logged-in users flip after hydration. -->
        <ClientOnly>
          <UDropdownMenu v-if="auth.isAuthenticated" :items="accountItems">
            <UButton variant="ghost" color="neutral" class="gap-2">
              <UAvatar icon="i-lucide-user" size="2xs" />
              <span class="hidden max-w-32 truncate sm:inline">
                {{ auth.displayName || "Account" }}
              </span>
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 text-(--ui-text-dimmed)"
              />
            </UButton>
          </UDropdownMenu>
          <template v-else>
            <UButton
              to="/auth/login"
              variant="ghost"
              color="neutral"
              label="Sign in"
            />
            <UButton to="/auth/register" label="Get started" />
          </template>

          <template #fallback>
            <UButton
              to="/auth/login"
              variant="ghost"
              color="neutral"
              label="Sign in"
              class="hidden sm:inline-flex"
            />
            <UButton
              to="/auth/register"
              label="Get started"
              class="hidden sm:inline-flex"
            />
          </template>
        </ClientOnly>

        <UButton
          icon="i-lucide-menu"
          variant="ghost"
          color="neutral"
          aria-label="Open menu"
          class="sm:hidden"
          @click="mobileNavOpen = true"
        />
      </div>
    </UContainer>
  </header>

  <USlideover v-model:open="mobileNavOpen" title="Menu" side="right">
    <template #body>
      <nav class="flex flex-col gap-1" aria-label="Mobile">
        <UButton
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          :icon="link.icon"
          :label="link.label"
          color="neutral"
          :variant="isActive(link.to) ? 'soft' : 'ghost'"
          block
          @click="mobileNavOpen = false"
        />

        <USeparator class="my-2" />

        <template v-if="auth.isAuthenticated">
          <UButton
            to="/account"
            variant="ghost"
            color="neutral"
            block
            icon="i-lucide-user"
            label="My account"
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
        </template>
        <template v-else>
          <UButton
            to="/auth/login"
            variant="ghost"
            color="neutral"
            block
            label="Sign in"
            @click="mobileNavOpen = false"
          />
          <UButton
            to="/auth/register"
            block
            label="Get started"
            @click="mobileNavOpen = false"
          />
        </template>
      </nav>
    </template>
  </USlideover>
</template>
