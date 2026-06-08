import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { type Screen, useUi } from '../store/ui';
import { useSettings } from '../store/data';
import { db, SETTINGS_ID } from '../db/db';
import { applyTheme, resolveDark } from '../lib/theme';
import { lockNow, useVault } from '../store/vault';
import type { Theme } from '../types';
import { todayISO } from '../lib/dates';
import { formatDate } from '../lib/format';
import { cn } from './ui';
import { PriceStatus } from './PriceStatus';
import { LicenseBadge } from './LicenseBadge';
import { LicenseNotices } from './LicenseNotices';
import { LicenseModal } from './LicenseModal';

interface NavItem {
  screen: Screen;
  labelKey: string;
  capture?: boolean;
}

const NAV_GROUPS: Array<{ headingKey: string; items: NavItem[] }> = [
  {
    headingKey: 'nav.groupResumen',
    items: [
      { screen: 'dashboard', labelKey: 'nav.dashboard' },
      { screen: 'posiciones', labelKey: 'nav.posiciones' },
      { screen: 'analisis', labelKey: 'nav.analisis' },
    ],
  },
  {
    headingKey: 'nav.groupCaptura',
    items: [
      { screen: 'movimientos', labelKey: 'nav.movimientos', capture: true },
      { screen: 'activos', labelKey: 'nav.activos', capture: true },
      { screen: 'renta-fija', labelKey: 'nav.rentaFija', capture: true },
      { screen: 'importar', labelKey: 'nav.importar', capture: true },
    ],
  },
  {
    headingKey: 'nav.groupSistema',
    items: [
      { screen: 'configuracion', labelKey: 'nav.configuracion', capture: true },
      { screen: 'ayuda', labelKey: 'nav.ayuda' },
      { screen: 'acerca', labelKey: 'nav.acerca' },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const screen = useUi((s) => s.screen);
  const setScreen = useUi((s) => s.setScreen);
  const settings = useSettings();
  const activeItem = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.screen === screen);
  const activeLabel = activeItem ? t(activeItem.labelKey) : '';

  // F5 — Toggle rápido de tema (claro ↔ oscuro) en la barra lateral / header móvil.
  const isDark = resolveDark(settings?.theme ?? 'system');
  function toggleTheme() {
    const next: Theme = isDark ? 'light' : 'dark';
    applyTheme(next); // respuesta inmediata
    void db.settings.update(SETTINGS_ID, { theme: next }); // persiste la preferencia
  }
  const themeTitle = isDark ? t('config.themeToLight') : t('config.themeToDark');
  const vaultStatus = useVault((s) => s.status);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <aside className="app-no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy text-sm font-bold text-brand-gold">
            P
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-heading">{t('app.brand')}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('app.base')} {settings?.base_currency ?? '—'}</p>
          </div>
          <div className="ml-auto">
            <LicenseBadge />
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.headingKey}>
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t(group.headingKey)}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = screen === item.screen;
                  return (
                    <button
                      key={item.screen}
                      onClick={() => setScreen(item.screen)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-brand-navy text-white'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
                      )}
                    >
                      <span>{t(item.labelKey)}</span>
                      {item.capture ? (
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            active ? 'bg-brand-gold' : 'bg-brand-gold/70',
                          )}
                          title={t('nav.captureHint')}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {settings?.live_prices_enabled ? (
          <div className="app-no-print border-t border-slate-100 px-5 py-3 dark:border-slate-700">
            <PriceStatus />
          </div>
        ) : null}

        <div className="app-no-print border-t border-slate-100 px-3 py-3 dark:border-slate-700">
          <button
            type="button"
            onClick={toggleTheme}
            title={themeTitle}
            aria-label={themeTitle}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <span aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
            <span>{isDark ? t('config.themeLight') : t('config.themeDark')}</span>
          </button>
          {vaultStatus === 'unlocked' ? (
            <button
              type="button"
              onClick={() => void lockNow()}
              title={t('security.lockNow')}
              aria-label={t('security.lockNow')}
              className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <span aria-hidden="true">🔒</span>
              <span>{t('security.lockNow')}</span>
            </button>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-no-print flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-700 dark:bg-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-navy text-xs font-bold text-brand-gold">
            P
          </span>
          <select
            value={screen}
            onChange={(e) => setScreen(e.target.value as Screen)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
              <option key={item.screen} value={item.screen}>
                {t(item.labelKey)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleTheme}
            title={themeTitle}
            aria-label={themeTitle}
            className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300"
          >
            <span aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mb-4 hidden border-b border-slate-300 pb-2 print:block">
            <p className="text-base font-bold text-slate-900">{t('app.name')}</p>
            <p className="text-xs text-slate-600">
              {activeLabel} · {formatDate(todayISO())}
            </p>
          </div>
          <LicenseNotices />
          {children}
        </main>
      </div>

      <LicenseModal />
    </div>
  );
}
