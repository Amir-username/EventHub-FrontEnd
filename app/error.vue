<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <UApp>
    <div class="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
      <p class="font-display text-7xl tracking-tight">{{ error.statusCode }}</p>
      <p class="text-lg text-(--ui-text-muted)">
        {{ error.statusCode === 404 ? 'Page not found' : 'Something went wrong' }}
      </p>
      <UButton label="Back to home" @click="goHome" />
    </div>
  </UApp>
</template>
