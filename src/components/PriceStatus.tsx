// F3 — Indicador del estado de los precios en vivo.
// Se autosuscribe a `usePriceSync`; el llamador solo hace <PriceStatus />.

import { usePriceSync } from '../store/prices';
import { cn } from './ui';

export function PriceStatus() {
  const { status, lastUpdated, lastError } = usePriceSync();

  let dot = 'bg-slate-300';
  let text = 'Precios en vivo activos';
  if (status === 'syncing') {
    dot = 'bg-amber-400';
    text = 'Actualizando…';
  } else if (status === 'ok') {
    dot = 'bg-green-500';
    text = lastUpdated ? `Actualizado ${lastUpdated}` : 'Actualizado';
  } else if (status === 'error') {
    dot = 'bg-red-500';
    text = 'Error al actualizar';
  } else if (status === 'offline') {
    dot = 'bg-slate-400';
    text = 'Sin conexión';
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
      title={lastError ?? undefined}
    >
      <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', dot)} />
      {text}
    </span>
  );
}
