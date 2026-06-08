import { create } from 'zustand';

export type Screen =
  | 'dashboard'
  | 'movimientos'
  | 'activos'
  | 'posiciones'
  | 'renta-fija'
  | 'importar'
  | 'analisis'
  | 'configuracion'
  | 'ayuda'
  | 'acerca';

interface UiState {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  // A.4 — Modal global "Activar licencia" (se abre desde el badge, el banner Free
  // y la sección Licencia de Configuración).
  licenseModalOpen: boolean;
  openLicenseModal: () => void;
  closeLicenseModal: () => void;
  // T4 — Recorrido guiado (tour). Se abre automáticamente la primera vez y desde
  // los botones "Ver tour" de Ayuda y Configuración.
  tourOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
}

export const useUi = create<UiState>((set) => ({
  screen: 'dashboard',
  setScreen: (screen) => set({ screen }),
  licenseModalOpen: false,
  openLicenseModal: () => set({ licenseModalOpen: true }),
  closeLicenseModal: () => set({ licenseModalOpen: false }),
  tourOpen: false,
  openTour: () => set({ tourOpen: true }),
  closeTour: () => set({ tourOpen: false }),
}));
