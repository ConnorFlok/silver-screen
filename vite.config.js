import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning threshold — search_index.json is large but gzips well
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        // Keep JSON data files as separate chunks so they load lazily
        manualChunks: {
          'search-index': ['./src/data/search_index.json'],
        },
      },
    },
  },
  // Optimise JSON import performance
  json: {
    stringify: true,
  },
});
