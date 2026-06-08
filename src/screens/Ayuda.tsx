import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUi } from '../store/ui';
import { useSettings } from '../store/data';
import { openExternal } from '../lib/external';
import { CONSULTING_BOOKING_URL } from '../lib/consulting';
import { APP_VERSION } from '../config/version';
import { PageHeader } from '../components/PageHeader';
import { Button, Card, Field, SectionTitle, Textarea } from '../components/ui';

const ODOO_CONTACT = 'https://franscisco-acosta.odoo.com/contactus';

// F.1 — Videos tutoriales: placeholders que el dueño rellenará con sus enlaces
// reales de Loom/YouTube (ambos hosts están en la allowlist de lib/external).
const VIDEO_URLS = [
  'https://www.youtube.com/',
  'https://www.youtube.com/',
  'https://www.youtube.com/',
  'https://www.loom.com/',
  'https://www.loom.com/',
  'https://www.loom.com/',
];

export default function Ayuda() {
  const { t } = useTranslation();
  const setScreen = useUi((s) => s.setScreen);
  const openTour = useUi((s) => s.openTour);

  const steps = t('ayuda.quickStart', { returnObjects: true }) as string[];
  const videoTitles = t('ayuda.videoTitles', { returnObjects: true }) as string[];
  const faq = t('ayuda.faq', { returnObjects: true }) as Array<{ q: string; a: string }>;

  return (
    <div className="space-y-5">
      <PageHeader title={t('ayuda.title')} subtitle={t('ayuda.subtitle')} />

      {/* T4 — Recorrido guiado */}
      <Card>
        <SectionTitle>{t('tour.sectionTitle')}</SectionTitle>
        <p className="text-sm text-slate-600 dark:text-slate-300">{t('tour.sectionDesc')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={openTour}>▶ {t('tour.start')}</Button>
          <Button variant="secondary" onClick={() => openExternal(CONSULTING_BOOKING_URL)}>
            {t('consulting.book')} ↗
          </Button>
        </div>
      </Card>

      {/* Inicio rápido */}
      <Card>
        <SectionTitle>{t('ayuda.quickStartTitle')}</SectionTitle>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
          {Array.isArray(steps) ? steps.map((s, i) => <li key={i}>{s}</li>) : null}
        </ol>
      </Card>

      {/* Videos tutoriales */}
      <Card>
        <SectionTitle hint={t('ayuda.videosNote')}>{t('ayuda.videosTitle')}</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Array.isArray(videoTitles) ? videoTitles : []).map((title, i) => (
            <button
              key={i}
              type="button"
              onClick={() => openExternal(VIDEO_URLS[i] ?? VIDEO_URLS[0])}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/50"
            >
              <span>▶ {title}</span>
              <span className="text-xs text-slate-400">↗</span>
            </button>
          ))}
        </div>
      </Card>

      {/* FAQ */}
      <Card>
        <SectionTitle>{t('ayuda.faqTitle')}</SectionTitle>
        <div className="space-y-3">
          {(Array.isArray(faq) ? faq : []).map((item, i) => (
            <div key={i} className="border-b border-slate-100 pb-3 last:border-0 dark:border-slate-700">
              <p className="text-sm font-medium text-heading">{item.q}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.a}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Reportar problema (F.3) */}
      <ReportProblem />

      {/* Enlaces a Privacidad y Términos */}
      <Card>
        <SectionTitle>{t('ayuda.linksTitle')}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setScreen('configuracion')}>
            {t('ayuda.privacyLink')}
          </Button>
          <Button variant="secondary" onClick={() => setScreen('acerca')}>
            {t('ayuda.aboutLink')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** F.3 — Formulario local que arma un texto estructurado. No envía nada por red. */
function ReportProblem() {
  const { t } = useTranslation();
  const settings = useSettings();
  const [tried, setTried] = useState('');
  const [happened, setHappened] = useState('');
  const [steps, setSteps] = useState('');
  const [copied, setCopied] = useState(false);

  function buildReport(): string {
    const os = typeof navigator !== 'undefined' ? navigator.userAgent : '—';
    const lang = settings?.language ?? 'es';
    return [
      `[${t('ayuda.reportTitle')} — Tracker de Portafolio v${APP_VERSION}]`,
      `${t('ayuda.fTried')}: ${tried.trim() || '—'}`,
      `${t('ayuda.fHappened')}: ${happened.trim() || '—'}`,
      `${t('ayuda.fSteps')}: ${steps.trim() || '—'}`,
      `OS: ${os}`,
      `${t('ayuda.fVersion')}: ${APP_VERSION}`,
      `${t('ayuda.fLanguage')}: ${lang}`,
    ].join('\n');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildReport());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card>
      <SectionTitle hint={t('ayuda.reportNote')}>{t('ayuda.reportTitle')}</SectionTitle>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('ayuda.reportIntro')}</p>
      <div className="space-y-3">
        <Field label={t('ayuda.fTried')}>
          <Textarea rows={2} value={tried} onChange={(e) => setTried(e.target.value)} />
        </Field>
        <Field label={t('ayuda.fHappened')}>
          <Textarea rows={2} value={happened} onChange={(e) => setHappened(e.target.value)} />
        </Field>
        <Field label={t('ayuda.fSteps')}>
          <Textarea rows={2} value={steps} onChange={(e) => setSteps(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => void copy()}>
            {copied ? t('ayuda.copied') : t('ayuda.copy')}
          </Button>
          <Button variant="secondary" onClick={() => openExternal(ODOO_CONTACT)}>
            {t('ayuda.openContact')} ↗
          </Button>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">{t('ayuda.reportPrivacy')}</p>
      </div>
    </Card>
  );
}
