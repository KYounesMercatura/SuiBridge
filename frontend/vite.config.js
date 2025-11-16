import * as fs from 'fs';
import { fileURLToPath, URL } from 'url';
import environment from 'vite-plugin-environment';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Read canister IDs - go up one level since config is in frontend/
let canisterIds = {};
try {
  canisterIds = JSON.parse(fs.readFileSync('../.dfx/ic/canister_ids.json', 'utf-8'));
} catch (e) {
  try {
    canisterIds = JSON.parse(fs.readFileSync('../.dfx/local/canister_ids.json', 'utf-8'));
  } catch (e2) {
    console.warn('⚠️ Cannot read canister_ids.json. Did you run dfx deploy?');
  }
}

const backendCanisterId = canisterIds.backend?.ic ?? canisterIds.backend?.local ?? "";

export default defineConfig({
  // NO root property - we're already in frontend/
  base: './',
  plugins: [
    react(),
    environment('all', { prefix: 'CANISTER_' }),
    environment('all', { prefix: 'DFX_' }),
    tailwindcss() // ← This is here, good!
  ],
  envDir: '../',
  define: {
    'import.meta.env.VITE_CANISTER_ID_backend': JSON.stringify(backendCanisterId),
    'process.env': process.env,
    'global': 'globalThis'
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  resolve: {
    alias: [
      {
        find: 'declarations',
        replacement: fileURLToPath(new URL('../src/declarations', import.meta.url))
      }
    ]
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4943',
        changeOrigin: true
      }
    },
    host: '127.0.0.1',
    port: 3000
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url))
      }
    }
  }
});