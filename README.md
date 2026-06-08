# Tracker de Portafolio Personal

App web **local** para llevar el control de un portafolio de inversiones
(criptomonedas, acciones y renta fija) en una sola **moneda base** de tu elección.
Sin login, sin cuenta, sin nube: tus datos viven en tu navegador (IndexedDB) y
respaldas con un archivo JSON.

> Promesa del producto: **captura tus operaciones y precios; todo lo demás se calcula solo.**

---

## Pantallas

- **Resumen** — KPIs (valor, invertido, P&L, rendimiento), gráfica de asignación vs.
  objetivo, evolución del valor y desglose de P&L. Botón *Tomar snapshot de hoy* para
  registrar la foto del portafolio.
- **Posiciones** — tenencia, costo y rendimiento calculados por activo (solo lectura).
- **Movimientos** *(captura)* — compras, ventas, dividendos, intereses, staking y ajustes.
- **Activos y precios** *(captura)* — catálogo, precio actual y tipos de cambio.
- **Renta fija** *(captura)* — CETES, fondos de liquidez, bonos con cupón y UDIBONOS, con
  sugerencia para registrar cupones ya pagados.
- **Configuración** *(captura)* — moneda base, objetivos de asignación, exportar/importar
  y reiniciar.
- **Acerca de** — versión, privacidad y créditos.

La primera apertura muestra una **guía rápida** y datos de ejemplo borrables.

---

## Requisitos

- [Node.js](https://nodejs.org) 18 o superior (incluye `npm`). Solo se necesita para
  desarrollar y construir; el usuario final no necesita Node.
- Un navegador moderno (Chrome, Edge o Firefox).

## Cómo correr en desarrollo

```bash
npm install      # instala dependencias (solo la primera vez)
npm run dev      # servidor de desarrollo en http://localhost:5173
```

## Cómo construir la versión de distribución

```bash
npm run build    # genera la carpeta dist/ con index.html + assets
npm run preview  # (opcional) prueba ese build localmente
```

El resultado queda en `dist/`. Para distribuir: comprime esa carpeta en un **ZIP**.
El usuario final descomprime y abre la app.

> Recomendación: para que IndexedDB funcione de forma consistente conviene servir la
> carpeta con un servidor estático simple (p. ej. `npx serve dist`, o la extensión
> "Live Server" de VS Code) en lugar de abrir `index.html` con doble clic. Más adelante
> se puede empaquetar como app de escritorio con [Tauri](https://tauri.app).

## Pruebas

```bash
npm run test         # corre las pruebas del motor de cálculo una vez
npm run test:watch   # modo interactivo (re-corre al guardar)
```

Las pruebas viven junto al código que prueban (`*.test.ts`). El **motor de cálculo**
(`src/lib/`) está cubierto regla por regla (secciones 6 y 8 del brief).

## Estructura del proyecto

```
src/
  lib/                       # MOTOR DE CÁLCULO — funciones puras, sin UI ni acceso a datos
    dates.ts                 # helpers de fechas (sin dependencias externas)
    portfolio-engine.ts      # reglas de la sección 6 (conversión, costo prom., P&L, allocation)
    fixed-income-engine.ts   # reglas de la sección 8 (4 tipos de renta fija)
    *.test.ts                # pruebas unitarias del motor
  db/                        # esquema IndexedDB (Dexie) + datos de ejemplo (seeds)
  types/                     # tipos del dominio (entidades del brief)
  store/                     # estado de la app (Zustand)
  components/                # componentes de UI compartidos
  screens/                   # pantallas (Dashboard, Movimientos, Posiciones, ...)
  App.tsx
  main.tsx
```

## Decisiones de diseño

- **Una sola regla para el usuario:** solo se captura en pantallas marcadas como
  *captura*; todo lo demás es lectura calculada.
- **Multimoneda real:** cada operación y cada precio se captura en su moneda original;
  la app convierte a la moneda base usando el tipo de cambio.
- **Costo promedio ponderado** (no PEPS) para el P&L realizado — simplificación del MVP.
- **Renta Fija de captura única:** los instrumentos (CETES, Bonos M, UDIBONOS) se capturan
  una sola vez en su módulo con sus parámetros; el *capital invertido* es el costo base.
  Los cupones/intereses cobrados se registran como movimientos tipo *Interés*.
  El *Fondo de Liquidez* sí se modela con movimientos de Compra/Venta + saldo reportado.
- **Sin valuación a mercado de bonos** (no yield-to-maturity, duration ni convexity). El
  valor se asume a nominal salvo que captures manualmente un precio en el activo.

## Lo que el MVP NO hace (queda para v2)

- PEPS lote por lote, integraciones con brokers/exchanges, APIs de precios automáticas,
  multi-portafolio y módulo fiscal.

## Respaldo de datos

Tus datos viven en IndexedDB (en este navegador, en este equipo). Usa
**Configuración → Exportar** para guardar un archivo JSON de respaldo, e **Importar**
para restaurarlo en otro equipo o navegador.

---

Hecho con React + Vite + TypeScript + Tailwind + Dexie. Branding: navy `#1F3864`,
gold `#F0CDA1`.
