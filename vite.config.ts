import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { flowConfigFilePlugin } from './vite-plugin-flow-config';

export default defineConfig({
  plugins: [react(), flowConfigFilePlugin()],
  root: '.',
  publicDir: 'public',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: './index.html',
        fluxo: './fluxo.html',
      },
    },
  },
  server: {
    open: '/fluxo.html',
  },
});
