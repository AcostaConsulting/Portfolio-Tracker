// Primitivos de UI compartidos. Presentacionales, sin lógica de negocio.

import { useEffect, useState } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// --- Tarjetas / secciones --------------------------------------------------

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('break-inside-avoid rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800', className)}>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-semibold text-heading">{children}</h2>
      {hint ? <span className="text-xs text-slate-400 dark:text-slate-500">{hint}</span> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'gain' | 'loss' | 'gold' | 'navy';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    gain: 'bg-green-100 text-gain dark:bg-green-500/15',
    loss: 'bg-red-100 text-loss dark:bg-red-500/15',
    gold: 'bg-brand-gold/30 text-amber-800 dark:bg-brand-gold/15 dark:text-amber-200',
    navy: 'bg-brand-navy/10 text-brand-navy dark:bg-brand-navy/40 dark:text-slate-100',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>
      {children}
    </span>
  );
}

// --- Botones ---------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand-navy text-white hover:bg-brand-navy/90',
    secondary:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    danger: 'bg-loss text-white hover:bg-loss/90',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}

// --- Controles de formulario ----------------------------------------------

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-loss">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

const controlBase =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-brand-navy/30 dark:bg-slate-800 dark:text-slate-100';

export function TextInput({
  className,
  invalid,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(controlBase, invalid ? 'border-loss' : 'border-slate-300 focus:border-brand-navy dark:border-slate-600', className)}
      {...rest}
    />
  );
}

export function Select({
  className,
  invalid,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn(controlBase, invalid ? 'border-loss' : 'border-slate-300 focus:border-brand-navy dark:border-slate-600', className)}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  maxLength = 2000, // S6 — cota de longitud por defecto (notas); sobreescribible.
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlBase, 'border-slate-300 focus:border-brand-navy dark:border-slate-600', className)}
      rows={3}
      maxLength={maxLength}
      {...rest}
    />
  );
}

// --- Estados vacíos / valores --------------------------------------------

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-600 dark:bg-slate-800">
      <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Texto coloreado por signo (verde ganancia / rojo pérdida / neutro cero). */
export function SignedValue({
  value,
  children,
  className,
}: {
  value: number;
  children: ReactNode;
  className?: string;
}) {
  const tone = value > 0 ? 'text-gain' : value < 0 ? 'text-loss' : 'text-slate-600 dark:text-slate-300';
  return <span className={cn('font-medium tabular-nums', tone, className)}>{children}</span>;
}

// --- Modal -----------------------------------------------------------------

const MODAL_WIDTHS = { lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl' } as const;

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'lg',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof MODAL_WIDTHS;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60" onClick={onClose} />
      <div className={cn('relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-slate-800', MODAL_WIDTHS[size])}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

/** Input numérico que confirma al perder foco o con Enter (edición en línea). */
export function InlineNumberInput({
  value,
  onCommit,
  disabled,
  className,
  step,
  min,
}: {
  value: number;
  onCommit: (v: number) => void;
  disabled?: boolean;
  className?: string;
  step?: number;
  min?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit() {
    const n = text === '' ? 0 : Number(text);
    if (Number.isFinite(n) && n !== value) onCommit(n);
    else setText(String(value));
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      disabled={disabled}
      value={text}
      step={step}
      min={min}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className={cn(
        'w-28 rounded-md border border-slate-300 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/30 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-500',
        className,
      )}
    />
  );
}
