// T4 — Recorrido guiado ("spotlight") de 4 pasos. Resalta elementos reales de la
// app marcados con [data-tour="..."] y atenúa el resto de la pantalla. Se muestra
// automáticamente la primera vez (localStorage 'tour-seen', distinto del flag de
// la guía de configuración 'pt-onboarded') y puede repetirse desde Ayuda y
// Configuración. El estado de apertura vive en useUi (openTour/closeTour) para
// poder dispararlo desde cualquier sitio; este componente navega entre pantallas
// (setScreen) para enseñar cada parte.

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { type Screen, useUi } from '../store/ui';
import { Button, cn } from './ui';

const TOUR_SEEN_KEY = 'tour-seen';
const PAD = 8; // margen del recuadro alrededor del elemento resaltado

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourStep {
  titleKey: string;
  bodyKey: string;
  screen?: Screen; //   pantalla donde se muestra el paso
  selector?: string; // elemento a resaltar (si lo hay; pasos 1 y 4 no resaltan)
}

const STEPS: TourStep[] = [
  { titleKey: 'tour.step1Title', bodyKey: 'tour.step1Body', screen: 'dashboard' },
  { titleKey: 'tour.step2Title', bodyKey: 'tour.step2Body', screen: 'dashboard', selector: '[data-tour="dashboard"]' },
  { titleKey: 'tour.step3Title', bodyKey: 'tour.step3Body', screen: 'movimientos', selector: '[data-tour="add-btn"]' },
  { titleKey: 'tour.step4Title', bodyKey: 'tour.step4Body', screen: 'ayuda' },
];

/** ¿Se debe mostrar el tour automáticamente? (no se ha visto/omitido antes). */
export function shouldShowTour(): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) !== 'true';
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, 'true');
  } catch {
    /* localStorage no disponible */
  }
}

/** Olvida que el tour ya se vio (para "Ver tour nuevamente"). */
export function resetTourSeen(): void {
  try {
    localStorage.removeItem(TOUR_SEEN_KEY);
  } catch {
    /* localStorage no disponible */
  }
}

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** Coloca la tarjeta debajo del elemento si cabe; si no, arriba. Clampa al viewport. */
function floatingCardStyle(rect: Rect): CSSProperties {
  const CARD_W = 320;
  const margin = 16;
  const estH = 220; // alto estimado de la tarjeta para decidir arriba/abajo
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const below = rect.top + rect.height + 12 + estH < vh;
  const top = below ? rect.top + rect.height + 12 : Math.max(margin, rect.top - estH - 12);
  const left = Math.max(margin, Math.min(rect.left, vw - CARD_W - margin));
  return { top, left };
}

export function TourOnboarding() {
  const { t } = useTranslation();
  const open = useUi((s) => s.tourOpen);
  const closeTour = useUi((s) => s.closeTour);
  const setScreen = useUi((s) => s.setScreen);

  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const timers = useRef<number[]>([]);

  // Al abrir, siempre empezamos en el primer paso.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Navega a la pantalla del paso y mide el elemento a resaltar (tras el render).
  useEffect(() => {
    if (!open) return;
    const s = STEPS[step];
    if (s.screen) setScreen(s.screen);

    const clear = () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
    clear();

    if (!s.selector) {
      setRect(null);
      return clear;
    }
    const sel = s.selector;
    // 1) espera el render de la nueva pantalla, 2) centra el elemento,
    // 3) mide tras el desplazamiento.
    timers.current.push(
      window.setTimeout(() => {
        const el = document.querySelector(sel);
        if (!el) {
          setRect(null);
          return;
        }
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
        timers.current.push(window.setTimeout(() => setRect(rectOf(el)), 120));
      }, 160),
    );
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  // Re-mide al cambiar el tamaño o hacer scroll, sin volver a desplazar.
  useEffect(() => {
    if (!open) return;
    const sel = STEPS[step].selector;
    if (!sel) return;
    const remeasure = () => {
      const el = document.querySelector(sel);
      setRect(el ? rectOf(el) : null);
    };
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    return () => {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
  }, [open, step]);

  // Esc cierra (y marca como visto).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const last = STEPS.length - 1;

  function finish() {
    markSeen();
    setRect(null);
    closeTour();
    setScreen('dashboard');
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      {/* Captura de clics: evita interactuar con la app durante el tour. En los
          pasos con resaltado, la atenuación la pinta el box-shadow del spotlight. */}
      <div
        className={cn('absolute inset-0', rect ? 'bg-transparent' : 'bg-black/45')}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Recuadro "spotlight": atenúa todo menos el elemento (box-shadow gigante). */}
      {rect ? (
        <div
          className="tour-spotlight"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
        />
      ) : null}

      {/* Tarjeta del paso */}
      <div
        className={cn(
          'z-10 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-800',
          rect ? 'fixed' : 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        )}
        style={rect ? floatingCardStyle(rect) : undefined}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-brand-gold">
          {t('tour.stepOf', { step: step + 1, total: STEPS.length })}
        </p>
        <h2 className="mt-1 text-lg font-bold text-heading">{t(STEPS[step].titleKey)}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t(STEPS[step].bodyKey)}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
          >
            {t('tour.skip')}
          </button>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
                {t('common.back')}
              </Button>
            ) : null}
            {step < last ? (
              <Button onClick={() => setStep((s) => s + 1)}>{t('common.next')}</Button>
            ) : (
              <Button onClick={finish}>{t('tour.finish')}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
