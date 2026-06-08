import { useEffect, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { Onboarding, shouldShowOnboarding } from './components/Onboarding';
import { TourOnboarding, shouldShowTour } from './components/TourOnboarding';
import { LockScreen } from './components/LockScreen';
import { UpdateBadge } from './components/UpdateBadge';
import { useUi } from './store/ui';
import { useSettings } from './store/data';
import { usePriceSyncer } from './store/price-syncer';
import { useUpdateSyncer } from './store/update-syncer';
import { useVault } from './store/vault';
import { applyLanguage } from './i18n';
import { useThemeSync } from './lib/theme';
import Dashboard from './screens/Dashboard';
import Movimientos from './screens/Movimientos';
import Activos from './screens/Activos';
import Posiciones from './screens/Posiciones';
import RentaFija from './screens/RentaFija';
import Importar from './screens/Importar';
import Analisis from './screens/Analisis';
import Configuracion from './screens/Configuracion';
import Ayuda from './screens/Ayuda';
import Acerca from './screens/Acerca';

export default function App() {
  const screen = useUi((s) => s.screen);
  const settings = useSettings();
  const vaultStatus = useVault((s) => s.status);
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);
  const openTour = useUi((s) => s.openTour);
  const tourAutoStarted = useRef(false);
  usePriceSyncer();
  useUpdateSyncer();
  useThemeSync(settings?.theme);

  useEffect(() => {
    if (settings?.language) applyLanguage(settings.language);
  }, [settings?.language]);

  // T4 — Encadena el tour DESPUÉS de la guía de configuración: cuando el wizard ya
  // no está visible (se completó o se saltó) y el tour aún no se ha visto, lo abre
  // tras una breve pausa. Solo una vez por carga (ref).
  useEffect(() => {
    if (showOnboarding || vaultStatus === 'locked') return;
    if (tourAutoStarted.current || !shouldShowTour()) return;
    tourAutoStarted.current = true;
    const id = window.setTimeout(() => openTour(), 800);
    return () => window.clearTimeout(id);
  }, [showOnboarding, vaultStatus, openTour]);

  // S1 — Si el cifrado está activo y la sesión está bloqueada, pide el PIN antes de todo.
  if (vaultStatus === 'locked') {
    return <LockScreen />;
  }

  return (
    <AppShell>
      {screen === 'dashboard' && <Dashboard />}
      {screen === 'movimientos' && <Movimientos />}
      {screen === 'activos' && <Activos />}
      {screen === 'posiciones' && <Posiciones />}
      {screen === 'analisis' && <Analisis />}
      {screen === 'renta-fija' && <RentaFija />}
      {screen === 'importar' && <Importar />}
      {screen === 'configuracion' && <Configuracion />}
      {screen === 'ayuda' && <Ayuda />}
      {screen === 'acerca' && <Acerca />}
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
      <TourOnboarding />
      <UpdateBadge />
    </AppShell>
  );
}
