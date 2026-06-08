# Aviso de Privacidad — Tracker de Portafolio

**Última actualización:** 2 / junio / 2026 · Versión de la app: **0.9.0**

## En una frase

Tus datos viven **solo en tu equipo**. No hay cuenta, no hay nube, no hay servidores
nuestros. No recopilamos **ningún** dato personal.

## Qué se guarda y dónde

- Todo lo que capturas (activos, movimientos, renta fija, snapshots, metas y licencia)
  se guarda en **IndexedDB**, dentro de tu navegador / la app de escritorio, en **tu**
  equipo.
- El respaldo es un archivo **JSON** que tú exportas y guardas donde quieras
  (opcionalmente **cifrado** con tu contraseña). Nunca se sube a ningún lado.
- La preferencia de idioma, tema y un identificador **anónimo** de equipo
  (`pt-machine`, un UUID aleatorio que **no** deriva de datos personales) se guardan en
  `localStorage`.

## Qué NUNCA se envía ni se recopila

- Nunca: nombre, correo, teléfono, IP, ubicación, ni cualquier dato personal.
- Nunca: cantidades, costos, valores o el contenido de tu portafolio.
- Sin telemetría, sin analytics, sin Sentry/Mixpanel/Google Analytics, sin anuncios,
  sin rastreadores, sin cookies de terceros.

## Excepciones de red (opt-in, tú decides)

La app es local por diseño. Las **únicas** salidas a internet son funciones que tú
activas explícitamente, y solo envían identificadores públicos:

1. **Precios en tiempo real (F3)** — *apagado por defecto*. Si lo activas en
   Configuración y eliges una fuente por activo, la app consulta:
   - **CoinGecko** (cripto), **Yahoo Finance** (acciones) para precios.
   - **Frankfurter** para tipos de cambio.
   - Solo se envían **tickers** (p. ej. `BTC`, `MSFT`) y **códigos de moneda** (p. ej.
     `USD`, `MXN`). Nada de tu portafolio.
2. **Tipo de cambio histórico a demanda (captura de movimientos)** — la app puede
   sugerir el tipo de cambio de una fecha pasada consultando **Frankfurter** **solo
   cuando tú pulsas el botón** "Sugerir TC". Se envían **únicamente la fecha y el par de
   monedas** (p. ej. `2026-01-15`, `USD→MXN`). Funciona aunque los precios en vivo estén
   apagados, y nunca es automático.

Con estas funciones **apagadas**, la app **no hace ninguna conexión a internet**.

## Validación de licencia

La verificación de tu código de licencia es **100 % local** (criptografía offline con
una clave pública embebida). No se contacta ningún servidor para validar ni activar.

## Reportar un problema

El formulario "Reportar problema" arma un texto **en tu equipo** y lo copia a tu
portapapeles. **No envía nada por red**: tú decides si lo pegas en el contacto o en tu
correo.

## Borrado de datos

Tú tienes el control total: "Configuración → Zona de peligro → Borrar todo" elimina
todos los datos de este equipo. Como nada sale de tu equipo, no hay nada que borrar en
otro lado.

## Contacto

Dudas de privacidad: <https://franscisco-acosta.odoo.com/contactus>
