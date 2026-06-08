// A.4 — Modal "Activar licencia": tabla comparativa de planes con espejo MXN,
// enlace a Gumroad y formulario de activación (código + firma) validado offline.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Field, Textarea, Badge, cn } from './ui';
import { useUi } from '../store/ui';
import { useTier } from '../store/data';
import { verifyLicense } from '../lib/license';
import { getLocalMachineId } from '../lib/machine-id';
import { openExternal } from '../lib/external';
import { db, LICENSE_ID } from '../db/db';
import { todayISO } from '../lib/dates';
import {
  TIER_ORDER,
  TIER_PRICING,
  TIER_CAPS,
  GUMROAD_URL,
  mxnMirror,
  type Capability,
} from '../config/tiers';

const CAP_ROWS: Capability[] = [
  'maxAssets',
  'canExport',
  'canUseLivePrices',
  'canUseAlerts',
  'canReviewCommissions',
  'canSuggestLiquidity',
  'canUseBenchmarks',
  'canUseGoals',
  'canUseRebalancing',
  'prioritySupport',
];

export function LicenseModal() {
  const { t } = useTranslation();
  const open = useUi((s) => s.licenseModalOpen);
  const close = useUi((s) => s.closeLicenseModal);
  const currentTier = useTier();

  const [code, setCode] = useState('');
  const [signature, setSignature] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function activate() {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const { valid, tier } = await verifyLicense(code.trim(), signature.trim());
      if (!valid || !tier) {
        setError(t('activate.errorInvalid'));
        return;
      }
      await db.license.put({
        id: LICENSE_ID,
        tier,
        code: code.trim(),
        activated_at: todayISO(),
        machine_id: getLocalMachineId(),
      });
      setSuccess(t('activate.success', { tier: t(`tier.${tier}`) }));
      setCode('');
      setSignature('');
    } catch {
      setError(t('activate.errorInvalid'));
    } finally {
      setBusy(false);
    }
  }

  async function backToFree() {
    if (!window.confirm(t('activate.backToFreeConfirm'))) return;
    await db.license.delete(LICENSE_ID);
    setSuccess('');
    setError('');
  }

  return (
    <Modal open={open} title={t('activate.title')} onClose={close} size="2xl">
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('activate.intro')}</p>

      {/* Tabla comparativa de planes con espejo MXN */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t('activate.plansTitle')}
              </th>
              {TIER_ORDER.map((tier) => {
                const p = TIER_PRICING[tier];
                const isCurrent = tier === currentTier;
                return (
                  <th
                    key={tier}
                    className={cn(
                      'px-2 py-2 text-center align-bottom',
                      isCurrent && 'rounded-t-lg bg-brand-navy/5 dark:bg-brand-navy/25',
                    )}
                  >
                    <div className="font-semibold text-heading">{t(`tier.${tier}`)}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      {p.period === 'free'
                        ? t('activate.free')
                        : `USD $${p.usd.toFixed(2)}${p.period === 'month' ? t('activate.perMonth') : ''}`}
                    </div>
                    {p.period !== 'free' && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {t('activate.mxnApprox', { mxn: mxnMirror(p.usd) })}
                        {p.period === 'once' ? ` · ${t('activate.perOnce')}` : ''}
                      </div>
                    )}
                    {isCurrent && (
                      <div className="mt-1">
                        <Badge tone="gold">{t('activate.currentTag')}</Badge>
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {CAP_ROWS.map((cap) => (
              <tr key={cap} className="border-t border-slate-100 dark:border-slate-700">
                <td className="py-1.5 pr-2 text-slate-600 dark:text-slate-300">{t(`capability.${cap}`)}</td>
                {TIER_ORDER.map((tier) => {
                  const v = TIER_CAPS[tier][cap];
                  const isCurrent = tier === currentTier;
                  return (
                    <td
                      key={tier}
                      className={cn(
                        'px-2 py-1.5 text-center tabular-nums',
                        isCurrent && 'bg-brand-navy/5 dark:bg-brand-navy/25',
                      )}
                    >
                      {cap === 'maxAssets' ? (
                        <span className="font-medium text-heading">
                          {v === Infinity ? t('activate.unlimited') : String(v)}
                        </span>
                      ) : v ? (
                        <span className="text-gain">✓</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <Button variant="secondary" onClick={() => openExternal(GUMROAD_URL)}>
          {t('activate.buyCta')} ↗
        </Button>
      </div>

      {/* Formulario de activación */}
      <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
        <div className="space-y-3">
          <Field label={t('activate.codeLabel')}>
            <Textarea
              rows={1}
              value={code}
              maxLength={64}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('activate.codePlaceholder')}
              className="font-mono"
            />
          </Field>
          <Field label={t('activate.signatureLabel')}>
            <Textarea
              rows={3}
              value={signature}
              maxLength={1024}
              onChange={(e) => setSignature(e.target.value)}
              placeholder={t('activate.signaturePlaceholder')}
              className="font-mono text-xs"
            />
          </Field>

          {error && <p className="text-sm text-loss">{error}</p>}
          {success && <p className="text-sm text-gain">{success}</p>}

          <div className="flex items-center justify-between gap-2">
            <Button onClick={activate} disabled={busy || !code.trim() || !signature.trim()}>
              {busy ? t('activate.activating') : t('activate.button')}
            </Button>
            {currentTier !== 'free' && (
              <button
                type="button"
                onClick={backToFree}
                className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline dark:hover:text-slate-300"
              >
                {t('activate.backToFree')}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
