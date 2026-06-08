// Hook afterPack de electron-builder.
//
// Por qué existe: en este equipo (sin permisos de administrador y sin "Modo
// desarrollador" de Windows) electron-builder NO puede usar su rcedit interno,
// porque para conseguirlo descarga un paquete que contiene enlaces simbólicos
// de macOS que Windows se niega a extraer sin privilegios. Por eso desactivamos
// el paso interno con "signAndEditExecutable": false en electron-builder.json y
// aquí volvemos a incrustar a mano el icono y los datos de versión en el .exe,
// usando un rcedit-x64.exe normal (sin enlaces simbólicos).
//
// Si algo falla, solo se muestra un aviso y la compilacion continua: el
// instalador se genera igual, a lo sumo con el icono por defecto de Electron.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.join(__dirname, '..');
const BUILD_DIR = path.join(PROJECT_ROOT, 'build');

// Busca un rcedit-x64.exe utilizable: variable de entorno, copia local en
// build/, o cualquier copia ya extraida en la cache de electron-builder.
function findRcedit() {
  const candidates = [];
  if (process.env.RCEDIT_PATH) candidates.push(process.env.RCEDIT_PATH);
  candidates.push(path.join(BUILD_DIR, 'rcedit-x64.exe'));

  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }

  // Ultimo recurso: rastrear la cache de electron-builder.
  const cacheBase = path.join(
    process.env.LOCALAPPDATA || '',
    'electron-builder',
    'Cache',
    'winCodeSign',
  );
  try {
    for (const entry of fs.readdirSync(cacheBase)) {
      const candidate = path.join(cacheBase, entry, 'rcedit-x64.exe');
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch {
    // cache inexistente: se ignora
  }
  return null;
}

module.exports = async function afterPack(context) {
  // Solo aplica a Windows.
  if (context.electronPlatformName !== 'win32') return;

  const appInfo = context.packager.appInfo;
  const exeName = `${appInfo.productFilename}.exe`;
  const exePath = path.join(context.appOutDir, exeName);

  if (!fs.existsSync(exePath)) {
    console.warn(`[after-pack] No se encontro el ejecutable: ${exePath}`);
    return;
  }

  const rcedit = findRcedit();
  if (!rcedit) {
    console.warn(
      '[after-pack] No se encontro rcedit-x64.exe; el .exe quedara con el icono por defecto de Electron.',
    );
    return;
  }

  const iconPath = path.join(BUILD_DIR, 'icon.ico');
  const version = appInfo.version || '0.1.0';
  const productName = appInfo.productName || 'Tracker de Portafolio';
  const company = appInfo.companyName || productName;
  const copyright = appInfo.copyright || `Copyright © ${new Date().getFullYear()} ${productName}`;

  const args = [exePath];
  if (fs.existsSync(iconPath)) {
    args.push('--set-icon', iconPath);
  } else {
    console.warn(`[after-pack] No se encontro el icono: ${iconPath} (se omite).`);
  }
  args.push(
    '--set-version-string', 'ProductName', productName,
    '--set-version-string', 'FileDescription', productName,
    '--set-version-string', 'CompanyName', company,
    '--set-version-string', 'LegalCopyright', copyright,
    '--set-file-version', version,
    '--set-product-version', version,
  );

  try {
    execFileSync(rcedit, args, { stdio: 'pipe' });
    console.log(`[after-pack] Icono y datos de version incrustados en ${exeName}`);
  } catch (err) {
    console.warn(`[after-pack] rcedit fallo (${err.message}); se continua sin incrustar el icono.`);
  }
};
