import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore, type SignupInput } from '../lib/auth';
import { asMessage } from '../lib/api';

type Role = 'EMPLOYER' | 'HELPER';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(10, 'Use at least 10 characters')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/\d/, 'Include a number'),
  confirm: z.string(),
  agree: z.literal(true, {
    errorMap: () => ({ message: 'Please accept the terms to continue' }),
  }),
}).refine((v) => v.password === v.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

type FormValues = z.infer<typeof schema>;

/**
 * Account creation. The role chooser sits at the top — defaulting to whatever
 * the landing-page CTA passed in via ?role=. We deliberately don't ask for
 * profile data here: that lives in the post-signup wizard so creating an
 * account stays a 30-second decision.
 */
export default function SignupPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const initialRole = useMemo<Role>(() => {
    const r = params.get('role');
    return r === 'helper' ? 'HELPER' : 'EMPLOYER';
  }, [params]);

  const [role, setRole] = useState<Role>(initialRole);
  const signUp = useAuthStore((s) => s.signUp);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<FormValues>();

  const [serverError, setServerError] = useState<string | null>(null);
  const password = watch('password') ?? '';

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof FormValues;
        setError(path, { message: issue.message });
      }
      return;
    }

    const input: SignupInput = {
      email: parsed.data.email,
      password: parsed.data.password,
      role,
      locale: 'en',
    };

    try {
      await signUp(input);
      // Both roles go straight into the onboarding wizard at /profile —
      // matches don't make sense until weights/skills are set.
      nav('/profile', { replace: true });
    } catch (err) {
      setServerError(asMessage(err, 'Could not create your account. Try again.'));
    }
  }

  return (
    <div className="relative warm-glow">
      <div className="max-w-md mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="text-center mb-8">
          <p className="hand text-sage-700 text-xl">say hello</p>
          <h1 className="serif text-3xl md:text-4xl text-sage-900 leading-tight mt-1">
            Create your <span className="text-clay-500">HelperHaven</span> account
          </h1>
          <p className="text-ink-500 mt-3 text-sm md:text-base">
            One short form — profile details come next.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-cream-50 border border-cream-200 rounded-3xl p-6 md:p-8 shadow-soft space-y-5"
          noValidate
        >
          {serverError && (
            <div className="rounded-xl bg-clay-500/10 border border-clay-500/30 text-clay-600 text-sm px-4 py-3">
              {serverError}
            </div>
          )}

          {/* Role chooser */}
          <div>
            <div className="text-sm font-medium text-ink-900 mb-2">I am a…</div>
            <div className="grid grid-cols-2 gap-2">
              <RoleChip
                active={role === 'EMPLOYER'}
                onClick={() => setRole('EMPLOYER')}
                title="Family"
                blurb="Looking to welcome a helper"
              />
              <RoleChip
                active={role === 'HELPER'}
                onClick={() => setRole('HELPER')}
                title="Helper"
                blurb="Looking for a household to join"
              />
            </div>
          </div>

          <Field label="Email" error={errors.email?.message}>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('email')}
              className={inputCls(!!errors.email)}
            />
          </Field>

          <Field
            label="Password"
            error={errors.password?.message}
            hint={<PasswordStrength value={password} />}
          >
            <input
              type="password"
              autoComplete="new-password"
              placeholder="At least 10 characters"
              {...register('password')}
              className={inputCls(!!errors.password)}
            />
          </Field>

          <Field label="Confirm password" error={errors.confirm?.message}>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              {...register('confirm')}
              className={inputCls(!!errors.confirm)}
            />
          </Field>

          <label className="flex items-start gap-2.5 text-sm text-ink-700">
            <input
              type="checkbox"
              {...register('agree')}
              className="mt-1 h-4 w-4 rounded border-cream-200 text-sage-500 focus:ring-sage-400/40"
            />
            <span>
              I agree to HelperHaven's{' '}
              <Link to="/terms" className="text-sage-700 hover:text-sage-900">Terms</Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-sage-700 hover:text-sage-900">Privacy</Link>.
            </span>
          </label>
          {errors.agree && (
            <p className="-mt-3 text-xs text-clay-600">{errors.agree.message as string}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-full bg-clay-500 text-white font-medium hover:bg-clay-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating your account…' : 'Say hello →'}
          </button>

          <p className="text-center text-sm text-ink-500">
            Already with us?{' '}
            <Link to="/login" className="text-sage-700 hover:text-sage-900 font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function RoleChip({
  active,
  onClick,
  title,
  blurb,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  blurb: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-left rounded-2xl px-4 py-3 border transition-colors ${
        active
          ? 'bg-sage-50 border-sage-400 ring-2 ring-sage-400/30'
          : 'bg-white border-cream-200 hover:border-sage-400/60'
      }`}
    >
      <div className={`font-medium ${active ? 'text-sage-900' : 'text-ink-900'}`}>{title}</div>
      <div className="text-xs text-ink-500 mt-0.5 leading-snug">{blurb}</div>
    </button>
  );
}

/**
 * Tiny indicator: 0–4 segments based on simple checks. Not a proxy for true
 * entropy — just nudges users towards the regex requirements above.
 */
function PasswordStrength({ value }: { value: string }) {
  const score = [
    value.length >= 10,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;

  const colors = ['bg-cream-200', 'bg-clay-500', 'bg-blush-300', 'bg-sage-400', 'bg-sage-600'];
  return (
    <div className="flex gap-1" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`block h-1 w-5 rounded-full ${i < score ? colors[score] : 'bg-cream-200'}`} />
      ))}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full px-4 py-3 rounded-xl border bg-white text-ink-900 placeholder:text-ink-500/60 focus:outline-none focus:ring-2 focus:ring-sage-400/40 ${
    hasError ? 'border-clay-500/60' : 'border-cream-200 focus:border-sage-400'
  }`;
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-ink-900">{label}</span>
        {hint}
      </div>
      {children}
      {error && <p className="mt-1.5 text-xs text-clay-600">{error}</p>}
    </label>
  );
}
