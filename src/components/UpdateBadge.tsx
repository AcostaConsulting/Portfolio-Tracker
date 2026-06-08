// S9 — Aviso flotante de actualización. Aparece (esquina inferior derecha) SOLO
// cuando hay algo accionable: versión disponible, descargando o lista para
// instalar. Al hacer clic abre un modal con la acción correspondiente. Nunca
// fuerza nada: instalar/reiniciar es siempre decisión explícita del usuario.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateStore } from '../store/updates';
import { runUpdateDownload, runUpdateInstall } from '../store/update-syncer';
import { Button, Modal } from './ui';

export function UpdateBadge() {
  const { t } = useTranslation();
  const status = useUpdateStore((s) => s.status);
  const availableVersion = useUpdateStore((s) => s.availableVersion);
  const progressPct = useUpdateStore((s) => s.progressPct);
  const releaseNotes = useUpdateStore((s) => s.releaseNotes);
  const [open, setOpen] = useState(false);

  const actionable = status === 'available' || status === 'downloading' || status === 'downloaded';
  if (!actionable) return null;

  const vNew = availableVersion ? `v${availableVersion}` : '';
  const tooltip =
    status === 'downloaded'
      ? t('updates.badgeReady')
      : status === 'downloading'
        ? t('updates.downloading', { version: vNew, percent: progressPct })
        : t('updates.available', { version: vNew });

  const footer =
    status === 'available' ? (
      <>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {t('updates.later')}
        </Button>
        <Button
          onClick={() => {
            void runUpdateDownload();
          }}
        >
          📥 {t('updates.download')}
        </Button>
      </>
    ) : status === 'downloaded' ? (
      <>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {t('updates.later')}
        </Button>
        <Button onClick={() => runUpdateInstall()}>{t('updates.restartNow')}</Button>
      </>
    ) : (
      <Button variant="secondary" onClick={() => setOpen(false)}>
        {t('updates.later')}
      </Button>
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={tooltip}
        aria-label={tooltip}
        className="app-no-print fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-brand-gold/60 bg-white px-3.5 py-2 text-sm font-medium text-heading shadow-lg hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        <span aria-hidden="true">⬆️</span>
        <span className="hidden sm:inline">
          {status === 'downloaded' ? t('updates.restartNow') : t('updates.title')}
        </span>
        <span className="h-2 w-2 animate-pulse rounded-full bg-loss" />
      </button>

      <Modal open={open} title={t('updates.title')} onClose={() => setOpen(false)} footer={footer}>
        <div className="space-y-3">
          {status === 'available' ? (
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {t('updates.available', { version: vNew })}
            </p>
          ) : null}

          {status === 'downloading' ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {t('updates.downloading', { version: vNew, percent: progressPct })}
              </p>
              <div className="h-2 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
                <div className="h-2 rounded bg-brand-navy transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          ) : null}

          {status === 'downloaded' ? (
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {t('updates.downloaded', { version: vNew })}
            </p>
          ) : null}

          {releaseNotes ? (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t('updates.changelog.title')}
              </p>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {releaseNotes}
              </pre>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
