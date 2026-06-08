# Handoff / Onboarding — Tracker de Portafolio

> **Para qué es este archivo:** arrancar una **conversación nueva de Claude Code**
> que va a **agregarle funciones a la app**. Léelo completo antes de empezar.
> Para el detalle de producto, lee también `README.md`.
>
> 💡 *Tip:* en la conversación nueva, di algo como
> *"Lee `handoff.md` y `README.md` antes de empezar"*. (O copia este archivo como
> `CLAUDE.md` y Claude Code lo cargará solo en cada sesión de este proyecto.)

Última actualización: **5 / junio / 2026** (Sesión 10 — **v0.9.0 CERRADA: SECTORES (lista fija), ETIQUETAS
personalizadas (Premium+, 1 gratis en Free/Pro) y GRÁFICAS DE DIVERSIFICACIÓN en Dashboard y Análisis —
HECHO y verificado en navegador**. Código en 0.9.0; `npm test` **152/152**; typecheck 0; 0 errores de
consola. Dexie a **v4** (tabla `labels`). Lee **§2bis-S10**. La S9 (auto-updates) sigue HECHA y solo
pendiente de infra del dueño. ⚠️ **Instalador 0.9.0 NO construido** (lo hace el dueño con
`npm run app:build`); el .exe en `release\` sigue siendo el **0.6.0**.
Pendiente: reconstruir instalador 0.9.0 + (arrastrado de S9) montar la infra de GitHub Releases).

> ⭐ **¿VAS A ESCRIBIR UN PROMPT NUEVO?** Lee primero la sección **"ESTADO ACTUAL v0.9.0"** (abajo,
> antes del §0 TL;DR): es el inventario REAL de lo que YA existe, con nombres y firmas exactos, para
> que el prompt no pida recrear cosas hechas ni use nombres equivocados.

> 🚦 **SI ERES LA SIGUIENTE SESIÓN: los 8 bloques de la Sesión 4 (A–H) están completos
> y verificados (base **v0.3.0**, hoy ya en v0.6.0 — ver §2bis-S7): sistema de licencias,
> importación, renta fija mexicana, features premium (alertas/comisiones/liquidez/benchmarks/metas/rebalanceo),
> consultoría fiscal, soporte in-app y FX histórico. Lee §2bis-S4 "Sesión 4 — progreso"
> para el detalle, gotchas nuevos y qué queda para v0.4.0. No re-hagas A–H / F1–F6 / S1–S7.**
>
> 🚦 **SESIÓN 5 (v0.4.0, delta de UX) HECHA y verificada en navegador: T1 idiomas en lengua
> nativa, T2 tarjeta de asesoría con descuento por plan, T4 tour guiado. Lee §2bis-S5.
> ⚠️ OJO: el doc externo `PROMPT_CLAUDE_CODE_v0.4.0_FINAL.md` está DESFASADO — pedía recrear
> las licencias (validación solo-formato `ACOSTA-F-CONSULTING-…`, `plans.ts`,
> `LicenseActivation.tsx`, `getCurrentPlan` en localStorage) y la pantalla Ayuda, que YA
> EXISTEN y mejores (firma RSA real, plan en Dexie). NO lo sigas al pie de la letra; se
> implementó SOLO el delta nuevo. Versión subida a 0.4.0 e instalador reconstruido (smoke exit 0).
> Único pendiente: poner el link de pago real de Odoo y resubir el instalador a Gumroad (lo hace el dueño).**
>
> 🚦 **SESIÓN 6 (v0.5.0) HECHA y verificada: T1 export Excel con ExcelJS (formato + encabezados i18n;
> SheetJS sigue instalado para IMPORTAR), T2 texto de asesoría → "cumplimiento fiscal en México".
> Lee §2bis-S6. ⚠️ El prompt externo v0.5.0 también traía firmas de export DESFASADAS; se mantuvieron
> las reales (`exportResumenXlsx`/`exportMovimientosXlsx`, + parámetro `t`). Código en 0.5.0; el
> instalador (aún 0.4.0) lo reconstruye el dueño con `npm run app:build`.**
>
> 🚦 **SESIÓN 7 (v0.6.0) HECHA y verificada: T1 airdrops/recompensas cripto (tipos `Airdrop`/`Recompensa`),
> T2 filtros/búsqueda/orden en Movimientos y Posiciones, T3 recordatorios de vencimiento de renta fija.
> Lee §2bis-S7. ⚠️ El prompt externo v0.6.0 traía supuestos DESFASADOS (tipos en minúsculas,
> `maturityDate` camelCase, "Movimientos sin filtros"); se adaptó a lo real. Código en 0.6.0;
> **instalador 0.6.0 reconstruido** (smoke exit 0). Falta: subirlo a Gumroad + link de pago de Odoo.**
>
> 🚦 **SESIÓN 8 (v0.7.0) HECHA y verificada: 2 BUGFIXES (no features). T1 precios en vivo de Yahoo — la
> causa REAL era **CORS** (Yahoo responde 200 sin `Access-Control-Allow-Origin`), NO el endpoint/parseo;
> se arregló inyectando la cabecera en `electron/main.cjs` (`onHeadersReceived`), + Frankfurter movió a
> `api.frankfurter.dev/v1`. T2 plantilla de importación = columnas de entrada del export (ExcelJS), con
> `fx_rate`/`platform` nuevos en el importador y sinónimos Airdrop/Recompensa. Lee §2bis-S8. ⚠️ El fix de
> Yahoo SOLO aplica en el Electron empaquetado, NO en Vite dev. Código en 0.7.0; `npm test` 127/127;
> instalador 0.7.0 NO construido (lo hace el dueño).**
>
> 🚦 **SESIÓN 9 (v0.8.0) HECHA y verificada: sistema de ACTUALIZACIONES (electron-updater + GitHub Releases
> PÚBLICO). Opt-in con 2 casillas (`auto_check_updates`/`auto_download_updates`, default OFF), sección en
> Configuración + badge flotante + modal. Lee §2bis-S9. NUEVO en la arquitectura: ahora HAY **preload + IPC**
> (`electron/preload.cjs` expone `window.updater`) — antes se evitaba; es la única forma de que el renderer
> hable con electron-updater (que vive en main). NO toca el CORS de Yahoo. ⚠️ Solo funciona en el EMPAQUETADO
> y requiere infra del dueño (repo `AcostaConsulting/Portfolio-Tracker`, releases con `--publish`, `GH_TOKEN`).
> ✅ Repo PÚBLICO (decisión del dueño): los CLIENTES reciben updates SIN token; el `GH_TOKEN` solo lo usa el
> dueño para PUBLICAR. Sin secretos en el repo (las claves RSA viven offline). Código en 0.8.0; `npm test`
> 138/138; instalador 0.8.0 NO construido (lo hace el dueño).**
>
> 🚦 **SESIÓN 10 (v0.9.0) HECHA y verificada: SECTORES (lista fija de 11 acciones + 10 cripto), ETIQUETAS
> personalizadas (tabla Dexie `labels` **v4**; Premium/Lifetime ilimitadas, 1 gratis en Free/Pro → luego
> UpgradeLock) y GRÁFICAS DE DIVERSIFICACIÓN (donas + barras) en Dashboard y Análisis. Motores PUROS nuevos
> `lib/custom-labels.ts` y `lib/diversification.ts` (14 tests). Lee §2bis-S10. ⚠️ El motor de gating se
> llama `custom-labels.ts`, NO `labels.ts` (ese ya existía con los arreglos de enums). Se creó el flujo de
> EDICIÓN de activos (`AssetModal`). Código en 0.9.0; `npm test` 152/152; typecheck 0; instalador 0.9.0 NO
> construido (lo hace el dueño).**

---

## ⭐ ESTADO ACTUAL v0.9.0 — qué YA existe (LEE ESTO ANTES DE ESCRIBIR UN PROMPT NUEVO)

> **Por qué existe esta sección:** los prompts de sesiones previas llegaron DESFASADOS (pedían recrear
> features ya hechas, o usaban nombres/firmas/tipos equivocados). Este es el inventario REAL y
> autoritativo. Si vas a generar el prompt de la próxima sesión: **no pidas nada de lo de abajo "desde
> cero"**; usa los nombres y firmas EXACTOS de aquí, y saca el trabajo nuevo del **Backlog real**.

### Versión y empaquetado
- **Versión: 0.9.0** en `package.json`, `package-lock.json` (×2) y `src/config/version.ts` (`APP_VERSION`).
  La UI lee SIEMPRE `APP_VERSION`; la versión **NO** se hardcodea en `Acerca.tsx`.
- ⚠️ **Instalador 0.8.0 PENDIENTE de construir** (lo hace el dueño con `npm run app:build`). El .exe que
  hay en `release\` sigue siendo el **0.6.0** (`Tracker de Portafolio Setup 0.6.0.exe`, hash `1c1fe1a1…`);
  las versiones 0.7.0 y 0.8.0 NO se han empaquetado. Al reconstruir hay que actualizar nombre + hash SHA-256
  en las docs de release (`landing/index.html`, `GUIA-DUEÑO.md`, `PRIVACY.md`, `TERMINOS.md`) y resubir a Gumroad.
- **`electron-updater`** (^6.8.3, en `dependencies`, S9). Para PUBLICAR releases usa **`npm run app:publish`**
  (= `app:build` + `--publish always`); requiere `GH_TOKEN` en el entorno (ver §2bis-S9). `app:build` (sin
  publish) sigue existiendo para construir el instalador local.

### Convenciones que NO se negocian (los prompts las suelen violar)
- **`src/lib/` es PURO**: ningún archivo importa React ni Dexie; recibe datos por parámetro.
- **Todo texto de UI por i18n** (`useTranslation`); 5 idiomas (`es` fuente de verdad + en/fr/zh/ja). El
  selector muestra nombres NATIVOS (Español/English/Français/中文/日本語).
- **`TransactionType` es Capitalizado**: `'Compra'|'Venta'|'Dividendo'|'Interés'|'Staking'|'Ajuste'|'Airdrop'|'Recompensa'`.
- **`Tier` es minúsculas**: `'free'|'pro'|'premium'|'lifetime'`.
- **Campos de dominio en snake_case** (`maturity_date`, `current_price`, `fixed_income_type`,
  `operation_currency`, `price_per_unit`, …). NO camelCase.
- **`db.settings.update()` nunca `put()`** (put borra campos no incluidos).
- **Dexie v4** (license=v2, goals=v3, **labels=v4** S10). Tabla/índice nuevo → subir versión; los campos no indexados (p. ej. `Asset.sector`/`label_ids`) van solos, sin migración.
- **Enlaces externos** solo por `lib/external.ts` (allowlist HTTPS: Odoo, Gumroad, Loom, YouTube). Sin `mailto:`.
- **Tokens Tailwind**: `brand-navy` #1F3864, `brand-gold` #F0CDA1, `gain`, `loss`, `heading`; dark mode por `.dark`.
- **Display USD↔MXN = 18** (`USD_MXN_DISPLAY` en `config/tiers.ts`). No introduzcas otro tipo de cambio.
- **Preload/IPC (S9):** `electron/preload.cjs` expone SOLO `window.updater` (contextBridge). Es el único
  puente renderer↔main; mantén `sandbox`/`contextIsolation`/`webSecurity` en `true`. La red del updater corre
  en MAIN, así que NO pasa por la CSP del renderer (no agregues GitHub a `connect-src`).

### Pantallas (TODAS existen) — `src/screens/`, ruteo por `store/ui.ts` (tipo `Screen`)
Dashboard · Posiciones · Movimientos · Activos · RentaFija · Importar · Analisis · Configuracion · Ayuda · Acerca.

### Features YA construidas (NO pedir recrearlas)
- **Licencias Free/Pro/Premium/Lifetime** — `config/tiers.ts` (`TIER_CAPS`, `TIER_PRICING`, `GUMROAD_URL`,
  `mxnMirror`). Validación **RSA-2048 OFFLINE** en `lib/license.ts` (`verifyLicense(code, signatureB64)`,
  `tierFromCode`; formato `PTRF-{PRO|PREMIUM|LIFE}-{YYYY}-{8hex}`). Plan activo en **Dexie** (`db.license`,
  hook `useTier()`); gating `useCapability('canX')`. UI: `LicenseModal`/`LicenseBadge`/`UpgradeLock`/
  `LicenseNotices`. ⛔ NO recrear con validación "solo formato", `plans.ts`, `getCurrentPlan` ni localStorage.
- **i18n** — `src/i18n/{es,en,fr,zh,ja}.json` + `index.ts` (`applyLanguage`, `LANGUAGES`). Bloques ya
  presentes: app, nav, common, txType, assetClass, allocClass, fiTypeLabel/Short, freq, priceSource/Freq,
  dashboard, posiciones, movimientos, activos, rentaFija, config, security, lock, language, consulting,
  tour, export, filters, maturity, tier, license, activate, paywall, capability, import, analisis, tax,
  alerts, ayuda, acerca, onboarding.
- **Motor de cálculo (puro, con tests)** — `lib/portfolio-engine.ts` (cantidad/costo prom./P&L/asignación;
  `ACQUIRE_TYPES`, `COST_TYPES`), `lib/fixed-income-engine.ts` (CETES/liquidez/cupón/UDIBONO + pagaré/
  SoFIPO/ahorros + `computeMaturityAlerts`), `lib/selectors.ts` (`computePortfolioView`,
  `computeFixedIncomeView`), `lib/insights.ts`, `lib/goals.ts`, `lib/tax-events.ts`, `lib/dates.ts`, `lib/format.ts`.
- **Export Excel (ExcelJS, con formato + i18n)** — `lib/export-xlsx.ts`. **SheetJS (`xlsx`) sigue SOLO
  para IMPORTAR** (`lib/import-xlsx.ts` / `lib/import.ts`) — no desinstalar.
- **Tarjeta de asesoría** — `lib/consulting.ts` + `components/ConsultingCard.tsx` (en Dashboard).
- **Onboarding + Tour** — `components/Onboarding.tsx` (wizard 1er uso, flag `pt-onboarded`) y
  `components/TourOnboarding.tsx` (tour spotlight, flag `tour-seen`, estado en `useUi.tourOpen`).
- **Movimientos** — captura + airdrops/recompensas + **filtros/búsqueda/orden** (memoria, estado local).
- **Posiciones** — lectura + **filtros** (búsqueda/clase/ganancia-pérdida).
- **Renta fija** — captura por tipo + **sección "Próximos vencimientos"**.
- **Análisis** (Pro+/Premium) — alertas, comisiones, liquidez, rebalanceo, benchmarks (captura manual), metas.
- **Eventos fiscales** — `lib/tax-events.ts` (DESCRIBE, no calcula): venta/interés/dividendo/staking/airdrop/reward.
- **Seguridad opt-in** — `lib/crypto.ts` + `store/vault.ts` (PIN + AES-GCM), `LockScreen`; respaldo JSON
  (cifrado opcional). **Precios en vivo opt-in** — `lib/price-fetcher.ts` (F3, OFF por defecto): CoinGecko
  (cripto), Yahoo `v8/finance/chart` (acciones) y Frankfurter (`api.frankfurter.dev/v1`, FX). ⚠️ Yahoo NO
  manda cabecera CORS → `electron/main.cjs` (`onHeadersReceived`) inyecta `ACAO:*` para los hosts de
  precios; por eso los precios de Yahoo solo llegan en el EMPAQUETADO, no en Vite dev (ver §2bis-S8).
- **Importar** — pantalla + `lib/import.ts`/`import-xlsx.ts` (SheetJS LEE; mapeo flexible). La plantilla de
  Movimientos la genera ExcelJS (`buildMovimientosTemplateWorkbook` en `export-xlsx.ts`) con las MISMAS
  columnas de entrada del export. `ImportField` incluye `fx_rate` y `platform` (v0.7.0).
- **Actualizaciones opt-in (S9)** — `lib/updater.ts` (PURO: `isNewerVersion`, `shouldAutoCheck` 7 días,
  `normalizeUpdatePrefs`, `parseVersionFromTag`), `store/updates.ts` (estado Zustand + `getUpdaterBridge`),
  `store/update-syncer.ts` (`useUpdateSyncer` + `runUpdateCheck/Download/Install`). UI: sección
  "Actualizaciones" en Configuración + `components/UpdateBadge.tsx`. Main: `electron-updater` en
  `electron/main.cjs` (IPC `updater:check/download/install`, `requestHeaders` con `GH_TOKEN`, guard
  `app.isPackaged`) + `electron/preload.cjs`. Prefs en Dexie: `auto_check_updates`/`auto_download_updates`/
  `updates_last_checked` (default OFF). Solo funciona en el empaquetado con infra de GitHub (ver §2bis-S9).
- **Sectores, etiquetas y diversificación (S10)** — clasificación OPCIONAL en 2 capas: `Asset.sector`
  (`AssetSector`: 11 acciones + 10 cripto; todos los planes) y `Asset.label_ids` (tabla Dexie `labels`
  **v4**; etiquetas libres, Premium+ con 1 gratis en Free/Pro). Motores PUROS `lib/custom-labels.ts`
  (`canAddLabel`) y `lib/diversification.ts` (`computeDiversificationView`). UI: `components/LabelManager.tsx`
  (Configuración), `components/DiversificationChart.tsx` (donas + barras, Dashboard y Análisis), campos
  Sector/Etiquetas + badge "Sin sector" en Activos (modal `AssetModal`, ahora con EDICIÓN). ⚠️ El motor de
  gating es `custom-labels.ts`, NO `labels.ts` (`labels.ts` son los arreglos de enums; ver §2bis-S10).

### Firmas EXACTAS (los prompts suelen equivocarlas — usa estas)
- `exportResumenXlsx(view, base, txns, assets, t)` · `exportMovimientosXlsx(txns, assets, base, t)` (async)
- `buildMovimientosTemplateWorkbook(base, t)` · `exportMovimientosTemplateXlsx(base, t)` (plantilla import, v0.7.0)
- `getConsultingPrice(tier: Tier): ConsultingPrice` · `CONSULTING_BOOKING_URL`
- `verifyLicense(code, signatureB64): Promise<{valid, tier}>` · `useTier(): Tier` · `useCapability(cap)`
- `computeMaturityAlerts(positions, assets, today): MaturityAlert[]`
- `computePortfolioView(assets, txns, fiPositions, fxRates, baseCurrency, targets, today)`
- `isNewerVersion(remote, current)` · `shouldAutoCheck(prefs, lastCheckedISO, now)` · `normalizeUpdatePrefs(s)` (lib/updater, S9)
- `runUpdateCheck(autoDownload)` · `runUpdateDownload()` · `runUpdateInstall()` · `useUpdateSyncer()` (store/update-syncer, S9)

### Backlog real (lo que SÍ falta / es nuevo) — saca de aquí el próximo prompt
- Reconstruir el instalador **0.8.0** (`npm run app:build`), subirlo a Gumroad + poner el link de pago real
  de Odoo (`CONSULTING_BOOKING_URL`).
- **Montar la infra de auto-update (S9)**: crear el repo **PÚBLICO** `AcostaConsulting/Portfolio-Tracker` y
  publicar cada versión con `npm run app:publish` + `GH_TOKEN` (solo para publicar). Verificar el flujo real
  (buscar→descargar→reiniciar) en un .exe instalado. (Entrega a clientes DECIDIDA: repo público, sin token.)
- Validación ONLINE opcional de licencias (Cloudflare Worker), además de la offline.
- Multi-portafolio.
- **Geografía** como 3ª capa de clasificación (S11; sectores y etiquetas ya quedaron en S10).
- Benchmarks automáticos (Yahoo `^GSPC` / CoinGecko BTC) cuando F3 esté ON — **ahora más viable**: con el fix
  CORS de la s8, los precios en vivo (Yahoo incluido) llegan en el empaquetado.
- **Ida y vuelta de import en TODOS los idiomas:** `normalizeType` solo entiende sinónimos es/en (los
  ENCABEZADOS ya mapean en los 5); falta reconocer las etiquetas `txType.*` localizadas. Opcional: añadir
  columna "Clase" al export para no perder la clase al reimportar activos nuevos.
- Enlaces reales de videos en `Ayuda.tsx` (hoy placeholders).
- (Opcional) Vencimientos derivados por plazo para CETES sin `maturity_date`.
- PEPS lote por lote (hoy costo promedio); más gráficas; módulo fiscal real (queda fuera del MVP).

### Cómo generar el próximo prompt SIN desfases
1. Elige tareas del **Backlog real** de arriba (no de memoria/entrenamiento).
2. Usa los **nombres y firmas exactos** de este inventario; no inventes `getCurrentPlan`, `plans.ts`,
   `maturityDate`, tipos en minúsculas, ni "Movimientos sin filtros".
3. Respeta las **convenciones** (lib puro, i18n×5, snake_case, `db.settings.update`, allowlist, tokens).
4. Indica explícito qué archivos CREAR vs EDITAR y no rehagas lo ya hecho.

---

## 0. TL;DR para el nuevo agente

- **Qué es:** app de escritorio/web **100 % local** para llevar un portafolio de
  inversiones (cripto, acciones, renta fija) en una sola moneda base. Sin login,
  sin nube, sin internet. Datos en IndexedDB; respaldo por JSON.
- **Stack:** React 18 + Vite 5 + TypeScript + Tailwind 3 + Dexie (IndexedDB) +
  Zustand + Recharts + Vitest. Empaquetado de escritorio con Electron 42 +
  electron-builder (NSIS).
- **Correr en dev:** `npm run dev` → http://localhost:5173
- **Pruebas / tipos:** `npm test` y `npm run typecheck` (mantenlos en verde).
- **Filosofía (no romper):** *el usuario solo captura; todo lo demás se calcula
  solo.* Local-first y privado por diseño.
- **El motor de cálculo** (`src/lib/`) son **funciones puras** con pruebas; si
  tocas reglas de cálculo, actualiza/añade pruebas.

> ⚠️ **Matiz tras la Sesión 2 (ver §2):** dos premisas históricas cambiaron y son
> ahora **opt-in**, no violaciones: (1) la red ya NO está prohibida — F3 añadió
> precios en vivo que el usuario *activa* (OFF por defecto, cero red cuando está
> OFF); (2) la UI ya NO es solo español — F4 añadió 5 idiomas (es por defecto).
> Todo texto de UI va por el sistema i18n (no hardcodear strings).

---

## 1. Objetivo del proyecto

App para que una persona lleve el control de sus inversiones en **una sola moneda
base** elegible. Promesa: **"captura tus operaciones y precios; todo lo demás se
calcula solo."** Multimoneda real (cada operación/precio en su moneda; la app
convierte a base con el tipo de cambio). Sin valuación a mercado de bonos; costo
promedio ponderado (no PEPS). Detalle completo en `README.md`.

**Restricciones de contexto:** el dueño **no es programador**, trabaja en un
**equipo escolar Windows sin permisos de administrador**, y la comunicación es en
**español**.

---

## 2. Estado actual

- ✅ **App completa** (14 tareas: modelo de datos, motor de cálculo, renta fija,
  7 pantallas, onboarding, snapshots, respaldo export/import).
- ✅ **App de escritorio empaquetada y probada.** El instalador existe:
  `release\Tracker de Portafolio Setup 0.1.0.exe` (~99 MB, NSIS).
  Smoke test del .exe empaquetado = exit 0; icono y metadatos verificados.
- Documentos de apoyo: `README.md` (producto) y
  `COMO-EMPAQUETAR-Y-DISTRIBUIR.txt` (guía no técnica para instalar/repartir).

### Sesión 2 — progreso (30/mayo/2026)

**Estado de cierre certificado:** `npm run typecheck` ✅ · `npm test` ✅ **56/56** ·
`npm run build` ✅ · smoke de Electron ✅ · `npm run app:build` ✅ (instalador 0.2.0 +
`SHA256SUMS.txt`). `package.json` en **0.2.0**. Hechas **13 de 13** tareas (F1–F6 + S1–S7).
**El proyecto NO es un repositorio git** (`git status` → "not a git repository"); el código
vive solo en disco, no hay commits que hacer.

**Hechas y verificadas** (typecheck + 51 tests verdes; verificado en navegador con
el preview MCP — ver §2ter "Cómo verifico en navegador"):

- ✅ **F1 — Exportar a Excel** · nuevo `src/lib/export-xlsx.ts`. Botones en Dashboard
  (reporte de 2 hojas: Resumen + Movimientos) y Movimientos (respeta filtros activos).
  Solo serialización; reutiliza datos del motor (`computePortfolioView`, helpers de
  `portfolio-engine`). Celdas siempre tipo texto (SheetJS no genera fórmulas) → cumple S6.
- ✅ **F2 — Exportar a PDF** · nuevo `src/lib/print.ts` + bloque `@media print` en
  `src/index.css`. `window.print()` nativo (sin jsPDF/puppeteer). Clase `app-no-print`
  oculta sidebar/acciones/nav; hay un encabezado solo-impresión (app + pantalla + fecha)
  en `AppShell` (`hidden print:block`); `break-inside-avoid` en Card/KPIs; el título del
  documento se cambia y se restaura. **El print FUERZA fondo blanco/texto oscuro** en
  `body` (ojo con F5: ver advertencia en §2bis paso 8).
- ✅ **F3 — Precios en vivo (opt-in)** + **S3** (validación de red) ·
  nuevo `src/lib/price-fetcher.ts` (PURO, no importa React/Dexie: CoinGecko/Yahoo/
  Frankfurter, `Promise.allSettled`, timeout 10 s con `AbortController`, valida que cada
  precio sea nº finito > 0, comentario de PRIVACIDAD). Nuevos `src/store/price-syncer.ts`
  (`usePriceSyncer` hook montado en `App.tsx` + `runPriceSync()`) y `src/store/prices.ts`
  (estado del indicador en Zustand, en memoria). Nuevo `src/components/PriceStatus.tsx`
  (🟢🟡🔴). UI: sección "Precios en tiempo real" en Configuración, columna "Fuente" por
  activo en Activos (solo si el toggle ON). Campos nuevos **opcionales**
  (`Asset.price_source`, `Settings.live_prices_enabled`, `Settings.price_update_frequency`)
  → sin migración Dexie. **Privacidad verificada en vivo**: con fetch espiado, solo salen
  tickers + códigos de moneda. 9 pruebas nuevas con `fetch` mockeado.
- ✅ **F4 — i18n 5 idiomas** (es/en/fr/zh/ja) · `react-i18next` + `i18next`. Nuevo
  `src/i18n/` (`index.ts` + `es/en/fr/zh/ja.json`; **es = fuente de verdad**,
  `fallbackLng: 'es'`). Selector en Configuración (persiste `Settings.language`).
  `format.ts` ahora tiene `setFormatLocale()` (Intl por idioma). `labels.ts` quedó
  **solo con arreglos de valores**; las etiquetas visibles se traducen con
  `t('assetClass.…')`, `t('txType.…')`, `t('fiTypeLabel.…')`, `t('freq.…')`,
  `t('priceSource.…')`, `t('priceFreq.…')`. **TODAS** las pantallas + AppShell +
  PageHeader + Onboarding threadeadas con `useTranslation()`. Cambio de idioma en vivo
  (sin recargar), verificado en japonés (incluida Renta fija, la más compleja).

**Gotchas nuevos de la Sesión 2 (LEER, ahorran tiempo):**

1. **`xlsx` viene del CDN de SheetJS, NO del registro npm.** El `xlsx` del registro
   (0.18.5) tiene 2 advisories *high* sin fix (prototype-pollution, ReDoS) → rompería el
   gate de S7. Instalado el mantenido:
   `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`.
   `npm audit` queda en **5 moderate, 0 high/critical** (el gate `--audit-level=high` pasa).
2. **`db.settings.put({...})` BORRA los campos no incluidos** (reemplaza el singleton
   entero). Por eso `Configuracion.save` y `Onboarding.finish` ahora usan
   **`db.settings.update(SETTINGS_ID, {...})`**. **Regla para F5:** al guardar el tema,
   usa `update`, nunca `put`. (Si no, borrarías `language`, `live_prices_enabled`, etc.)
3. **Patrón "aplicar antes del render" ya establecido para idioma → replícalo en F5.**
   En `src/i18n/index.ts` el idioma se cachea en `localStorage` (`pt-lang`) y se aplica
   sincrónicamente al cargar el módulo (importado en `main.tsx` antes de montar React).
   F5 debe hacer lo MISMO con el tema (`pt-theme`) para evitar el flash de tema incorrecto.
4. **Convención snake_case en campos nuevos.** El prompt escribe `priceSource`,
   `livePricesEnabled`, pero el modelo real usa snake_case (`current_price`,
   `fixed_income_type`). Se respetó: `price_source`, `live_prices_enabled`,
   `price_update_frequency`, `language`. **F5: usa `theme` (string union).**
5. **`db.settings.update()` necesita que la fila exista.** `seed.ts` ya siembra
   `DEFAULT_SETTINGS` con todos los campos nuevos (incluye `language: 'es'`). Para F5
   agrega `theme: 'system'` (o 'light') a `DEFAULT_SETTINGS`.
6. **PowerShell:** la sesión corrió todo con
   `$env:Path = "C:\Program Files\nodejs;" + $env:Path; …; if ($?) { … }`. Sin `&&`.

### Sesión 3 — progreso (31/mayo/2026)

**Cierre:** `npm run build` ✅ · `npm test` ✅ **51/51** · smoke Electron ✅ (exit 0) ·
`npm audit --audit-level=high` ✅ (5 moderate, 0 high/critical). Verificado en navegador
(claro + oscuro: Dashboard, Configuración, modal de Movimientos; toggle instantáneo y persistido).

- ✅ **F5 — Tema claro / oscuro / sistema.** Nuevo `src/lib/theme.ts` (espejo de i18n:
  `applyTheme/resolveDark/cachedTheme/useThemeSync`, caché `localStorage('pt-theme')`, aplicado
  antes del render desde `main.tsx`). `tailwind.config.js` con `darkMode:'class'` y tokens por
  **variables CSS**: `gain`/`loss` (canal RGB, soportan opacidad) y **`heading`** (navy↔slate-100)
  que reemplazó TODOS los `text-brand-navy` de títulos/tickers. `index.css` define las variables en
  `:root`/`.dark` + colores de gráficas (Recharts se repinta solo). Sweep `dark:` en `ui.tsx`,
  `AppShell`, `PageHeader`, `PriceStatus`, `Onboarding` y las 7 pantallas. **Decisión del dueño
  tomada: opción (a)** — la sidebar se mantiene blanca en claro (solo variantes dark), NO se
  rediseñó a navy. UI: sección "Apariencia" en Configuración + toggle 🌙/☀ en sidebar y header
  móvil. i18n en los 5 idiomas. `Settings.theme?` + seed `theme:'system'` (con `update`, no `put`).
  `print.ts` quita la clase `dark` al imprimir (F2 sigue saliendo en claro).
- ✅ **S2 — Hardening de Electron** (`electron/main.cjs`): `sandbox:true`, `webSecurity:true`
  (+ `contextIsolation:true`/`nodeIntegration:false` que ya estaban), **CSP** estricta por header
  en las respuestas `app://` (`script-src 'self'`; `style-src 'unsafe-inline'` por Recharts;
  `connect-src` solo CoinGecko/Yahoo/Frankfurter para F3), y bloqueo de `will-navigate` fuera de
  `app://`. **`vite.config.ts`: `modulePreload.polyfill:false`** para que el build NO tenga
  `<script>` inline (así `script-src 'self'` no rompe). Smoke ✅.
- ✅ **S4 — SHA256SUMS**: nuevo `scripts/checksums.cjs` (sha256 de cada `.exe` →
  `release/SHA256SUMS.txt`), encadenado al final de `app:build`.
- ✅ **S6 — Sanitización (maxLength)**: `Textarea` (ui.tsx) cota por defecto 2000 (notas);
  `maxLength` en ticker (24) / nombre (80) / plataforma (60). Lo de Excel ya cumplía.
- ✅ **S7 — Gate de auditoría**: `app:build` ahora empieza con `npm audit --audit-level=high`
  (pasa: 0 high/critical).
- ✅ **F6 — Versión 0.2.0 + instalador**: versión en `package.json`, `package-lock.json` y
  `Acerca.tsx`. `npm run app:build` reconstruido OK → `release\Tracker de Portafolio Setup
  0.2.0.exe` (~105 MB) + `release\SHA256SUMS.txt` (S4). El after-pack volvió a incrustar
  icono/versión sin problemas (§8). Se borró el `.exe` 0.1.0 viejo de `release\`.
- ✅ **S1 — Cifrado + PIN (opt-in).** **Decisión del dueño: OPCIONAL, apagado por defecto**, con
  respaldo JSON forzado al activar (red de seguridad). Nuevo `src/lib/crypto.ts` (PBKDF2-SHA256
  210k → AES-GCM-256, PURO + 5 pruebas) y `src/store/vault.ts` (lock/unlock + re-cifrado por
  cambio). El vault cifrado vive en `localStorage` (`pt-vault` + flag `pt-encryption`); las tablas
  Dexie sensibles solo tienen datos en claro mientras está DESBLOQUEADO (se vacían al bloquear y al
  arrancar bloqueado — `clearSensitive` en backup.ts + gating en `main.tsx`). Nueva
  `src/components/LockScreen.tsx`; `App.tsx` la muestra si `vaultStatus==='locked'`. Sección
  "Seguridad" en Configuración (activar / cambiar PIN / desactivar / bloquear) + botón 🔒 en la
  sidebar. i18n×5 (`lock.*`, `security.*`). **Verificado en navegador**: activar → recargar →
  bloqueado (plano borrado) → PIN malo rechazado → PIN correcto → datos intactos → desactivar.
  ⚠️ Garantía honesta: en reposo (app cerrada/bloqueada) los datos están cifrados; mientras la usas
  desbloqueada están descifrados en este equipo. PIN olvidado = irrecuperable (de ahí el respaldo).
- ✅ **S5 — Respaldo cifrado.** Reutiliza `crypto.ts`. En Configuración: "Exportar cifrado" (pide
  contraseña → descarga el blob AES-GCM) e import que detecta `isEncryptedBlob` y pide la
  contraseña. El respaldo en claro sigue existiendo (es la red de recuperación de S1). i18n×5.

**Gotchas Sesión 3 (LEER):**
1. **Tokens por variable CSS con opacidad:** `gain/loss` se definieron como
   `rgb(var(--gain) / <alpha-value>)` en `tailwind.config.js` para que `bg-loss/90` siga
   funcionando. Las variables cambian bajo `.dark` en `index.css`. El token nuevo `heading`
   evita tocar a mano cada `text-brand-navy`.
2. **CSP solo aplica en Electron (`app://`), NO en el preview de Vite** (http://localhost):
   verifícala con el smoke o la app empaquetada. `style-src` necesita `'unsafe-inline'` (estilos
   inline de Recharts); las descargas blob: de Excel/JSON funcionan; los precios en vivo necesitan
   los 3 dominios en `connect-src` (ya incluidos).
3. **`npm audit` necesita `package-lock.json`** (existe). El gate `--audit-level=high` pasa porque
   los 5 moderate son de esbuild/vite/vitest (dev-only, no van en el `.exe`).

---

## 2bis-S4. Sesión 4 — progreso (v0.3.0, 1/junio/2026)

**Cierre certificado:** `npm run typecheck` ✅ · `npm test` ✅ **103/103** · `npm run build` ✅ ·
`npm run app:build` ✅ (instalador **0.3.0** + `SHA256SUMS.txt`) · smoke Electron ✅ (exit 0).
`package.json` / `package-lock.json` / `Acerca.tsx` en **0.3.0**. Los 8 bloques (A–H) del
prompt de Sesión 4 están HECHOS y verificados en navegador (preview MCP, vía `preview_eval` +
inspección de IndexedDB; nota: `preview_screenshot` dio timeout toda la sesión — la verificación
fue por DOM/estado, igual de concluyente).

**Bloques hechos:**

- ✅ **A — Sistema de licencias (Free/Pro/Premium/Lifetime).** Nuevo `src/config/tiers.ts`
  (`TIER_CAPS`, precios USD + espejo MXN con `USD_MXN_DISPLAY=18`, `GUMROAD_URL`). Validación
  cripto **offline** RSA-2048 (RSASSA-PKCS1-v1_5/SHA-256) en `src/lib/license.ts` (PURO, clave
  pública embebida; Web Crypto). Scripts `scripts/generate-keypair.cjs` y
  `scripts/generate-license.cjs` (la privada vive en `keys/`, **gitignored**, NUNCA al repo).
  Tabla Dexie `license` (singleton id=1, **v2**). `machine_id` = UUID anónimo en localStorage
  (`pt-machine`), NO personal. Banner de anomalía amistoso (`src/lib/license-guard.ts`, no
  bloquea). Badge en sidebar, modal de activación con tabla de planes, gating `useCapability`,
  `maxAssets` en Activos, `UpgradeLock` reutilizable. i18n×5.
- ✅ **C — Renta fija mexicana.** 3 sub-tipos nuevos en `FixedIncomeType`: `promissory_note`
  (pagaré), `sofipo`, `savings` (Nu). Motor en `fixed-income-engine.ts`: `computeTermDeposit`
  (interés simple + retención ISR) y `computeSavings`. Campo `institution` (opcional). SoFIPO
  muestra aviso "sin protección IPAB". Pagaré/SoFIPO = **Pro+**, Nu = **Free**. `selectors.ts`
  extendido (detalle discriminado). i18n×5.
- ✅ **B — Importación.** `src/lib/import.ts` (PURO: `parseRows`, `parseSnapshotRows`,
  `autoSuggestMapping`, errores por CÓDIGO i18n). `src/lib/import-xlsx.ts` (plantilla + lectura
  SheetJS). Pantalla `Importar` (4 pasos: archivo → encabezados → mapeo → preview). Disponible
  en **todos los planes**. i18n×5.
- ✅ **G — UX captura.** TC histórico a demanda (`fetchHistoricalFxRate` en `price-fetcher.ts`,
  Frankfurter) en el modal de Movimientos, con checkbox "fijar TC para esta fecha" (estado React)
  y degradación elegante sin red. Aviso orientador al activar precios en vivo (Configuración) con
  enlace a Activos. i18n×5.
- ✅ **D — Features premium.** Motores PUROS `src/lib/insights.ts` (alertas D.1, comisiones D.2,
  liquidez D.3, rebalanceo D.6) y `src/lib/goals.ts` (metas D.5, tabla Dexie `goals` **v3**).
  Benchmarks D.4 = captura manual + BarChart (Recharts). Nueva pantalla **Análisis** con las 6
  secciones gateadas (Pro+ / Premium+). Panel de alertas + tarjeta fiscal en Dashboard. i18n×5.
- ✅ **E — Consultoría fiscal.** `src/lib/tax-events.ts` (PURO): detecta y **describe** eventos
  (venta/interés/dividendo/staking); NO calcula impuestos. Botones "Consultar asesor" → Odoo
  (`/appointment/3`, `/contactus`) vía `src/lib/external.ts` (allowlist). Sección en Análisis +
  tarjeta en Dashboard (Pro+; Free ve teaser bloqueado). i18n×5.
- ✅ **F — Soporte in-app.** Pantalla **Ayuda** (inicio rápido, 6 videos placeholder Loom/YouTube,
  10 FAQ, Reportar problema). Sección Privacidad en Configuración. "Reportar problema" arma texto
  local + copia al portapapeles + abre Odoo; **no envía nada por red**. i18n×5 (arrays con
  `returnObjects`). `src/config/version.ts` centraliza `APP_VERSION`.
- ✅ **H — Cierre.** `PRIVACY.md`, `TERMINOS.md`, `landing/index.html` (GitHub Pages: tabla de
  planes USD/MXN, FAQ, hueco de video/capturas, hash SHA-256 + verificación, botón Gumroad).
  Bump a 0.3.0. Instalador reconstruido. Este handoff.

**Archivos nuevos (Sesión 4):** `src/config/tiers.ts`, `src/config/version.ts`,
`src/lib/{license,license-guard,machine-id,external,import,import-xlsx,insights,goals,tax-events}.ts`
(+ sus `*.test.ts`), `src/components/{LicenseBadge,LicenseModal,LicenseNotices,UpgradeLock}.tsx`,
`src/screens/{Importar,Analisis,Ayuda}.tsx`, `scripts/generate-{keypair,license}.cjs`,
`keys/` (gitignored), `PRIVACY.md`, `TERMINOS.md`, `landing/index.html`.

**Gotchas nuevos de la Sesión 4 (LEER):**

1. **Gate de auditoría ahora con `--omit=dev`.** En esta sesión vitest publicó un advisory
   **critical** ("Vitest UI server arbitrary file read"). Es **dev-only** (no usamos `vitest --ui`,
   no va en el `.exe`). El fix limpio exigía `vite@8` (cambio mayor, riesgoso). Solución:
   `app:build` audita **solo producción** (`npm audit --audit-level=high --omit=dev` → 0 vulns).
   Preserva la intención de S7 (nada high/critical en lo que se envía). Si subes deps, revisa.
2. **TS 5.9 + Web Crypto:** `crypto.subtle` exige vistas con `ArrayBuffer` (no `ArrayBufferLike`).
   Se castea `as BufferSource` en el punto de llamada (igual que `crypto.ts` de S1). Ver `license.ts`.
3. **Dexie multi-versión:** `license` es **v2**, `goals` es **v3**. Cada `version(n).stores({...})`
   solo declara la tabla nueva; Dexie conserva las anteriores. IndexedDB interno = `n*10` (v3 → 30).
4. **`openExternal` por allowlist, NO contextBridge.** El spec E.2 pedía un canal contextBridge;
   el código real ya abre externos vía `setWindowOpenHandler` (no hay preload). Se usó
   `src/lib/external.ts` (allowlist en el renderer con `window.open`) **+** se endureció
   `electron/main.cjs` (`openExternalIfAllowed`, solo Odoo/Gumroad/Loom/YouTube). Mismo objetivo
   de seguridad, sin preload nuevo.
5. **i18n con `returnObjects`:** Ayuda lee `quickStart`/`videoTitles`/`faq` como arrays/objetos
   (`t('ayuda.faq', { returnObjects: true })`). Para insertar claves a los 5 idiomas sin depender
   de valores traducidos se usaron **anclas de apertura de bloque** (`"nav": {`, `"config": {`,
   `"acerca": {`, etc.), idénticas en los 5 JSON.
6. **Retención ISR (C.3) — fórmula del SAT (decisión del dueño TOMADA).** `computeTermDeposit`
   calcula la retención como **CAPITAL × tasa anual × (días transcurridos / 365)**: la tasa anual
   se aplica sobre el capital (no sobre el interés) y se prorratea por días naturales del ejercicio.
   `ISR_WITHHOLDING_RATE = 0.019` (1.9%) es **configurable** y hay que **revisarla cada año**
   (Anexo 8 RMF). Es estimación informativa, NO un cálculo fiscal. (La interpretación previa
   "1.9% × interés devengado" se descartó a petición del dueño.)
7. **`license`/`goals` en el respaldo JSON:** `backup.ts` los incluye. La licencia solo se
   reemplaza si el respaldo la trae (un respaldo viejo no borra tu activación); `goals` va con el
   resto. Un "reset" (Zona de peligro) **conserva** la licencia (es tu compra).

**Códigos de licencia de PRUEBA (firmados con la clave de `keys/`, para QA):**
Pro `PTRF-PRO-2026-F508FCBD`, Premium `PTRF-PREMIUM-2026-ACF0B144`, Lifetime
`PTRF-LIFE-2026-DDDBB708` (la firma completa se regenera con `node scripts/generate-license.cjs <tier>`).

**Qué queda para v0.4.0 (backlog):**
- Validación online opcional de licencias (Cloudflare Worker) además de la offline.
- Airdrops / recompensas cripto como tipo de evento.
- Multi-portafolio.
- Benchmarks D.4 con datos automáticos (Yahoo ^GSPC, CoinGecko BTC) cuando F3 esté ON.
- Rellenar enlaces reales de videos (placeholders en `Ayuda.tsx` y `landing/index.html`).
- Actualizar `ISR_WITHHOLDING_RATE` cada año según el SAT (Anexo 8 RMF).

> 🔌 **Antes de abrir la próxima sesión:** instala los plugins en tu terminal de Claude Code y
> **reinicia** para que carguen (se cargan al arrancar, no en caliente):
> `claude plugin install superpowers@claude-plugins-official`,
> `frontend-design@claude-plugins-official`, `context7@claude-plugins-official`.
> (En la Sesión 4 no se pudieron instalar: el binario `claude` no está en el PATH del shell del agente.)

---

## 2bis-S5. Sesión 5 — progreso (v0.4.0 — delta de UX / monetización, 2/junio/2026)

**Cierre certificado:** `npm run typecheck` ✅ · `npm test` ✅ **107/107** (103 previos + 4 nuevos
de `consulting.test.ts`) · verificado en navegador (preview MCP: tour paso a paso, tarjeta de
asesoría en Free y Pro, selector de idioma, 0 errores de consola). **Versión subida a 0.4.0**
(`package.json`, `package-lock.json` ×2, `src/config/version.ts` — la UI lee `APP_VERSION`; NO se
toca `Acerca.tsx`) e **instalador reconstruido**: `npm run app:build` ✅ (`npm audit --omit=dev`:
0 vulns), `release\Tracker de Portafolio Setup 0.4.0.exe` + `SHA256SUMS.txt` regenerado (solo el
0.4.0; se borraron los .exe viejos 0.2.0 y 0.3.0), smoke del empaquetado **exit 0**
(`PT_SMOKE=1`). Docs de release actualizados a 0.4.0 (landing con hash nuevo
`4d9e1533…ba7a6`, `PRIVACY.md`, `TERMINOS.md`, `GUIA-DUEÑO.md`).

> ⚠️ **CONTEXTO IMPORTANTE — el prompt externo estaba desfasado.** El doc
> `D:\Downloads\PROMPT_CLAUDE_CODE_v0.4.0_FINAL.md` (de Paco) pedía **recrear** el sistema de
> licencias (con validación de **solo formato** `ACOSTA-F-CONSULTING-…`, `plans.ts` con
> `PlanLevel` mayúsculas, `LicenseActivation.tsx`, `getCurrentPlan()` en localStorage) y la
> pantalla **Ayuda** — todo eso **ya existe y MEJOR** desde la Sesión 4: `config/tiers.ts`
> (`Tier` minúsculas), `lib/license.ts` con **firma RSA-2048 real** (`PTRF-{TIER}-{YYYY}-{hex}`),
> `LicenseModal`/`LicenseBadge`, gating con `useCapability`, y `screens/Ayuda.tsx` completa.
> El plan activo vive en **Dexie** (`db.license`, hook `useTier()`), NO en localStorage.
> **Decisión del dueño (tomada): implementar SOLO el delta nuevo**, sin tocar la licencia RSA ni
> recrear Ayuda. Si abres una sesión futura con ese prompt, ignóralo salvo el delta de abajo.

**Hecho (el delta nuevo):**

- ✅ **T1 — Idiomas en lengua nativa.** Los valores `language.*` de los **5** JSON ahora muestran
  cada idioma en su propia lengua (es: `Español`, en: `English`, fr: `Français`, zh: `中文`,
  ja: `日本語`), **idénticos en los 5 archivos**. Solo cambiaron los textos visibles; las claves
  i18n y los IDs (`'es'|'en'|'fr'|'zh'|'ja'`) quedaron intactos. La UI ya rendereaba
  `t('language.'+l)` en `Configuracion.tsx`, así que no hubo cambio de código.
- ✅ **T2 — Tarjeta de asesoría fiscal de pago (Dashboard).** Nuevo `src/lib/consulting.ts`
  (**PURO**, no importa React/Dexie): `getConsultingPrice(tier)` → `{ baseMxn, finalMxn, finalUsd,
  discountPct, hasDiscount }`. `CONSULTING_BASE_MXN = 720`; descuentos Free 0 / Pro 10% /
  Premium 15% / Lifetime 15%; el espejo USD reusa **`USD_MXN_DISPLAY` (18)** de `tiers.ts` (NO el
  20 del prompt, para no duplicar tipo de cambio). `CONSULTING_BOOKING_URL =`
  `https://franscisco-acosta.odoo.com/shop` (host ya en la allowlist). Test nuevo
  `src/lib/consulting.test.ts` (4 casos). Nuevo `src/components/ConsultingCard.tsx` (navy/gold,
  mobile-first) montado en `Dashboard.tsx` **antes de los KPIs**; lee el plan con `useTier()`.
  Verificado: Free → `MXN $720 · ≈USD $40` sin badge; Pro → ~~$720~~ **$648** `10% de descuento ·
  Pro ✓`.
- ✅ **T4 — Tour guiado ("spotlight").** Nuevo `src/components/TourOnboarding.tsx`: 4 pasos, borde
  dorado pulsante (`.tour-spotlight` + `@keyframes tour-pulse` en `index.css`, overlay
  `rgba(0,0,0,0.45)`). Flag localStorage **`tour-seen`** (distinto del `pt-onboarded` del wizard).
  Estado de apertura en `useUi` (`tourOpen`/`openTour`/`closeTour`). Navega entre pantallas:
  paso 2 resalta `[data-tour="dashboard"]` (KPIs), paso 3 va a Movimientos y resalta
  `[data-tour="add-btn"]` (botón "Nuevo movimiento"); pasos 1 y 4 sin resalte. **Encadenado
  DESPUÉS del wizard** en `App.tsx` (auto-abre a los 800 ms si `shouldShowTour()` y el wizard ya
  no está). Botón "Ver tour" en Ayuda y "Ver tour nuevamente" en Configuración (`resetTourSeen()`
  limpia el flag y reabre).
- i18n: 2 bloques nuevos **`consulting`** y **`tour`** en los 5 JSON, reutilizando `common.back/next`
  y `tier.*` (los nombres de tier no se traducen).

**Archivos nuevos (Sesión 5):** `src/lib/consulting.ts` (+ `consulting.test.ts`),
`src/components/ConsultingCard.tsx`, `src/components/TourOnboarding.tsx`.

**Archivos editados:** `src/App.tsx` (encadena/renderiza el tour), `src/store/ui.ts` (estado del
tour), `src/screens/Dashboard.tsx` (tarjeta + `data-tour="dashboard"`), `src/screens/Movimientos.tsx`
(`data-tour="add-btn"`), `src/screens/Ayuda.tsx` (sección "Recorrido guiado" + "Agendar consulta"),
`src/screens/Configuracion.tsx` (tarjeta "Ver tour nuevamente"), `src/index.css` (keyframe del
spotlight), `src/i18n/{es,en,fr,zh,ja}.json` (native names + bloques `consulting`/`tour`).

**Gotchas nuevos de la Sesión 5 (LEER):**

1. **El prompt externo v0.4.0 está desfasado** (ver recuadro ⚠️ arriba). No recrear licencias ni
   Ayuda; ya están y mejores.
2. **`lib/` puro:** `consulting.ts` recibe `Tier` por argumento; la UI inyecta `useTier()`. No metas
   Dexie/React en `lib/`.
3. **Onboarding ≠ Tour.** Son dos cosas distintas: el wizard de primera apertura (`pt-onboarded`,
   configura moneda base + metas, `Onboarding.tsx`) y el tour de resaltado (`tour-seen`,
   `TourOnboarding.tsx`). NO se fusionaron; el tour se encadena tras el wizard.
4. **Enlaces externos siguen por allowlist** (`lib/external.ts`): `/shop` funciona porque el host
   `franscisco-acosta.odoo.com` ya estaba permitido. **No se añadió `mailto:`** del prompt (lo
   bloquearía `will-navigate`/allowlist); "Reportar problema → contacto Odoo" ya cubre soporte.
5. **El tour mide el elemento tras navegar** (setScreen → timeout 160 ms → `scrollIntoView` →
   120 ms → `getBoundingClientRect`). Si un `[data-tour]` no existe, cae con elegancia a tarjeta
   centrada sin spotlight.

**Qué queda (lo hace el dueño):**
- ✅ **Bump a 0.4.0** — HECHO (`package.json`, `package-lock.json`, `src/config/version.ts`).
- ✅ **`npm run app:build`** — HECHO (instalador 0.4.0 + `SHA256SUMS.txt`, smoke exit 0).
- ⏳ Reemplazar el placeholder `https://franscisco-acosta.odoo.com/shop` por el **link de pago real**
  del producto en Odoo (constante `CONSULTING_BOOKING_URL` en `src/lib/consulting.ts`). Al cambiarlo:
  recompila y **reconstruye el instalador** (el hash cambia), y actualiza el hash en `landing/index.html`.
- ⏳ Subir a Gumroad el nuevo `Tracker de Portafolio Setup 0.4.0.exe` (ver `GUIA-DUEÑO.md`).
- Backlog de v0.4.0 vigente (Sesión 4): validación online de licencias, airdrops, multi-portafolio,
  benchmarks automáticos, enlaces reales de videos en `Ayuda.tsx`, tasa ISR anual.

---

## 2bis-S6. Sesión 6 — progreso (v0.5.0 — Excel con formato + i18n, 2/junio/2026)

**Cierre certificado:** `npm run typecheck` ✅ · `npm test` ✅ **110/110** (107 previos + 3 nuevos de
`export-xlsx.test.ts`) · `npm run build` ✅ · verificado en navegador (ExcelJS corre en el renderer:
generó un .xlsx de ~7.7 KB; al cambiar a inglés los encabezados del Excel salen en inglés; 0 errores
de consola). Versión a **0.5.0** (`package.json`, `package-lock.json` ×2, `src/config/version.ts`; la
UI lee `APP_VERSION`, NO se toca `Acerca.tsx`). **Instalador NO reconstruido** (por diseño del prompt:
lo hace el dueño con `npm run app:build`).

> ⚠️ **El prompt externo `PROMPT_CLAUDE_CODE_v0.5.0.md` traía firmas DESFASADAS** (asumía
> `exportPortfolioXlsx(data, filename)` / `exportMovimientosXlsx(rows, filename)`). Las funciones
> REALES eran `exportResumenXlsx(view, base, txns, assets)` y `exportMovimientosXlsx(txns, assets, base)`;
> se conservaron nombre y firma (solo se les agregó `t`) para no romper a los llamadores. Además, la
> hoja "Resumen" NO es una tabla por activo (como sugerían las claves i18n del prompt): es KPIs +
> Distribución vs. Objetivo + Desglose de P&L. Se respetó ese contenido y se tradujeron SUS etiquetas.
> Si el dueño quiere una tabla por posición, es una decisión aparte (no se hizo).

**Hecho:**

- ✅ **T1 — Excel con formato + i18n (ExcelJS).** Se instaló `exceljs` (^4.4.0) y se reescribió
  `src/lib/export-xlsx.ts` con ExcelJS SOLO para el export. **SheetJS (`xlsx`) sigue instalado** porque
  `import-xlsx.ts` lo usa para LEER importaciones — NO se desinstaló. Las funciones públicas conservan
  nombre/firma y reciben `t` al final: `exportResumenXlsx(view, base, txns, assets, t)` y
  `exportMovimientosXlsx(txns, assets, base, t)` (ahora `async`). Builders PUROS y testeables
  `buildResumenWorkbook(...)` / `buildMovimientosWorkbook(...)` devuelven un `ExcelJS.Workbook`; la
  descarga (`downloadWorkbook`) hace no-op si no existe `document` (node/tests). Formato: encabezados
  navy `#1F3864` + texto blanco + altura 20 + bordes; filas alternas blanco/gris `#F5F5F5`; fila de
  total en gold `#F0CDA1`; anchos automáticos (12–40); números a la derecha; hoja **Info** (app, fecha
  local, `APP_VERSION`, moneda base). Etiquetas vía nuevo bloque i18n `export` en los 5 JSON; además se
  reutilizan `allocClass.*` y `txType.*` para localizar los DATOS. `Dashboard.tsx` pasa `t`;
  `Movimientos.tsx` pasa `tr` (su alias de `useTranslation`). Test nuevo `src/lib/export-xlsx.test.ts`
  (3 casos: arma libros y `writeBuffer` no vacío; sin Dexie, con `t` mock).
- ✅ **T2 — Texto de la tarjeta de asesoría.** `consulting.subtitle` en los 5 JSON pasó de
  "…fiscalidad global" a "…cumplimiento fiscal en México" (traducciones del prompt). NO se tocó
  `consulting.ts` ni `ConsultingCard.tsx`.
- **Bundle:** ExcelJS (~938 KB) se aisló en su propio chunk (`vite.config.ts` → `manualChunks.exceljs`),
  igual que recharts/dexie. Es app local de Electron, así que el tamaño no pesa en descarga.

**Archivos nuevos:** `src/lib/export-xlsx.test.ts`. **Editados:** `src/lib/export-xlsx.ts` (reescrito a
ExcelJS), `src/screens/Dashboard.tsx` + `src/screens/Movimientos.tsx` (pasan `t`/`tr`),
`src/i18n/{es,en,fr,zh,ja}.json` (bloque `export` + `consulting.subtitle`), `vite.config.ts` (chunk
exceljs), `package.json` + `package-lock.json` + `src/config/version.ts` (0.5.0).

**Gotchas nuevos de la Sesión 6 (LEER):**

1. **No desinstales SheetJS** (`xlsx` del CDN): lo usa `import-xlsx.ts`. ExcelJS es SOLO para exportar.
2. **ExcelJS añade 2 advisories moderate (`uuid`)** en deps de PRODUCCIÓN, pero **0 high/critical**: el
   gate `npm audit --audit-level=high --omit=dev` de `app:build` sigue pasando. **NO** corras
   `npm audit fix --force` (bajaría exceljs a 3.4.0 = ruptura).
3. **`export-xlsx.ts` sigue PURO** respecto a React/Dexie; solo `downloadWorkbook` toca el DOM y se salta
   si no hay `document` (por eso los builders se testean en node).
4. **Builders sync, exports async** (ExcelJS solo es async en `writeBuffer()`). Los componentes llaman
   `void exportXxx(...)` (fire-and-forget; la descarga ocurre dentro de la función).

**Qué queda (lo hace el dueño):**
- ⏳ `npm run app:build` para reconstruir el instalador a **0.5.0** y, como en la Sesión 5, actualizar
  nombre + hash SHA-256 en `landing/index.html`, `GUIA-DUEÑO.md`, `PRIVACY.md`, `TERMINOS.md`; resubir a Gumroad.
- ⏳ Link de pago real de Odoo (`CONSULTING_BOOKING_URL` en `src/lib/consulting.ts`) — pendiente desde la Sesión 5.

---

## 2bis-S7. Sesión 7 — progreso (v0.6.0 — airdrops, filtros y vencimientos, 2/junio/2026)

**Cierre certificado:** `npm run typecheck` ✅ · `npm test` ✅ **116/116** (110 previos + 4 de airdrops
en `portfolio-engine` + 2 de `computeMaturityAlerts`) · `npm run build` ✅ · verificado en navegador
(tipos Airdrop/Recompensa con filtro a cripto + precio opcional; filtros/orden en Movimientos y
Posiciones; banner y sección de vencimientos con colores correctos; 0 errores de consola). Versión a
**0.6.0** (`package.json`, `package-lock.json` ×2, `src/config/version.ts`; NO `Acerca.tsx`).
**Instalador 0.6.0 reconstruido**: `npm run app:build` ✅ (`npm audit --omit=dev`: 0 high/critical),
`release\Tracker de Portafolio Setup 0.6.0.exe` (hash `1c1fe1a1…`) + `SHA256SUMS.txt` regenerado (solo
0.6.0; se borró el .exe 0.4.0), smoke del empaquetado **exit 0**; docs de release a 0.6.0 (landing con
hash nuevo, `GUIA-DUEÑO.md`, `PRIVACY.md`, `TERMINOS.md`).

> ⚠️ **El prompt externo `PROMPT_CLAUDE_CODE_v0.6.0.md` traía supuestos DESFASADOS** (como en sesiones
> previas). Reconciliaciones hechas:
> - **TransactionType es Capitalizado** (`'Compra'…'Staking'`), no `buy/sell`. Los nuevos tipos se
>   nombraron **`'Airdrop'`** y **`'Recompensa'`** (no minúsculas) para respetar la convención; las
>   claves i18n `txType.*` usan esos valores.
> - **El campo es `maturity_date`** (snake_case), no `maturityDate`; las posiciones no tienen nombre, así
>   que `computeMaturityAlerts(positions, assets, today)` recibe `assets` para resolver el ticker.
> - **Movimientos YA tenía filtros** (activo + tipo); se reemplazó el dropdown de activo por búsqueda
>   libre y se añadió clase + orden + colapsable (no se rehízo de cero).

**Hecho:**

- ✅ **T1 — Airdrops y recompensas cripto.** Nuevos `TransactionType` `'Airdrop'`/`'Recompensa'`
  (`types/index.ts`). Motor (`portfolio-engine.ts`): ambos en `ACQUIRE_TYPES` (suben cantidad) y en un
  nuevo `COST_TYPES` (`['Compra','Airdrop','Recompensa']`) que aporta costo SOLO si hay precio capturado
  (precio 0 → costo 0, baja el promedio); `netAmountOp` devuelve 0 (sin flujo). `labels.ts` los añade a
  `TX_TYPES`. `tax-events.ts` los detecta como eventos `airdrop`/`reward`. `Movimientos.tsx`: el form
  filtra el activo a **solo cripto** para estos tipos (limpia selección no-cripto), precio de entrada
  **opcional**, sin flujo en la lista. 4 pruebas nuevas en `portfolio-engine.test.ts`.
- ✅ **T2 — Filtros, orden y búsqueda.** `Movimientos.tsx`: barra colapsable con búsqueda libre
  (activo/ticker), filtro por tipo y por clase, orden (Fecha/Activo/Monto/Tipo, asc/desc) y conteo
  "Mostrando X de Y". `Posiciones.tsx`: búsqueda, clase y filtro ganancia/pérdida/neutral + conteo.
  **Estado local React; filtrado/orden EN MEMORIA** (no Zustand, no Dexie). Bloque i18n `filters` ×5.
- ✅ **T3 — Recordatorios de vencimiento.** Nuevo `computeMaturityAlerts(positions, assets, today)` PURO
  en `fixed-income-engine.ts` (+ `MaturityAlert`/`MaturityStatus`; umbrales overdue<0 / urgent 0–7 /
  upcoming 8–30 / ok>30; ordena ascendente; `today` inyectado). Banner en Dashboard (solo overdue/urgent;
  rojo si hay vencido, ámbar si solo urgente) tras la tarjeta de asesoría y antes de los KPIs; sección
  "Próximos vencimientos" en RentaFija (siempre visible, 🔴/🟡/🟠/🟢). Bloque i18n `maturity` ×5.
  2 pruebas nuevas en `fixed-income-engine.test.ts`.

**Editados:** `src/types/index.ts`, `src/lib/{portfolio-engine,tax-events,fixed-income-engine,labels}.ts`
(+ sus `*.test.ts`), `src/screens/{Movimientos,Posiciones,Dashboard,RentaFija}.tsx`,
`src/i18n/{es,en,fr,zh,ja}.json`, `package.json` + `package-lock.json` + `src/config/version.ts` (0.6.0).
(No se creó ningún archivo nuevo.)

**Gotchas nuevos de la Sesión 7 (LEER):**

1. **`TransactionType` es Capitalizado** (`'Airdrop'`/`'Recompensa'`). `netAmountOp` es un `switch`
   EXHAUSTIVO sin `default`: al agregar tipos, TS obliga a manejarlos (igual los `Record<TransactionType,…>`
   como `TYPE_TONE`).
2. **Costo de airdrops:** `COST_TYPES` ≠ `ACQUIRE_TYPES`. Suben cantidad siempre, aportan costo solo si
   el precio capturado > 0 (Staking/Ajuste nunca aportan costo).
3. **Vencimientos solo con `maturity_date` guardado.** CETES/pagarés con solo `term_days`+`purchase_date`
   (sin `maturity_date` explícito) **NO** aparecen en las alertas. Es lo que pidió el prompt; si se
   quisiera alertar por plazo, derivar `maturity_date = purchase_date + term_days` en
   `computeMaturityAlerts` (decisión del dueño).
4. **Filtros = estado local + memoria.** No tocan Dexie ni el motor; se resetean al navegar (intencional).
5. **Sin migración Dexie:** T1 usa el campo `type` existente; T3 usa `maturity_date` (ya existía). Dexie
   sigue en v3.

**Qué queda (lo hace el dueño):**
- ✅ **`npm run app:build`** — HECHO: instalador **0.6.0** (`release\Tracker de Portafolio Setup 0.6.0.exe`,
  hash `1c1fe1a1…`, smoke exit 0) + docs de release a 0.6.0.
- ⏳ Subir el nuevo `.exe` 0.6.0 a Gumroad (pasos en `GUIA-DUEÑO.md`).
- ⏳ Link de pago real de Odoo (`CONSULTING_BOOKING_URL`) — pendiente desde la Sesión 5.
- (Opcional) Derivar el vencimiento por plazo para CETES/pagarés sin `maturity_date` (gotcha 3).

---

## 2bis-S8. Sesión 8 — progreso (v0.7.0 — 2 bugfixes: precios Yahoo y plantilla de importación, 3/junio/2026)

**Cierre certificado:** `npm run typecheck` ✅ · `npm test` ✅ **127/127** (116 previos + 11 nuevos: 3 en
`price-fetcher`, 6 en `import`, 2 en `export-xlsx`) · `npm run build` ✅ · `npm run app:smoke` ✅ (exit 0, el
`main.cjs` nuevo arranca bien). Versión a **0.7.0** (`package.json`, `package-lock.json` ×2,
`src/config/version.ts`; NO `Acerca.tsx`). **Instalador 0.7.0 NO reconstruido** (lo hace el dueño).
Verificado en navegador (preview MCP) y, para el fix de Electron, con una prueba A/B en Electron real.

> ⚠️ **El prompt externo `PROMPT_CLAUDE_CODE_v0.7.0.md` apuntaba a causas EQUIVOCADAS en T1** (endpoint
> obsoleto / User-Agent / parseo). Se diagnosticó primero (debugging sistemático): el endpoint, el parseo y
> el campo `regularMarketPrice` estaban BIEN. La causa real era **CORS** (abajo). No se siguieron las
> hipótesis A/B/C del prompt al pie de la letra — se siguió la evidencia.

**Hecho:**

- ✅ **T1 — Precios en vivo de Yahoo (era CORS, no el endpoint).** Probado contra la API en vivo enviando
  cabecera `Origin`: `query1/query2.finance.yahoo.com/v8/finance/chart/` responde **200 con datos válidos
  pero SIN `Access-Control-Allow-Origin`**; con `webSecurity:true` el renderer bloquea la lectura (el
  `fetch` se rechaza con `TypeError: Failed to fetch`). CoinGecko sí manda `ACAO:*` (por eso la cripto sí
  actualizaba y las acciones no). **Fix:** en `electron/main.cjs`,
  `session.defaultSession.webRequest.onHeadersReceived` inyecta `Access-Control-Allow-Origin:*` SOLO para
  `PRICE_API_HOSTS` (coingecko, query1/query2 yahoo, frankfurter.dev). Mantiene `webSecurity:true`, sin
  IPC/preload. CSP `connect-src` añadió `query2.finance.yahoo.com`. **Bug extra:** Frankfurter movió de
  `api.frankfurter.app` → **`api.frankfurter.dev/v1`** (el viejo da 301); corregidas las 2 URLs en
  `price-fetcher.ts` (`fetchFxRates`, `fetchHistoricalFxRate`) + CSP. 3 pruebas nuevas en
  `price-fetcher.test.ts` (dominio frankfurter.dev + endpoint Yahoo; los fixtures Yahoo YA reflejaban la
  estructura real).
- ✅ **T2 — Plantilla de importación = columnas de entrada del export.** Nuevas
  `buildMovimientosTemplateWorkbook` + `exportMovimientosTemplateXlsx` en `export-xlsx.ts` (ExcelJS:
  encabezados navy + fila de ejemplo + hoja "Instrucciones" con comentarios por celda) que usan las MISMAS
  claves `export.col*` que el export → el mapeo automático de ida y vuelta funciona en cualquier idioma.
  `import.ts`: nuevos `ImportField` **`fx_rate`** y **`platform`** (+ patrones + uso en `parseRows`: el TC
  de la columna se respeta; vacío → 1 o tasa conocida; las columnas calculadas "…en base" se ignoran).
  **`TYPE_SYNONYMS` estaba stale** (de antes de v0.6.0): mapeaba `recompensa`→'Staking' y no conocía
  `airdrop`; corregido a `airdrop`→'Airdrop', `recompensa`/`reward`→'Recompensa' (sin esto, reimportar esos
  tipos daba `badType` y rompía la ida y vuelta). `Importar.tsx`: `fieldLabel` ahora usa `export.col*`
  (salvo `class`, que el export no trae → conserva `import.fClass`). Bloque i18n **`import.tpl*`** en los 5
  idiomas; la lista de tipos válidos se compone de `txType.*` (no se traduce a mano). 8 pruebas nuevas (6 en
  `import.test.ts`, 2 en `export-xlsx.test.ts`).

**Editados:** `electron/main.cjs`, `src/lib/price-fetcher.ts` (+ `.test.ts`), `src/lib/import.ts`
(+ `.test.ts`), `src/lib/export-xlsx.ts` (+ `.test.ts`), `src/screens/Importar.tsx`,
`src/i18n/{es,en,fr,zh,ja}.json`, `package.json` + `package-lock.json` + `src/config/version.ts` (0.7.0).
(No se creó ningún archivo nuevo de producción; **SheetJS sigue SOLO para LEER**, ExcelJS para escribir.)

**Gotchas nuevos de la Sesión 8 (LEER):**

1. **Yahoo no tiene CORS.** Su `v8/finance/chart` responde 200 sin `Access-Control-Allow-Origin`, así que el
   fix vive en el proceso main (`onHeadersReceived`), NO en `price-fetcher.ts` (que sigue PURO). Por eso
   **los precios de Yahoo solo llegan en el .exe empaquetado, NO en Vite dev** (dev no tiene proceso main).
   En dev se verifican CoinGecko (BTC) y Frankfurter (FX); Yahoo se verifica post-build. Si alguien "arregla"
   Yahoo en `price-fetcher.ts` y se confunde de por qué sigue fallando en dev, es esto.
2. **`PRICE_API_HOSTS` y `connect-src` van sincronizados.** Si agregas otra API de precios: añádela a AMBOS
   en `electron/main.cjs` (al set y a la CSP); si no manda CORS, el `onHeadersReceived` ya la cubre.
3. **Frankfurter = `api.frankfurter.dev/v1`** (el `.app` quedó obsoleto, da 301). El `.dev` sí manda `ACAO:*`.
4. **`ImportField` ahora trae `fx_rate` y `platform`.** Cualquier `Record<ImportField, …>` (p. ej. el
   `fieldLabel` de `Importar.tsx`) DEBE incluirlas o TS falla. Las columnas calculadas del export ("Importe/
   Comisión/Neto en base") NO son campos del modelo: se ignoran al importar.
5. **La plantilla usa las claves `export.col*`** (no `import.f*`), para que exportar→reimportar mapee solo.
   `class` no tiene columna en el export (queda con `import.fClass`).
6. **Sin migración Dexie:** ninguno de los 2 fixes toca el esquema (sigue v3).

**Limitaciones conocidas (fuera de alcance, ya en el Backlog real):**
- `normalizeType` solo entiende sinónimos **es/en**, así que el VALOR de la columna "Tipo" no se reimporta
  en fr/zh/ja (los ENCABEZADOS sí mapean en los 5 porque usan `export.col*`).
- El export no lleva columna **"Clase"**: un activo NUEVO reimportado cae a `Cripto` (si ya existe, referencia
  al existente y conserva su clase).

**Qué queda (lo hace el dueño):**
- ⏳ **`npm run app:build`** para reconstruir el instalador a **0.7.0** + actualizar nombre/hash SHA-256 en
  `landing/index.html`, `GUIA-DUEÑO.md`, `PRIVACY.md`, `TERMINOS.md`; resubir a Gumroad.
- ⏳ **Verificar los precios de Yahoo en el .exe empaquetado** (F3 ON, activo con ticker tipo AAPL/MSFT): en
  dev no aplica el fix de Electron, así que esta verificación es post-build.
- ⏳ Link de pago real de Odoo (`CONSULTING_BOOKING_URL`) — pendiente desde la Sesión 5.

---

## 2bis-S9. Sesión 9 — progreso (v0.8.0 — sistema de actualizaciones automáticas, 4/junio/2026)

**Cierre certificado:** `npm run typecheck` ✅ · `npm test` ✅ **138/138** (127 previos + 11 de `updater`) ·
`npm run build` ✅ · `npm run app:smoke` ✅ (exit 0) · puente preload `window.updater` verificado en Electron
real (expone `check/download/install/onEvent`). Versión a **0.8.0** (`package.json`, `package-lock.json` ×2,
`src/config/version.ts`; NO `Acerca.tsx`). **Instalador 0.8.0 NO construido** (lo hace el dueño). Verificado en
navegador (sección de Configuración con i18n real, casillas que persisten en Dexie, estado "solo en app
instalada" porque en dev no hay `window.updater`) y en Electron (preload + smoke).

> ⚠️ **Ajustes hechos al prompt externo (decisiones del dueño, aprobadas en brainstorming):**
> - i18n en `src/i18n/` (el prompt decía `src/locales/`, que no existe).
> - Versión en `src/config/version.ts`, NO en `Acerca.tsx` (lee `APP_VERSION`).
> - Preferencias = campos PLANOS snake_case en `Settings` (`auto_check_updates`, `auto_download_updates`,
>   `updates_last_checked`), NO un objeto `updatePreferences` camelCase.
> - `src/lib/updater.ts` es PURO (sin Dexie/Electron); la persistencia va en el hook (`store/update-syncer.ts`).
>   Los tests del prompt que mezclaban Dexie/red se adaptaron a las funciones puras.
> - El hook vive en `src/store/` (como `price-syncer`), no en `src/hooks/`. El badge se monta desde `App.tsx`
>   (flotante), sin editar `AppShell.tsx`.
> - **Coordenadas reales** en `electron-builder.json` (`owner: AcostaConsulting`, `repo: Portfolio-Tracker`,
>   `private: false` → repo PÚBLICO), no los `PLACEHOLDER_*` del addendum (el dueño dio la URL real).

**Hecho:**

- ✅ **Motor puro `src/lib/updater.ts`** (+ `updater.test.ts`, 11 casos): `isNewerVersion`/`compareVersions`,
  `shouldAutoCheck(prefs, lastCheckedISO, now)` (intervalo 7 días; busca si `auto_check` O `auto_download` están
  ON), `normalizeUpdatePrefs`, `parseVersionFromTag`, `DEFAULT_UPDATE_PREFS` (ambos false).
- ✅ **Renderer**: `store/updates.ts` (estado Zustand + tipo del puente `window.updater` + `getUpdaterBridge`);
  `store/update-syncer.ts` (`useUpdateSyncer` montado en `App.tsx`, espejo de `price-syncer`: suscribe eventos,
  busca al iniciar + cada 6 h respetando el gate de 7 días; `runUpdateCheck/Download/Install`). Prefs en Dexie
  (`db.settings.update`, nunca `put`).
- ✅ **UI**: sección "Actualizaciones" en `Configuracion.tsx` (`UpdatesCard`, tras idioma/apariencia, antes de
  licencia): versión actual, estado (al día / disponible / descargando % / lista / error / no soportado),
  "Verificar ahora", última verificación, 2 casillas con descripción, e historial de 3 versiones (i18n,
  `updates.changelog.items` con `returnObjects`). `components/UpdateBadge.tsx`: badge flotante (esquina
  inferior derecha) + modal con [Descargar]/[Reiniciar ahora]/[Después] según estado. i18n: bloque `updates` ×5.
- ✅ **Main (`electron/main.cjs`)**: `electron-updater` con `autoDownload=false` + `autoInstallOnAppQuit=false`
  (nunca instala solo); IPC `updater:check`/`download`/`install` guardados con `app.isPackaged`; eventos
  reenviados al renderer (`updater:event`); `requestHeaders = { Authorization: token ${GH_TOKEN} }` (guardado
  con `if (process.env.GH_TOKEN)`). **NO se tocó el `onHeadersReceived` del CORS de Yahoo.** Nuevo
  `electron/preload.cjs` (contextBridge → `window.updater`); `webPreferences.preload` añadido.
- ✅ **`electron-builder.json`**: `publish: { provider:'github', owner:'AcostaConsulting', repo:'Portfolio-Tracker',
  private:true }`. **`electron-updater` instalado** (^6.8.3, `dependencies`). El gate de auditoría de `app:build`
  (`--audit-level=high --omit=dev`) sigue pasando (solo 2 moderate de exceljs/uuid; el "critical" es dev-only).

**Archivos nuevos:** `src/lib/updater.ts` (+ `.test.ts`), `src/store/updates.ts`, `src/store/update-syncer.ts`,
`src/components/UpdateBadge.tsx`, `electron/preload.cjs`.
**Editados:** `electron/main.cjs`, `electron-builder.json`, `src/types/index.ts` (3 campos `Settings`),
`src/db/seed.ts`, `src/App.tsx`, `src/screens/Configuracion.tsx`, `src/i18n/{es,en,fr,zh,ja}.json`,
`package.json` + `package-lock.json` + `src/config/version.ts` (0.8.0).

**Gotchas nuevos de la Sesión 9 (LEER):**

1. **El auto-update SOLO funciona en el .exe empaquetado.** En Vite dev / navegador NO hay preload →
   `window.updater` es `undefined` → la UI muestra "solo en app instalada" y deshabilita "Verificar ahora". En
   main los IPC están guardados con `app.isPackaged` (en `electron .` devuelven `dev-disabled`). El flujo real
   check→download→install necesita un release publicado + .exe instalado.
2. **Repo PÚBLICO (decidido por el dueño).** Los CLIENTES reciben updates SIN token (el .exe se baja del
   release público). No hay secreto expuesto: las claves RSA viven offline en `keys/` (gitignored), así que el
   código público no filtra nada; las funciones de pago siguen tras licencia RSA. `GH_TOKEN` SOLO lo usa el
   dueño para PUBLICAR (`npm run app:publish`). El código `requestHeaders` se mantiene (guardado por
   `if (GH_TOKEN)`): es inocuo en público y permite volver a privado con solo `private:true` en `electron-builder.json`.
3. **La CSP NO cambió.** `electron-updater` corre en MAIN (Node), no en el renderer; su red a GitHub no pasa por
   `connect-src`. No agregues GitHub a la CSP.
4. **autoDownload sin autoCheck igual busca.** `shouldAutoCheck` da true si CUALQUIERA de las 2 casillas está ON
   (descargar obliga a consultar). Ambas OFF = cero red (solo botón manual). Así la tabla del prompt queda coherente.
5. **`Settings` ganó 3 campos snake_case** (opt-in, default false/undefined). Sin migración Dexie (no son índices;
   sigue v3). `seed.ts` siembra las 2 booleanas en false.
6. **Preload + IPC = superficie nueva.** Antes el proyecto NO tenía preload (S8 evitó IPC para el CORS). Ahora
   existe `electron/preload.cjs` con SOLO la API de updates. Si agregas features main↔renderer, amplía ESE
   preload con cuidado (contextBridge mínimo).

**Qué queda (lo hace el dueño):**
- ⏳ **Montar GitHub Releases**: crear el repo PÚBLICO y publicar cada versión con **`npm run app:publish`** +
  un `GH_TOKEN` (PAT scope `repo`) en el entorno (solo para publicar). Genera `latest.yml` + el `.exe`, sube el
  release (borrador) y luego se publica en GitHub. Eso es lo que la app consulta; los clientes no usan token.
- ✅ **Entrega a clientes DECIDIDA**: repo **público** (clientes sin token). Para volver a privado: `private:true` + token.
- ⏳ **Verificar el flujo real**: instalar 0.8.0, publicar un 0.8.1 de prueba y comprobar buscar→descargar→reiniciar.
- ⏳ Reconstruir el instalador 0.8.0 + actualizar hash en docs de release (0.7.0 y 0.8.0 siguen sin construir).
- ⏳ Link de pago real de Odoo (pendiente desde la Sesión 5).

---

## 2bis-S10. Sesión 10 — progreso (v0.9.0 — sectores, etiquetas y diversificación, 5/junio/2026)

**Cierre certificado:** `npm run typecheck` ✅ 0 errores · `npm test` ✅ **152/152** (138 previos + 14
nuevos: 6 de `custom-labels.test.ts` + 8 de `diversification.test.ts`) · verificado en navegador (preview
MCP, con los datos de ejemplo): Dashboard muestra "📊 Diversificación" (dona por sector + dona por etiqueta
con overlay 🔒 en Free + aviso "N activos sin sector"); Configuración → "Mis etiquetas" crea/borra
(Dexie v4) y bloquea con `UpgradeLock` al pasar de 1 en Free; Activos tiene Sector (10 cripto / 11 acción
según clase) y Etiquetas (chips), más badge "Sin sector"; Análisis renderiza las 2 secciones (dona +
barras). **0 errores de consola.** Versión a **0.9.0** (`package.json`, `package-lock.json` ×2,
`src/config/version.ts`). **Instalador 0.9.0 NO construido** (lo hace el dueño con `npm run app:build`).

**Hecho (feature de S10):**

- ✅ **Tipos** (`src/types/index.ts`): `StockSector` (11), `CryptoSector` (10), `AssetSector` (unión) e
  interface `Label` (id/name/color?/created_at). `Asset` ganó `sector?: AssetSector` y `label_ids?: string[]`
  (OPCIONALES y NO indexados → sin migración de datos).
- ✅ **Dexie v4** (`src/db/db.ts`): tabla nueva `labels: 'id, name'` (`this.version(4)`). Las anteriores se
  conservan; `labels` empieza vacía.
- ✅ **Capability** (`src/config/tiers.ts`): `canUseCustomLabels` en `TierCapabilities` y en los 4 tiers de
  `TIER_CAPS` (free/pro: false, premium/lifetime: true). `useCapability('canUseCustomLabels')` funciona.
- ✅ **Motor de gating** `src/lib/custom-labels.ts` (PURO + 6 tests): `MAX_LABELS_FREE=1`,
  `MAX_LABELS_PREMIUM=Infinity`, `canAddLabel(tier, count)`. ⚠️ Ver decisión #1 (NO se llamó `labels.ts`).
- ✅ **Motor de diversificación** `src/lib/diversification.ts` (PURO + 8 tests):
  `computeDiversificationView(assets, labels, portfolioView)` → `{ by_sector, by_label,
  unclassified_sector_count, unclassified_label_count }`. Toma la `PortfolioView` ya calculada (valores en
  base de `marketPositions`/`fixedIncome`). Reglas: RF NO entra en by_sector; sin sector → "Sin clasificar";
  un activo con N etiquetas suma su valor en las N slices; solo valor > 0; orden desc por %. Exporta
  `UNCLASSIFIED_SECTOR`/`UNLABELED`.
- ✅ **Hook** `useLabels()` en `src/store/data.ts`.
- ✅ **UI etiquetas** `src/components/LabelManager.tsx`: sección "Mis etiquetas" en Configuración (entre
  Actualizaciones y Licencia). Crear/editar/borrar (modal + picker de 8 colores). No borra una etiqueta con
  activos (🗑️ deshabilitado + aviso). Free/Pro: 1 gratis → luego `UpgradeLock` a Premium.
- ✅ **UI gráficas** `src/components/DiversificationChart.tsx`: `DiversificationDonut` (dona + leyenda +
  overlay 🔒 opcional) y `DiversificationBars` (barras horizontales Recharts). Helpers `toSectorSlices` /
  `toLabelSlices` (DRY entre Dashboard/Análisis; localizan los nombres con `t`).
- ✅ **Activos** (`src/screens/Activos.tsx`): `NewAssetModal` → `AssetModal` (alta + EDICIÓN; antes NO había
  edición). Campos Sector (oculto en RF; lista según clase) y Etiquetas (chips multiselección). Botón
  "Editar" por fila + badge "Sin sector" que abre la edición enfocando el sector. ⚠️ En edición `class`/
  `fiType` van deshabilitados (proteger cálculos). `STOCK_SECTORS`/`CRYPTO_SECTORS` se añadieron a
  `src/lib/labels.ts` (su rol natural: arreglos de `<select>`).
- ✅ **Dashboard**: "📊 Diversificación" (2 donas) si hay ≥2 activos con valor; dona de etiqueta con overlay
  🔒 para Free/Pro sin etiquetas; aviso "N activos sin sector → Clasificar ahora" (a Activos). Ver decisión #5.
- ✅ **Análisis**: 2 Cards al inicio ("Diversificación por sector" y "…por etiqueta"), cada una dona +
  barras + leyenda.
- ✅ **i18n ×5**: bloques `sectors` (4 meta + 21 sectores), `labels` (13), `diversification` (10) +
  `capability.canUseCustomLabels` + 4 claves en `activos`. Traducciones reales es/en/fr/zh/ja, validadas
  (mismos juegos de claves en los 5).

**Decisiones técnicas (LEER — varias divergen del prompt por choque con el código real):**

1. **`custom-labels.ts`, NO `labels.ts`.** El prompt pedía CREAR `src/lib/labels.ts`, pero ese archivo YA
   EXISTE con otro fin (arreglos de valores de enums: `ASSET_CLASSES`, `TX_TYPES`, `FI_TYPES`…).
   Sobrescribirlo habría roto los formularios. El motor de gating vive en `src/lib/custom-labels.ts`
   (+`custom-labels.test.ts`); a `labels.ts` solo se le AÑADIERON `STOCK_SECTORS`/`CRYPTO_SECTORS`.
2. **`canUseCustomLabels` es booleano estático** en cada tier de `TIER_CAPS` (no la función
   `tier === 'premium' || …` del pseudocódigo: `TIER_CAPS` es un `Record<Tier, …>` plano).
3. **No existe la clase 'ETF'.** `AssetClass` = `'Cripto' | 'Acción' | 'Renta Fija'` (¡ESPACIO en 'Renta
   Fija'!). Sector se muestra en Cripto/Acción, se oculta en RF.
4. **Se creó el flujo de EDICIÓN de activos.** Antes solo había alta. `AssetModal` hace alta o
   `db.assets.update`; en edición `class`/`fiType` van deshabilitados (no orfanar posiciones de RF ni romper
   cálculos). La badge "Sin sector" abre esta edición enfocando el sector.
5. **Ubicación de la dona en Dashboard.** El prompt decía "debajo de KPIs y encima de la tarjeta de
   asesoría", pero `ConsultingCard` se renderiza ARRIBA de los KPIs (layout de S5). Se puso Diversificación
   JUSTO debajo de los KPIs (encima de la dona de Asignación).
6. **Porcentajes de by_label con doble conteo:** un activo con 2 etiquetas suma su valor en ambas slices; el
   denominador es la suma de slices (no el total), así los % suman 100 con solapamiento. by_sector no
   solapa (un sector por activo).
7. **El "tooltip post-guardado" del prompt se sustituyó por la badge persistente "Sin sector"** + el aviso
   del Dashboard. Un tooltip efímero se pierde; la badge/aviso nudgean de forma persistente (mismo objetivo).
8. **i18n en/fr/zh/ja** se insertó con un script Node temporal (inserción por anclas que preserva formato +
   `JSON.parse` de validación); `es.json` a mano. El script se borró al terminar.

**Archivos nuevos (S10):** `src/lib/custom-labels.ts` (+`.test.ts`), `src/lib/diversification.ts`
(+`.test.ts`), `src/components/LabelManager.tsx`, `src/components/DiversificationChart.tsx`.

**Archivos editados (S10):** `src/types/index.ts`, `src/db/db.ts`, `src/config/tiers.ts`, `src/lib/labels.ts`
(solo +sectores), `src/store/data.ts`, `src/screens/{Activos,Configuracion,Dashboard,Analisis}.tsx`,
`src/i18n/{es,en,fr,zh,ja}.json`, `package.json`, `package-lock.json`, `src/config/version.ts`.

**Firmas EXACTAS nuevas (S10):**
- `canAddLabel(tier, currentCount): boolean` · `MAX_LABELS_FREE` · `MAX_LABELS_PREMIUM` (lib/custom-labels)
- `computeDiversificationView(assets, labels, portfolioView): DiversificationView` (lib/diversification)
- `useLabels(): Label[] | undefined` (store/data) · `<LabelManager />` · `<DiversificationDonut/Bars />`
- `toSectorSlices(div, t)` · `toLabelSlices(div, labels, t)` (components/DiversificationChart)

**Qué queda (lo hace el dueño / S11):**
- ⏳ `npm run app:build` → instalador **0.9.0** (+ actualizar nombre/hash en docs; resubir a Gumroad). Los
  .exe 0.7.0/0.8.0/0.9.0 siguen sin construir.
- ⏳ Infra de auto-update (S9) + link de pago real de Odoo (arrastrados).
- **S11 (explícito del prompt):** geografía como tercera capa de clasificación. (Sectores y etiquetas ya en S10.)
- (Opcional) Sugerir sector por ticker; reconocer sector/etiquetas en el ida y vuelta de import.

---

## 2bis. F5 — Tema claro / oscuro ✅ HECHA (plan que se siguió, para referencia)

Lee el spec completo de F5 en `D:\Downloads\Prompt_ClaudeCode_Sesion2.md` (sección F5),
pero aquí tienes el plan concreto adaptado al código real:

### ⚠️ Hallazgo importante (decisión para el dueño antes de pintar)
El spec de F5 asume que **la barra lateral es `brand.navy`** en ambos temas. En el código
real **la sidebar es BLANCA** (`AppShell` usa `aside ... bg-white border-slate-200`; el
item activo es `bg-brand-navy text-white`). Es decir, el diseño actual NO coincide con la
tabla del prompt. **Opciones:** (a) mantener el diseño actual y solo añadir variantes
`dark:` (recomendado: menos disruptivo, respeta lo ya verificado), o (b) rediseñar la
sidebar a navy como pide la tabla. **Preguntar al dueño** salvo que prefieras (a) por
defecto. El resto de la paleta del prompt (fondos gray-900/800, bordes gray-700, textos
gray-100/400, gain `#4ade80`, loss `#f87171`) sí aplica tal cual.

### Orden sugerido (mismo patrón que F3/F4)
1. **`tailwind.config.js`**: añadir `darkMode: 'class'`. Si quieres `bg-gray-750`
   personalizado y los gain/loss oscuros, defínelos aquí (ver nota de tokens abajo).
2. **Tipos + seed**: `src/types/index.ts` → `Settings.theme?: 'light' | 'dark' | 'system'`.
   `src/db/seed.ts` → añadir `theme: 'system'` a `DEFAULT_SETTINGS`.
3. **Infra de tema (nuevo `src/lib/theme.ts`)**, espejo de cómo funciona i18n:
   - `applyTheme(theme)`: resuelve 'system' con
     `window.matchMedia('(prefers-color-scheme: dark)')`, añade/quita la clase `dark`
     en `document.documentElement`, y cachea en `localStorage` (`pt-theme`).
     Ajusta también `document.documentElement.style.colorScheme` ('dark'/'light').
   - Aplica el tema cacheado **al cargar el módulo** (como `i18n/index.ts`), e
     **impórtalo en `main.tsx` antes de montar React** para evitar el flash.
   - `useTheme()` hook (en `App.tsx`): lee `settings.theme`, llama `applyTheme`, y si es
     'system' se suscribe a los cambios de `matchMedia` y limpia el listener al desmontar.
   - El `:root { color-scheme: light }` de `index.css` debe volverse dinámico o añadir
     `.dark { color-scheme: dark }`.
4. **Sweep de componentes con variantes `dark:`** — aquí está el grueso. La mayoría del
   color vive en primitivas compartidas, así que **empieza por ellas** (cubren casi todo):
   - `src/components/ui.tsx`: `Card` (`bg-white`→`dark:bg-gray-800`, `border-slate-200`→
     `dark:border-gray-700`), `Button` (secondary/ghost), inputs (`controlBase`:
     `bg-white text-slate-900 border-slate-300` → variantes dark), `Modal` (overlay y
     panel `bg-white`), `Badge` (tonos), `SectionTitle`/`EmptyState`, `SignedValue`
     (gain/loss → ver tokens), `InlineNumberInput`.
   - `src/components/AppShell.tsx`: outer `bg-slate-50`→`dark:bg-gray-900`, sidebar,
     header móvil, encabezado de impresión.
   - `src/components/PageHeader.tsx`, `src/components/PriceStatus.tsx`,
     `src/components/Onboarding.tsx` (modal grande, fondos).
   - Pantallas (`screens/*`): tienen tablas y textos inline con `text-slate-*`,
     `border-slate-*`, `bg-slate-50` (filas alternas/hover). Sweep pantalla por pantalla:
     Dashboard, Posiciones, Movimientos, Activos, RentaFija, Configuracion, Acerca.
   - **Tip:** `Grep` por `bg-white`, `bg-slate-50`, `text-slate-9`, `text-slate-6`,
     `text-slate-5`, `border-slate-2` para encontrar los focos.
5. **Tokens gain/loss en oscuro**: los componentes usan `text-gain`/`text-loss` (tokens
   Tailwind). Para cambiarlos en oscuro hay dos caminos: (a) **CSS variables** que cambian
   bajo `.dark` (define `--gain`/`--loss` y mapéalos en `tailwind.config.js`
   `colors: { gain: 'var(--gain)' }`), o (b) añadir `dark:text-green-400 / dark:text-red-400`
   en los pocos sitios que los usan (sobre todo `SignedValue` en ui.tsx, y algún Badge).
   La opción (a) es más limpia y central — recomendada.
6. **Selector + toggle (UI)**:
   - Configuración → nueva sección **"Apariencia"** con selector Claro / Oscuro / Sistema
     (persiste con `db.settings.update(SETTINGS_ID, { theme })` y llama `applyTheme`).
     Mismo patrón que el selector de idioma que ya está en `Configuracion.tsx`.
   - Sidebar (esquina inferior): icono toggle 🌙/☀ para alternar claro/oscuro con 1 clic.
7. **i18n de F5**: añade claves a los **5** JSON (`config.appearanceTitle`,
   `config.themeLight`, `config.themeDark`, `config.themeSystem`, y tooltip del toggle).
   **Guardrail F4:** ningún string nuevo hardcodeado — todo por i18n.
8. **F2 + tema (no romper):** el bloque `@media print` ya fuerza `body` claro, pero las
   utilidades `dark:` en elementos internos seguirían activas si `<html>` tiene `.dark`.
   Verifica una impresión en modo oscuro; si se cuela, añade en `@media print` un reset
   o quita la clase `dark` mientras imprime en `printToPdf()` y restáurala en el
   `afterprint`/timeout (ya hay ese punto de gancho en `print.ts`).
9. **Cierre**: `npm run typecheck && npm test` (deben seguir 51 verdes — F5 es CSS/estado,
   no toca el motor) y **verifica en navegador** (ver §2ter): togglear tema, screenshot en
   claro y oscuro, revisar modales/tablas/formularios (donde más se olvida el `dark:`).

### Estado de las tareas restantes
**Todas hechas.** F1–F6 y S1–S7 están completas y verificadas (ver "Sesión 3 — progreso" arriba
y la Sesión 2). El instalador 0.2.0 está en `release\` con `SHA256SUMS.txt`. De aquí en adelante:
mantenimiento o nuevas funciones del backlog (§9), respetando local-only y la UI por i18n.

> 📌 `COMO-EMPAQUETAR-Y-DISTRIBUIR.txt` ya está actualizado a 0.2.0 (nombre del `.exe`, ~105 MB,
> fecha). El smoke del `.exe` empaquetado (`release\win-unpacked`, con `PT_SMOKE=1`) salió **exit 0**.

---

## 2ter. Cómo verifico en navegador (preview MCP)

- Hay un `launch.json` con una config llamada **`portfolio`** que corre Vite contra el
  proyecto en `:5173`. Arranca con el preview MCP (`preview_start` name `portfolio`).
  (El `.claude/launch.json` vive en el directorio del workspace de Claude, no en el repo.)
- Para inspeccionar/interactuar sin selectors estables, se usó `preview_eval` (clic por
  texto, espiar `fetch`, leer estado), `preview_snapshot` (árbol de accesibilidad) y
  `preview_screenshot`. La app abre con onboarding: clic "Saltar guía" / "Skip guide".
- En F4 se verificó cambiando el idioma desde el selector y comprobando nav + `<html lang>`
  + fechas/montos con locale. Para F5: togglear tema y comprobar
  `document.documentElement.classList.contains('dark')` + screenshots claro/oscuro.

> El trabajo de empaquetado **ya está cerrado**. Lo normal de aquí en adelante es
> **agregar funciones a la app** (capa React/Dexie) y, al final, reconstruir el
> instalador con `npm run app:build`.

---

## 3. Comandos y entorno

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias (primera vez). |
| `npm run dev` | Servidor de desarrollo (Vite) en :5173. |
| `npm run build` | `tsc --noEmit` + `vite build` → genera `dist/`. |
| `npm run preview` | Sirve el `dist/` para probarlo. |
| `npm test` | Pruebas del motor (Vitest, una pasada). |
| `npm run test:watch` | Pruebas en modo interactivo. |
| `npm run typecheck` | Solo verificación de tipos. |
| `npm run icon` | Genera `build/icon.ico` desde `public/favicon.svg`. |
| `npm run app:smoke` | Abre la app empaquetada en Electron (dev). |
| `npm run app:build` | **build + icon + instalador** (electron-builder --win). |

**Entorno (Windows, sin admin):** Node v24 en `C:\Program Files\nodejs`. En
PowerShell, antepón al PATH si hace falta:
`$env:Path = "C:\Program Files\nodejs;" + $env:Path`.

---

## 4. Mapa del código

```
portfolio-tracker/
├─ index.html                 # punto de entrada Vite; base relativa './'
├─ vite.config.ts             # config Vite (base relativa para Electron)
├─ tailwind.config.js         # tokens de marca (ver §5)
├─ tsconfig.json / postcss.config.js
├─ public/favicon.svg         # logo de marca (fuente del icono .ico)
│
├─ src/
│  ├─ main.tsx                # monta React
│  ├─ App.tsx                 # SWITCH de pantallas (lee useUi.screen)
│  ├─ index.css               # entrada Tailwind
│  ├─ types/index.ts          # ⭐ modelo de dominio (todas las entidades)
│  │
│  ├─ db/
│  │  ├─ db.ts                # ⭐ esquema Dexie/IndexedDB (v1, 6 tablas)
│  │  ├─ seed.ts              # datos de ejemplo + sembrado inicial
│  │  └─ backup.ts            # exportar/importar JSON
│  │
│  ├─ i18n/                   # 🆕 F4 — i18n (react-i18next)
│  │  ├─ index.ts             #   config i18next + applyLanguage() + LANGUAGES
│  │  └─ es|en|fr|zh|ja.json  #   traducciones (es = fuente de verdad)
│  │
│  ├─ store/
│  │  ├─ ui.ts                # ⭐ navegación (Zustand): tipo Screen + useUi
│  │  ├─ data.ts              # ⭐ hooks de LECTURA (useLiveQuery sobre Dexie)
│  │  ├─ prices.ts            # 🆕 F3 — estado del indicador de precios (Zustand)
│  │  └─ price-syncer.ts      # 🆕 F3 — usePriceSyncer() + runPriceSync() (toca Dexie)
│  │
│  ├─ lib/                    # ⭐ MOTOR DE CÁLCULO (puro, sin React ni DB)
│  │  ├─ portfolio-engine.ts  #   conversión, costo prom., P&L, asignación
│  │  ├─ fixed-income-engine.ts # 4 tipos de renta fija
│  │  ├─ selectors.ts         #   derivados (p.ej. buildRatesToBase)
│  │  ├─ dates.ts             #   helpers de fecha (todayISO, etc.)
│  │  ├─ format.ts            #   formato moneda/número + setFormatLocale() (F4)
│  │  ├─ labels.ts            #   arreglos de valores de enums (etiquetas → i18n)
│  │  ├─ export-xlsx.ts       # 🆕 F1 — serialización a .xlsx (SheetJS)
│  │  ├─ print.ts             # 🆕 F2 — printToPdf() (window.print nativo)
│  │  ├─ price-fetcher.ts     # 🆕 F3/S3 — fetch de precios PURO + validación
│  │  └─ *.test.ts            #   pruebas Vitest (incluye price-fetcher.test.ts)
│  │
│  ├─ components/
│  │  ├─ AppShell.tsx         # ⭐ layout + barra lateral (NAV_GROUPS) + hdr impresión
│  │  ├─ ui.tsx               # primitivas UI compartidas + helper cn()
│  │  ├─ PageHeader.tsx       # encabezado de página (acciones = app-no-print)
│  │  ├─ PriceStatus.tsx      # 🆕 F3 — indicador 🟢🟡🔴
│  │  └─ Onboarding.tsx       # guía de primera apertura (shouldShowOnboarding)
│  │
│  └─ screens/                # una pantalla por archivo
│     ├─ Dashboard.tsx        # Resumen (KPIs, gráficas, snapshot)
│     ├─ Posiciones.tsx       # solo lectura (calculado)
│     ├─ Movimientos.tsx      # CAPTURA de transacciones
│     ├─ Activos.tsx          # CAPTURA de activos, precios y FX
│     ├─ RentaFija.tsx        # CAPTURA de instrumentos de renta fija
│     ├─ Configuracion.tsx    # CAPTURA: moneda base, objetivos, export/import
│     └─ Acerca.tsx           # versión, privacidad, créditos
│
├─ electron/main.cjs          # proceso principal Electron (protocolo app://)
├─ electron-builder.json      # config del instalador (NSIS)
├─ scripts/
│  ├─ make-icon.cjs           # genera el icono
│  └─ after-pack.cjs          # re-incrusta icono/versión con rcedit (ver §8)
└─ build/                     # icon.ico + rcedit-x64.exe (no se versiona)
```

⭐ = archivos que casi siempre tocarás al agregar funciones.

---

## 5. Arquitectura clave (el modelo mental)

**Flujo de datos (unidireccional):**

```
Pantallas de CAPTURA  ──escriben──▶  Dexie/IndexedDB (db/db.ts)
                                          │
                       hooks useLiveQuery │ (store/data.ts) — reactivos
                                          ▼
            Motor puro (src/lib/)  ──calcula──▶  Pantallas de LECTURA
```

- **Escrituras:** las pantallas de captura llaman directo a Dexie
  (`db.assets.add(...)`, `db.transactions.put(...)`, `db.fx_rates.update(...)`,
  etc.). No hay capa de servicios intermedia.
- **Lecturas reactivas:** `store/data.ts` expone hooks (`useAssets`,
  `useTransactions`, `useFixedIncomePositions`, `useSnapshots`, `useSettings`,
  `useFxRates`, `useRatesToBase`) basados en `useLiveQuery`. La UI se actualiza
  sola cuando cambian los datos.
- **Cálculo:** `src/lib/` recibe esos datos y devuelve KPIs/posiciones. **Es puro**
  (no importa React ni Dexie) y está **cubierto por pruebas**.

**Navegación (sin librería de routing):** hay un store Zustand `useUi` con un
campo `screen` (unión de strings). `App.tsx` renderiza la pantalla según ese
valor; `AppShell.tsx` pinta la barra lateral desde `NAV_GROUPS`.

**Modelo de datos (`src/types/index.ts` + `db/db.ts`)** — 6 tablas Dexie:
`settings` (singleton, `id=1`), `assets`, `transactions`, `fx_rates`,
`fixed_income_positions`, `historical_snapshots`. Entidades principales: `Asset`,
`Transaction`, `FxRate`, `FixedIncomePosition`, `HistoricalSnapshot`, `Settings`.
IDs = UUID string (salvo `settings.id`=número y `fx_rates.currency`=PK string).

**Marca / estilos (`tailwind.config.js`):** usa los tokens, no colores sueltos:
`brand.navy` `#1F3864`, `brand.gold` `#F0CDA1`, `gain` `#15803d`, `loss`
`#b91c1c`. Helper `cn()` en `components/ui.tsx` para componer clases.

---

## 6. Recetas (cómo agregar lo más común)

### A) Agregar una pantalla nueva
1. `src/store/ui.ts`: añade el id a la unión `Screen` (p.ej. `'reportes'`).
2. `src/components/AppShell.tsx`: agrega un `NavItem` en el grupo adecuado de
   `NAV_GROUPS` (marca `capture: true` si es de captura).
3. `src/screens/Reportes.tsx`: crea el componente (usa `PageHeader` y primitivas
   de `components/ui.tsx`).
4. `src/App.tsx`: importa y añade `{screen === 'reportes' && <Reportes />}`.

### B) Agregar un campo a una entidad
1. `src/types/index.ts`: añade el campo a la interface.
2. `src/db/db.ts`: **solo** hay que tocar el esquema si el campo debe estar
   **indexado** (Dexie solo declara columnas indexadas; los campos no indexados se
   guardan solos **sin migración**). Si necesitas índice nuevo → sube versión:
   `this.version(2).stores({ ...nuevoIndice }).upgrade(tx => { /* opcional */ });`
3. Actualiza la pantalla de captura (formulario + escritura).
4. Si afecta cálculos: ajusta `src/lib/` y **añade/actualiza pruebas**.

### C) Agregar un tipo de movimiento
1. `src/types/index.ts`: amplía la unión `TransactionType`.
2. `src/lib/labels.ts` y los `<select>` de `Movimientos.tsx`: muéstralo.
3. `src/lib/portfolio-engine.ts`: maneja su efecto en P&L/flujos + **prueba**.

### D) Agregar/ajustar una regla de cálculo
- Hazlo en `src/lib/` (función pura). Añade casos en el `*.test.ts` vecino.
  Corre `npm test`. No metas lógica de cálculo dentro de componentes.

### E) Cambiar datos de ejemplo
- `src/db/seed.ts` (arreglos `SEED_*` + `DEFAULT_SETTINGS`). El respaldo
  export/import está en `src/db/backup.ts` (mantén ambos en sync con el esquema).

---

## 7. Convenciones y guardrails (no romper)

- **100 % local, sin red.** Nada de `fetch`/APIs/telemetría/login/nube. Precios y
  tipos de cambio son **captura manual**. Es parte del producto y de la privacidad.
- **Texto de UI en español.** (El código/identificadores en inglés está bien.)
- **Motor puro + pruebas verdes.** `src/lib/` no importa React ni Dexie. Antes de
  dar algo por terminado: `npm run typecheck` y `npm test`; idealmente
  `npm run build`.
- **"Captura vs. lectura".** Solo las pantallas de captura escriben; las de
  lectura derivan del motor. No dupliques cálculos en la UI.
- **Formato de dinero/números:** usa `src/lib/format.ts` (respeta la moneda base).
- **Tokens de marca** de Tailwind (no hardcodees hex en componentes).
- **IDs:** UUID string para entidades nuevas; `settings` es singleton `id=1`.
- **Compatibilidad con datos existentes:** los usuarios ya tienen datos en
  IndexedDB y respaldos JSON. Cambios de esquema deben ser retro-compatibles
  (campos opcionales; migraciones Dexie con `upgrade` si hace falta).

---

## 8. Capa de escritorio (Electron + instalador)

Solo relevante cuando toque **reconstruir el instalador** o tocar el arranque.

- **`electron/main.cjs`**: registra un protocolo **`app://`** (origen estable para
  que IndexedDB persista) y sirve `dist/` con `fs.readFile` (compatible con
  `asar`). Tiene modo `PT_SMOKE=1` que carga y se cierra solo (autoprueba).
- **Reconstruir el instalador:** `npm run app:build` → deja el `.exe` en
  `release/`.
- **⚠️ Gotcha ya resuelto (no re-descubrir):** en este equipo (sin admin, sin
  Modo desarrollador) electron-builder NO puede usar su `rcedit` interno, porque
  para obtenerlo descarga `winCodeSign-2.6.0.7z`, que contiene **enlaces
  simbólicos de macOS** que Windows rechaza sin privilegios. **Solución vigente:**
  `electron-builder.json` tiene `"signAndEditExecutable": false` (desactiva ese
  paso) y el hook **`scripts/after-pack.cjs`** vuelve a incrustar icono + versión
  con un `rcedit-x64.exe` independiente (en `build/`, con respaldo desde la caché
  de electron-builder). Si cambias esto, validas con `npm run app:build`.
- **App sin firma:** Windows muestra SmartScreen ("editor desconocido"). Es
  esperado; los usuarios hacen "Más información → Ejecutar de todas formas".

---

## 9. Ideas de próximas funciones (backlog, el dueño decide)

Del propio `README` (cosas que el MVP **no** hace) y mejoras razonables, **sin
romper la regla local-only**:

- PEPS lote por lote (hoy es costo promedio ponderado).
- Multi-portafolio (hoy es uno solo).
- Reportes/impresión (resumen exportable a PDF o vista de impresión).
- Más gráficas (evolución por clase, aportaciones vs. rendimiento).
- Filtros/orden/búsqueda en Movimientos y Posiciones.
- Recordatorios locales de vencimientos de renta fija (CETES/UDIBONOS).
- Mejoras de import/export (validación, merge, respaldo automático local).
- Módulo fiscal (queda explícitamente fuera del MVP; valorar con cuidado).

> Integraciones con brokers/exchanges o **APIs de precios automáticas** chocan con
> la filosofía local-only: si se plantean, discutir el trade-off de privacidad
> con el dueño antes de implementar.

---

## 10. Gotchas de entorno

- **Windows sin admin / equipo escolar:** sin symlinks, sin Developer Mode; el
  **antivirus** a veces rompe descargas/extracciones (a Electron le falló el
  postinstall una vez; se arregló extrayendo el zip cacheado con `Expand-Archive`
  y escribiendo `node_modules\electron\path.txt`).
- **PowerShell 5.1:** sin `&&`/`||`; usa `;` o `if ($?)`. Antepón el PATH de Node.
- **Directorio de trabajo:** la raíz del proyecto es
  `C:\Users\csp\Proyectos\portfolio-tracker`. Algunas herramientas resuelven rutas
  desde un directorio padre; usa rutas absolutas si hay duda.
- **Caché de electron-builder:** `%LOCALAPPDATA%\electron-builder\Cache`.

---

## 11. Resumen en una línea

App de portafolio **local** (React+Vite+TS+Tailwind+Dexie+Zustand), **completa** y
ya empaquetada como instalador Windows. Para agregar funciones: trabaja en
`src/` (tipos → Dexie → hooks de lectura → motor puro con pruebas → pantallas),
respeta *local-only* y UI en español, y al final reconstruye con
`npm run app:build`.
