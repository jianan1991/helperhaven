import type { ReactNode } from 'react';

/**
 * Shared chrome for the onboarding wizards: a centred card with a title,
 * step counter, optional subhead, and the step body. Keeps both flows visually
 * consistent without coupling them.
 */
export default function WizardShell({
  step,
  totalSteps,
  title,
  subhead,
  children,
  footer,
  error,
}: {
  step: number;
  totalSteps: number;
  title: string;
  subhead?: string;
  children: ReactNode;
  footer: ReactNode;
  error?: string | null;
}) {
  return (
    <div className="relative warm-glow">
      <div className="max-w-xl mx-auto px-4 md:px-6 py-10 md:py-16">
        <StepDots step={step} totalSteps={totalSteps} />

        <div className="text-center mt-4 mb-7">
          <h1 className="serif text-2xl md:text-3xl text-sage-900 leading-tight">{title}</h1>
          {subhead && <p className="text-ink-500 mt-2 text-sm md:text-base">{subhead}</p>}
        </div>

        <div className="bg-cream-50 border border-cream-200 rounded-3xl p-6 md:p-8 shadow-soft space-y-5">
          {error && (
            <div className="rounded-xl bg-clay-500/10 border border-clay-500/30 text-clay-600 text-sm px-4 py-3">
              {error}
            </div>
          )}
          {children}
          <div className="pt-2 flex items-center justify-between gap-3">{footer}</div>
        </div>
      </div>
    </div>
  );
}

function StepDots({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-label={`Step ${step} of ${totalSteps}`}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <span
          key={i}
          className={`block h-1.5 rounded-full transition-all ${
            i + 1 === step
              ? 'w-7 bg-sage-500'
              : i + 1 < step
              ? 'w-4 bg-sage-400'
              : 'w-4 bg-cream-200'
          }`}
        />
      ))}
    </div>
  );
}

export function WizardField({
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
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-ink-900">{label}</span>
        {hint && <span className="text-xs text-ink-500">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-xs text-clay-600">{error}</p>}
    </label>
  );
}

export function inputCls(hasError = false) {
  return `w-full px-4 py-3 rounded-xl border bg-white text-ink-900 placeholder:text-ink-500/60 focus:outline-none focus:ring-2 focus:ring-sage-400/40 ${
    hasError ? 'border-clay-500/60' : 'border-cream-200 focus:border-sage-400'
  }`;
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = 'button',
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="px-6 py-3 rounded-full bg-clay-500 text-white font-medium hover:bg-clay-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-5 py-3 rounded-full text-sage-700 hover:bg-sage-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
    >
      {children}
    </button>
  );
}
