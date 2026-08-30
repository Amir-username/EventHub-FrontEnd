<template>
  <div class="min-h-screen flex flex-col">
    <header class="py-6">
      <UContainer class="flex justify-center">
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
      </UContainer>
    </header>

    <main class="flex flex-1 items-start justify-center px-4 pb-16">
      <div class="card-surface mt-8 w-full max-w-md p-6 sm:p-8">
        <slot />
      </div>
    </main>
  </div>
</template>
