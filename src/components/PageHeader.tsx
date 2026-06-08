import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from './ui';

export function PageHeader({
  title,
  subtitle,
  capture,
  actions,
}: {
  title: string;
  subtitle?: string;
  capture?: boolean;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-heading">{title}</h1>
          {capture ? <Badge tone="gold">{t('common.capture')}</Badge> : null}
        </div>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="app-no-print flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
