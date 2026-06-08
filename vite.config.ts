/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' => rutas relativas, para que el build estático funcione
// abierto desde cualquier carpeta o servidor estático simple.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // Recharts es de por sí grande (~545 kB); ya está aislado en su propio chunk.
    chunkSizeWarningLimit: 600,
    // S2 — Sin polyfill de modulepreload: evita el <script> inline que Vite
    // generaría (Electron usa un Chromium moderno) y habilita una CSP con
    // script-src 'self' (sin 'unsafe-inline').
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        // Separar las librerías pesadas en chunks propios: el navegador puede
        // cachearlas entre versiones y descargarlas en paralelo.
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['recharts'],
          db: ['dexie', 'dexie-react-hooks'],
          // ExcelJS solo se usa al exportar; aislado en su propio chunk (igual que
          // recharts/dexie) para no inflar el bundle principal.
          exceljs: ['exceljs'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
