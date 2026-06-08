import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Rutas absolutas (desde la ubicación de este archivo) para que el escaneo de
// clases funcione sin importar el directorio desde el que se ejecute Vite.
const root = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, '/');

/** @type {import('tailwindcss').Config} */
export default {
  // F5 — Tema oscuro por clase `.dark` en <html> (la pone src/lib/theme.ts).
  darkMode: 'class',
  content: [`${root}/index.html`, `${root}/src/**/*.{ts,tsx}`],
  theme: {
    extend: {
      colors: {
        // Branding del piloto (fijo en ambos temas)
        brand: {
          navy: '#1F3864',
          gold: '#F0CDA1',
        },
        // Semánticos: se adaptan al tema vía variables CSS (ver src/index.css).
        // El canal RGB permite opacidades de Tailwind (p. ej. bg-loss/90).
        gain: 'rgb(var(--gain) / <alpha-value>)',
        loss: 'rgb(var(--loss) / <alpha-value>)',
        // Texto de títulos/énfasis: navy en claro, casi-blanco en oscuro.
        heading: 'rgb(var(--heading) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
