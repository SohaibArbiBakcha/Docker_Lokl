import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // The back-office lives under /admin on the combined site (landing at /) —
  // built assets and dev server both use this prefix.
  base: '/admin/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy, rarely-changing vendor code from app code so browsers
        // cache it across deploys instead of re-downloading one 1.3MB bundle.
        // Function form — this Vite build runs on Rolldown, which doesn't
        // support the plain object form of manualChunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-admin') || id.includes('ra-data-simple-rest')) return 'vendor-admin';
          if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
          if (id.includes('recharts')) return 'vendor-charts';
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
          return 'vendor';
        },
      },
    },
  },
})
