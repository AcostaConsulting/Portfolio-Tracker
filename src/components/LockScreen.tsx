// S1 — Pantalla de bloqueo. Se muestra (en lugar de la app) cuando el cifrado
// está activado y la sesión está bloqueada. Pide el PIN para descifrar el vault.

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { unlock } from '../store/vault';
import { Button, Field, TextInput } from './ui';

export function LockScreen() {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pin || busy) return;
    setBusy(true);
    const ok = await unlock(pin);
    if (!ok) {
      setError(true);
      setPin('');
      setBusy(false);
    }
    // Si tuvo éxito, el estado pasa a 'unlocked' y <App/> re-renderiza la app.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-navy text-sm font-bold text-brand-gold">
            P
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-heading">{t('app.brand')}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('lock.title')}</p>
          </div>
        </div>

        <Field label={t('lock.prompt')} error={error ? t('lock.error') : undefined}>
          <TextInput
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            invalid={error}
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            placeholder="••••"
          />
        </Field>

        <Button type="submit" className="mt-4 w-full" disabled={busy || pin.length === 0}>
          {busy ? t('lock.unlocking') : t('lock.unlock')}
        </Button>

        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">{t('lock.hint')}</p>
      </form>
    </div>
  );
}
