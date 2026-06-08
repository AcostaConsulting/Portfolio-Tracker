# Guía del dueño — vender y generar licencias (sin tecnicismos)

> Esta guía es para ti, que **no eres programador**. Te dice exactamente qué hacer
> para vender el Tracker de Portafolio y darle a cada cliente su código.
> Léela una vez con calma; luego solo vuelves al **Paso 4** en cada venta.

---

## 🟢 El resumen en 30 segundos

1. **Una sola vez:** respalda tu llave secreta (ya está creada) y sube el instalador a Gumroad.
2. **En cada venta:** corres un comando que te da un **código**, y se lo mandas al cliente por correo.
3. El cliente pega ese código en la app (**Configuración → Licencia → Activar**) y listo.

No hay servidores, ni nube, ni nada que mantener. Todo es manual y bajo tu control.

---

## 📁 Los 3 archivos/carpetas que importan

| Archivo | Qué es | ¿Se comparte? |
|---|---|---|
| `release\Tracker de Portafolio Setup 0.9.0.exe` | **El instalador.** Esto es lo que vende y descarga el cliente. | ✅ Sí, súbelo a Gumroad |
| `keys\private.pem` | **Tu llave SECRETA.** Con ella generas los códigos. | ❌ **NUNCA** la compartas |
| `keys\public.pem` | La llave pública. Ya está metida dentro de la app. | No tienes que hacer nada con ella |

> 💡 **Piénsalo así:** `private.pem` es tu **máquina de imprimir billetes válidos**.
> Si la pierdes, no puedes hacer códigos nuevos. Si alguien la copia, puede hacer
> códigos gratis. Por eso la cuidas como tu contraseña más importante.

---

## 🔑 Paso 1 — Tus llaves (esto YA está hecho)

Las llaves ya se crearon en `keys\`. **NO las vuelvas a generar**: si lo haces, todos
los códigos que emitas dejarán de funcionar con la versión actual de la app.

Lo único que tienes que hacer **ahora mismo**:

1. Abre la carpeta `keys\` del proyecto.
2. Copia el archivo **`private.pem`** a **dos lugares seguros**, por ejemplo:
   - Una memoria USB que guardes en un cajón.
   - Tu gestor de contraseñas (Bitwarden, 1Password) o un correo a ti mismo cifrado.
3. **No** subas `private.pem` a internet, ni a Google Drive público, ni a Gumroad, ni a GitHub.

> Si algún día pierdes `private.pem` **y** no tienes respaldo: tendrías que regenerar las
> llaves y sacar una versión nueva de la app. Por eso: **respáldala hoy**.

---

## 🧾 Paso 2 — Cómo abrir la "ventana de comandos" (PowerShell)

Vas a necesitar pegar un par de comandos. Es más fácil de lo que suena:

1. Abre el Explorador de archivos y entra a la carpeta del proyecto:
   `C:\Users\csp\Proyectos\portfolio-tracker`
2. En esa carpeta, **mantén presionada la tecla Shift**, haz **clic derecho** en un
   espacio vacío y elige **"Abrir la ventana de PowerShell aquí"** (o "Abrir en Terminal").
3. Se abre una ventana negra/azul. Ahí vas a **pegar** los comandos (clic derecho = pegar).

Antes de cualquier comando, **pega siempre esta línea primero** (prepara Node):

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
```

---

## 💳 Paso 3 — Configurar Gumroad (una sola vez)

1. Entra a tu Gumroad: <https://acostafconsulting.gumroad.com> (ya es el que la app muestra).
2. Crea tus productos según los planes y precios:
   - **Pro** — USD $24.99 (pago único)
   - **Premium** — USD $6.99 / mes
   - **Lifetime** — USD $89.99 (pago único)
   - *(El plan **Free** no se vende: es la app sin código.)*
3. En **cada** producto, sube el **mismo** archivo: `Tracker de Portafolio Setup 0.9.0.exe`.
   Eso es lo único que el cliente descarga.
4. En la descripción del producto, pega el aviso de descarga segura y, si quieres, el
   enlace a tu página (la landing del Paso 6).

> ⚠️ Gumroad **no** genera nuestros códigos automáticamente. El código lo generas **tú**
> con el comando del Paso 4 y se lo mandas al cliente. (Es manual a propósito: así nadie
> más que tú puede emitir licencias.)

---

## ✅ Paso 4 — En CADA venta: generar el código del cliente

Cuando alguien te compra (Gumroad te avisa por correo), haces esto:

1. Abre PowerShell en la carpeta del proyecto (Paso 2) y pega la línea de Node.
2. Pega el comando según el plan que compró:

```powershell
node scripts/generate-license.cjs pro
```

(usa `premium` o `lifetime` en vez de `pro` según corresponda)

3. El comando te imprime algo así:

```
Tier:    pro
CÓDIGO:  PTRF-PRO-2026-A1B2C3D4
FIRMA:   nUrKRU+kK0hY...(texto largo)...==

— Para el cliente (una sola línea) —
PTRF-PRO-2026-A1B2C3D4 | nUrKRU+kK0hY...==
```

4. **Copia las dos partes** (el `CÓDIGO` y la `FIRMA`) y mándaselas al cliente por correo.
5. El cliente abre la app → **Configuración → Licencia → Ver planes y activar**, pega el
   **código** en un campo y la **firma** en el otro, pulsa **Activar**, y ya tiene su plan.

> 💡 Cada vez que corres el comando sale un código **distinto y único**. Genera uno por
> cliente. Si quieres, puedes generar varios por adelantado y guardarlos.

---

## 📤 Paso 5 — Qué SÍ y qué NO subir a Gumroad

**SÍ subes (lo único):**
- ✅ `release\Tracker de Portafolio Setup 0.9.0.exe` — el instalador.

**NO subas NADA de esto a Gumroad (ni a ningún lado público):**
- ❌ La carpeta `keys\` (¡especialmente `private.pem`!).
- ❌ El código fuente del proyecto (las carpetas `src`, `electron`, `scripts`, etc.).
- ❌ La carpeta `node_modules`.
- ❌ Los archivos `.pem` de cualquier tipo.

En resumen: **a Gumroad solo sube el `.exe`. Nada más.**

---

## 🌐 Paso 6 — Publicar tu página (landing) — opcional pero recomendado

Tienes una página lista en `landing\index.html`. Sirve para que la gente conozca la app,
vea los planes y descargue con confianza (incluye el "candado" del hash de seguridad).

- La forma más fácil: súbela a **GitHub Pages** (gratis) o pídele a alguien técnico que la
  publique. El botón "Comprar" ya apunta a tu Gumroad.
- Antes de publicar, reemplaza los **placeholders de video** (dicen "Loom / YouTube") por
  tus enlaces reales cuando los tengas.

---

## 🔒 Reglas de oro (lo más importante)

1. **`private.pem` = secreto absoluto.** Respaldada en 2 lugares, nunca pública.
2. **A Gumroad solo el `.exe`.**
3. **No regeneres las llaves** (romperías los códigos ya emitidos).
4. La app es **100% privada**: no recolecta datos de tus clientes. Es tu mayor argumento de venta.

---

## 🛠️ Si algún día cambias la app y quieres una versión nueva

Pídele al asistente (o a alguien técnico) que corra, en la carpeta del proyecto:

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
npm run app:build
```

Eso deja un instalador nuevo en `release\` y actualiza `SHA256SUMS.txt` (el hash de
seguridad). Sube ese nuevo `.exe` a Gumroad y actualiza el hash en la landing.

---

## ❓ Dudas frecuentes

- **¿El cliente necesita internet?** No para usar la app. Solo si activa precios en vivo.
- **¿Y si un cliente pierde su código?** Vuelves a correr el comando del Paso 4 y se lo
  reenvías (o guarda tú una lista de a quién le diste cada código).
- **¿Puedo cambiar los precios?** Sí, en Gumroad. En la app los precios son solo
  informativos (se editan en `src/config/tiers.ts` si quieres, pero no es urgente).
- **¿La tasa de retención ISR (1.9%)?** La fija el SAT y cambia cada año. Cuando cambie,
  pide que actualicen el valor `ISR_WITHHOLDING_RATE` en el código (es un número, un minuto).
- **Soporte / contacto:** <https://franscisco-acosta.odoo.com/contactus>

---

*Tracker de Portafolio v0.9.0 — guía para el dueño. Guárdala junto a tu respaldo de `private.pem`.*
