// S10 — Gestión de etiquetas personalizadas. Se monta como sección en Configuración.
// Free/Pro: 1 etiqueta gratis; al intentar la 2da → UpgradeLock hacia Premium.
// Premium/Lifetime: ilimitadas. No se puede borrar una etiqueta con activos asignados.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../db/db';
import { useAssets, useLabels, useTier } from '../store/data';
import { canAddLabel } from '../lib/custom-labels';
import type { Label } from '../types';
import { Badge, Button, Card, cn, EmptyState, Field, Modal, SectionTitle, TextInput } from './ui';
import { UpgradeLock } from './UpgradeLock';

const LABEL_MAX = 30;

/** 8 colores predefinidos: brand-navy, brand-gold, gain, loss + 4 acentos. */
export const LABEL_COLORS = [
  '#1F3864', // brand-navy
  '#F0CDA1', // brand-gold
  '#16A34A', // gain
  '#DC2626', // loss
  '#64748B', // slate
  '#0EA5E9', // sky
  '#8B5CF6', // violet
  '#14B8A6', // teal
];

export function LabelManager() {
  const { t } = useTranslation();
  const tier = useTier();
  const labels = useLabels() ?? [];
  const assets = useAssets();

  // Conteo de activos por etiqueta (para mostrar y para bloquear el borrado).
  const countByLabel = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assets) for (const id of a.label_ids ?? []) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [assets]);

  const [editing, setEditing] = useState<Label | 'new' | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(LABEL_COLORS[0]);
  const [err, setErr] = useState('');

  const isPremium = tier === 'premium' || tier === 'lifetime';
  const canAdd = canAddLabel(tier, labels.length);

  function openNew() {
    setEditing('new');
    setName('');
    setColor(LABEL_COLORS[0]);
    setErr('');
  }
  function openEdit(l: Label) {
    setEditing(l);
    setName(l.name);
    setColor(l.color ?? LABEL_COLORS[0]);
    setErr('');
  }
  function close() {
    setEditing(null);
    setErr('');
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > LABEL_MAX) {
      setErr(t('labels.name_max'));
      return;
    }
    if (editing === 'new') {
      await db.labels.add({
        id: crypto.randomUUID(),
        name: trimmed,
        color,
        created_at: new Date().toISOString(),
      });
    } else if (editing) {
      // Se actualiza por id → los activos que la usan no se tocan (referencian el id).
      await db.labels.update(editing.id, { name: trimmed, color });
    }
    close();
  }

  async function remove(l: Label) {
    if ((countByLabel.get(l.id) ?? 0) > 0) return; // bloqueado: tiene activos
    if (!window.confirm(`${t('labels.delete')}: ${l.name}`)) return;
    await db.labels.delete(l.id);
  }

  return (
    <Card className="lg:col-span-2">
      <SectionTitle hint={isPremium ? undefined : t('labels.free_hint')}>🏷️ {t('labels.title')}</SectionTitle>

      {labels.length === 0 ? (
        <EmptyState title={t('labels.no_labels')} />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {labels.map((l) => {
            const count = countByLabel.get(l.id) ?? 0;
            return (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: l.color ?? '#64748B' }}
                  />
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{l.name}</span>
                  <Badge tone="neutral">{t('labels.assets_count', { count })}</Badge>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" onClick={() => openEdit(l)} aria-label={t('labels.edit')}>
                    ✏️
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void remove(l)}
                    disabled={count > 0}
                    title={count > 0 ? t('labels.cannot_delete') : t('labels.delete')}
                    aria-label={t('labels.delete')}
                  >
                    🗑️
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4">
        {canAdd ? (
          <Button onClick={openNew}>+ {t('labels.new')}</Button>
        ) : (
          <UpgradeLock capability="canUseCustomLabels" requiredTier="premium" />
        )}
      </div>

      {labels.length > 0 ? (
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">⚠️ {t('labels.cannot_delete')}</p>
      ) : null}

      <Modal
        open={editing !== null}
        title={editing === 'new' ? t('labels.new') : t('labels.edit')}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void save()}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t('labels.title')} hint={t('labels.name_max')} error={err || undefined}>
            <TextInput
              value={name}
              maxLength={LABEL_MAX}
              placeholder={t('labels.name_placeholder')}
              onChange={(e) => {
                setName(e.target.value);
                setErr('');
              }}
            />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('labels.color')}
            </span>
            <div className="flex flex-wrap gap-2">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-7 w-7 rounded-full ring-offset-2 transition ring-offset-white dark:ring-offset-slate-800',
                    color === c ? 'ring-2 ring-brand-navy dark:ring-brand-gold' : '',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
