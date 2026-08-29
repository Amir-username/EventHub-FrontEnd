export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@pinia/nuxt", "@nuxt/eslint"],

  css: ["~/assets/css/main.css"],

  devtools: { enabled: true },

  compatibilityDate: "2025-07-15",

  fonts: {
    families: [
      { name: "Inter", weights: [400, 500, 600, 700] }, // body
      { name: "Space Grotesk", weights: [500, 600, 700] }, // display
    ],
  },

  runtimeConfig: {
    public: {
      // Base URL of the EventHub API — include the API prefix exactly as served
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:8000",
      appUrl: process.env.NUXT_PUBLIC_APP_URL || "http://localhost:3000",
    },
  },

  routeRules: {
    // Public pages: cached HTML for SEO.
    // ⚠️ SWR pages are shared across users — render account state client-side only.
    "/": { swr: 60 },
    "/events": { swr: 60 },
    "/events/**": { swr: 60 },
    // Private, token-dependent pages: client-only.
    "/checkout/**": { ssr: false },
    "/account/**": { ssr: false },
    "/admin/**": { ssr: false },
  },

  typescript: { strict: true },
});
