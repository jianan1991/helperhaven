import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore } from '../lib/auth';
import { asMessage } from '../lib/api';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

type FormValues = z.infer<typeof schema>;

/**
 * Email + password sign-in. Direction-A styled. After login we honour
 * `?next=` if present (set by RequireAuth when bouncing an unauthenticated user),
 * otherwise we send everyone to /matches.
 */
export default function LoginPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/matches';
  const signIn = useAuthStore((s) => s.signIn);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>();

  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      // Map zod errors back into RHF — we keep zod here without @hookform/resolvers.
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof FormValues;
        setError(path, { message: issue.message });
      }
      return;
    }
    try {
      await signIn(parsed.data.email, parsed.data.password);
      nav(next, { replace: true });
    } catch (err) {
      setServerError(asMessage(err, 'Sign-in failed. Check your credentials and try again.'));
    }
  }

  return (
    <div className="relative warm-glow">
      <div className="max-w-md mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="text-center mb-8">
          <p className="hand text-sage-700 text-xl">welcome back</p>
          <h1 className="serif text-3xl md:text-4xl text-sage-900 leading-tight mt-1">
            Sign in to <span className="text-clay-500">HelperHaven</span>
          </h1>
          <p className="text-ink-500 mt-3 text-sm md:text-base">
            Pick up where you left off.
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

          <Field label="Email" error={errors.email?.message}>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              {...register('email')}
              className={inputCls(!!errors.email)}
            />
          </Field>

          <Field
            label="Password"
            error={errors.password?.message}
            hint={
              <Link to="/forgot" className="text-xs text-sage-700 hover:text-sage-900">
                Forgot?
              </Link>
            }
          >
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
              className={inputCls(!!errors.password)}
            />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-full bg-clay-500 text-white font-medium hover:bg-clay-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in →'}
          </button>

          <p className="text-center text-sm text-ink-500">
            New here?{' '}
            <Link to="/signup" className="text-sage-700 hover:text-sage-900 font-medium">
              Create an account
            </Link>
          </p>
        </form>
      </div>
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
