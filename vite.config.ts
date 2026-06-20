import { defineConfig } from 'vite';

export default defineConfig({
  base: '/smooth-step-function/',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600
  }
});
