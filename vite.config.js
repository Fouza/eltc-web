import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@components': r('./src/components'),
      '@pages': r('./src/pages'),
      '@layouts': r('./src/layouts'),
      '@store': r('./src/store'),
      '@api': r('./src/api'),
      '@context': r('./src/context'),
      '@helpers': r('./src/helpers'),
      '@data': r('./src/data'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [r('./src/styles'), r('./node_modules')],
        quietDeps: true, // Bootstrap 5 still uses @import
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },
  server: { port: 5174, strictPort: true },
  test: { environment: 'jsdom', setupFiles: ['./src/testSetup.js'], css: false },
});
