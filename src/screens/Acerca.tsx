import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui';
import { APP_VERSION } from '../config/version';

export default function Acerca() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t('acerca.title')} subtitle={t('acerca.subtitle')} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-heading">{t('acerca.appName')}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('acerca.version', { version: APP_VERSION })}</p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t('acerca.desc')}</p>
        </Card>
        <Card>
          <h3 className="font-semibold text-heading">{t('acerca.privacyTitle')}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('acerca.privacyBody')}</p>
        </Card>
        <Card className="md:col-span-2">
          <h3 className="font-semibold text-heading">{t('acerca.builtTitle')}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('acerca.builtBody')}</p>
        </Card>
      </div>
    </div>
  );
}
