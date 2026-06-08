// Proceso principal de Electron.
//
// Carga la app web ya construida (carpeta dist/) dentro de una ventana de
// escritorio. Los archivos se sirven mediante un esquema propio "app://" para
// que IndexedDB y localStorage tengan un ORIGEN ESTABLE y los datos se
// conserven entre sesiones (abrir con file:// hace que muchos navegadores
// traten el origen como inseguro y no guarden datos).

const { app, BrowserWindow, ipcMain, protocol, session, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');
const fs = require('node:fs/promises');

const DIST = path.join(__dirname, '..', 'dist');
const SMOKE = !!process.env.PT_SMOKE; // modo prueba: carga y se cierra solo

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

// S2 — Content-Security-Policy estricta. Solo recursos propios (app://); estilos
// inline permitidos (Recharts/medición de layout); conexiones salientes únicamente
// a las APIs de precios en vivo (F3). Con los precios en vivo apagados no se hace
// ninguna conexión; estos orígenes solo habilitan esa función opt-in.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://api.coingecko.com https://query1.finance.yahoo.com https://query2.finance.yahoo.com https://api.frankfurter.dev",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join('; ');

// F3 — Hosts de las APIs de precios en vivo (los mismos de connect-src). Yahoo
// Finance responde 200 con datos válidos pero SIN el encabezado
// Access-Control-Allow-Origin, así que con webSecurity:true el navegador de
// Electron bloquea la lectura de la respuesta y los precios nunca llegan. Para
// que la función opt-in funcione sin desactivar webSecurity ni abrir un canal
// IPC, se inyecta ese encabezado SOLO en las respuestas de estos hosts de
// confianza (ver onHeadersReceived más abajo). CoinGecko/Frankfurter ya lo
// envían; Yahoo no, y aquí queda cubierto.
const PRICE_API_HOSTS = new Set([
  'api.coingecko.com',
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'api.frankfurter.dev',
]);

function hostOf(rawUrl) {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return '';
  }
}

// E.2/F — Allowlist de dominios externos que se pueden abrir en el navegador del
// sistema (asesor Odoo, Gumroad de compra, plataformas de video de los tutoriales).
// Cualquier otro host se ignora: la app nunca navega fuera de app:// y solo abre
// estos destinos de confianza con shell.openExternal.
const ALLOWED_EXTERNAL_HOSTS = new Set([
  'franscisco-acosta.odoo.com',
  'acostafconsulting.gumroad.com',
  'gumroad.com',
  'www.loom.com',
  'loom.com',
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
]);

function openExternalIfAllowed(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.protocol === 'https:' && ALLOWED_EXTERNAL_HOSTS.has(u.hostname)) {
      shell.openExternal(rawUrl);
    }
  } catch {
    /* URL inválida: ignorar */
  }
}

// El esquema "app" debe registrarse como estándar y seguro ANTES de que la app
// esté lista, para que su origen pueda persistir almacenamiento (IndexedDB).
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

async function serveFromDist(request) {
  const { pathname } = new URL(request.url);
  let rel = decodeURIComponent(pathname);
  if (!rel || rel === '/') rel = '/index.html';

  const filePath = path.resolve(DIST, '.' + rel);
  // Seguridad: nunca servir nada fuera de la carpeta dist.
  if (!filePath.startsWith(path.resolve(DIST))) {
    return new Response('Forbidden', { status: 403 });
  }
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new Response(data, {
      headers: {
        'content-type': MIME[ext] || 'application/octet-stream',
        'content-security-policy': CSP,
      },
    });
  } catch {
    // App de una sola página: ante una ruta inexistente, devolver index.html.
    const fallback = await fs.readFile(path.join(DIST, 'index.html'));
    return new Response(fallback, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy': CSP,
      },
    });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#1F3864',
    title: 'Tracker de Portafolio',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'), // S9 — único puente (API de updates)
    },
  });

  win.once('ready-to-show', () => {
    if (!SMOKE) win.show();
  });

  // Los enlaces externos (http/https) se abren en el navegador del sistema,
  // no dentro de la app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalIfAllowed(url);
    return { action: 'deny' };
  });

  // S2 — Solo se permite navegar dentro de la app (app://). Cualquier intento de
  // navegar a otro origen se cancela; si es un host de la allowlist se abre en el
  // navegador del sistema, los demás se ignoran.
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://')) {
      event.preventDefault();
      openExternalIfAllowed(url);
    }
  });

  if (SMOKE) {
    win.webContents.once('did-finish-load', () => {
      console.log('[smoke] index cargado correctamente');
      setTimeout(() => app.quit(), 600);
    });
    win.webContents.once('did-fail-load', (_e, code, desc) => {
      console.error('[smoke] fallo de carga', code, desc);
      app.exit(1);
    });
  }

  win.loadURL('app://tracker/index.html');
}

// S9 — Sistema de actualizaciones (electron-updater + GitHub Releases). El
// renderer (pantalla Configuración) MANDA y main EJECUTA; main nunca instala solo
// (autoInstallOnAppQuit=false) ni descarga sin permiso (autoDownload se activa por
// petición). En desarrollo (no empaquetado) queda deshabilitado: no hay
// app-update.yml y autoUpdater lanzaría error.
function broadcastUpdaterEvent(payload) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('updater:event', payload);
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false; // la descarga la decide el renderer por petición
  autoUpdater.autoInstallOnAppQuit = false; // jamás instalar sin que el usuario lo pida

  // Repo PÚBLICO: los clientes NO necesitan token para recibir updates. Si GH_TOKEN
  // existe en el entorno (la PC del dueño), se envía igual: sube el rate limit de
  // GitHub y permite volver a repo privado "en 1 clic" (bastaría private:true en
  // electron-builder.json). NUNCA se incrusta el token en el código.
  if (process.env.GH_TOKEN) {
    autoUpdater.requestHeaders = { Authorization: `token ${process.env.GH_TOKEN}` };
  }

  autoUpdater.on('checking-for-update', () => broadcastUpdaterEvent({ type: 'checking' }));
  autoUpdater.on('update-available', (info) =>
    broadcastUpdaterEvent({
      type: 'available',
      version: info && info.version,
      releaseNotes: typeof (info && info.releaseNotes) === 'string' ? info.releaseNotes : undefined,
    }),
  );
  autoUpdater.on('update-not-available', (info) =>
    broadcastUpdaterEvent({ type: 'not-available', version: info && info.version }),
  );
  autoUpdater.on('download-progress', (p) =>
    broadcastUpdaterEvent({ type: 'progress', percent: Math.round((p && p.percent) || 0) }),
  );
  autoUpdater.on('update-downloaded', (info) =>
    broadcastUpdaterEvent({ type: 'downloaded', version: info && info.version }),
  );
  autoUpdater.on('error', (err) =>
    broadcastUpdaterEvent({ type: 'error', message: String((err && err.message) || err) }),
  );

  ipcMain.handle('updater:check', async (_e, opts) => {
    if (!app.isPackaged) return { status: 'dev-disabled' };
    try {
      autoUpdater.autoDownload = !!(opts && opts.autoDownload);
      await autoUpdater.checkForUpdates();
      return { status: 'ok' };
    } catch (err) {
      const message = String((err && err.message) || err);
      broadcastUpdaterEvent({ type: 'error', message });
      return { status: 'error', message };
    }
  });

  ipcMain.handle('updater:download', async () => {
    if (!app.isPackaged) return { status: 'dev-disabled' };
    try {
      await autoUpdater.downloadUpdate();
      return { status: 'ok' };
    } catch (err) {
      const message = String((err && err.message) || err);
      broadcastUpdaterEvent({ type: 'error', message });
      return { status: 'error', message };
    }
  });

  ipcMain.handle('updater:install', () => {
    if (!app.isPackaged) return { status: 'dev-disabled' };
    autoUpdater.quitAndInstall(); // instala y reinicia AHORA (el usuario lo pidió)
    return { status: 'ok' };
  });
}

app.whenReady().then(() => {
  // F3 — Inyecta Access-Control-Allow-Origin en las respuestas de las APIs de
  // precios para sortear la falta de CORS de Yahoo SIN bajar webSecurity. Solo
  // toca los hosts de confianza de PRICE_API_HOSTS; app:// y cualquier otro
  // origen pasan sin cambios. Las peticiones son GET simples (encabezado Accept,
  // sin credenciales), por lo que no hay preflight que atender.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!PRICE_API_HOSTS.has(hostOf(details.url))) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }
    const responseHeaders = { ...details.responseHeaders };
    for (const key of Object.keys(responseHeaders)) {
      if (key.toLowerCase() === 'access-control-allow-origin') delete responseHeaders[key];
    }
    responseHeaders['Access-Control-Allow-Origin'] = ['*'];
    callback({ responseHeaders });
  });

  setupAutoUpdater(); // S9 — registra IPC + listeners del updater (no consulta red por sí solo)

  protocol.handle('app', serveFromDist);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
