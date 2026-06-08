import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { seedIfEmpty } from './db/seed';
import { clearSensitive } from './db/backup';
import { initialVaultStatus, useVault } from './store/vault';
import './i18n';
import './lib/theme';
import './index.css';

async function bootstrap() {
  // S1 — Si el cifrado está activado, arranca BLOQUEADO y borra cualquier dato en
  // claro residual (de un cierre no limpio) ANTES de montar React. No se siembra:
  // los datos reales viven cifrados y se cargan al desbloquear.
  const status = initialVaultStatus();
  useVault.getState().setStatus(status);
  if (status === 'locked') {
    await clearSensitive();
  } else {
    await seedIfEmpty();
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
