import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, ErrorState } from '@/components/common';
import { Input, PasswordInput } from '@/components/forms';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useLanguage } from '@/hooks/useLanguage';
import { LOGIN_COPY } from '@/i18n/login';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import { getDashboardPathForRole, isPathAllowedForRole } from '@/types/auth';

const makeLoginSchema = (
  copy: (typeof LOGIN_COPY)['en'] | (typeof LOGIN_COPY)['hi'],
) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, copy.emailRequired)
      .email(copy.emailInvalid),
    password: z
      .string()
      .min(1, copy.passwordRequired)
      .max(128, copy.passwordMax),
    rememberSession: z.boolean().optional(),
  });

type LoginFormValues = z.infer<ReturnType<typeof makeLoginSchema>>;

interface LoginLocationState {
  from?: string;
  registeredEmail?: string;
}

export function LoginPage() {
  const { language } = useLanguage();
  const copy = LOGIN_COPY[language];
  useDocumentTitle(copy.title);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useDemo();

  const locationState = (location.state as LoginLocationState | null) ?? null;
  const redirectFrom =
    typeof locationState?.from === 'string' ? locationState.from : '';
  const prefilledEmail =
    typeof locationState?.registeredEmail === 'string'
      ? locationState.registeredEmail
      : '';

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(makeLoginSchema(copy)),
    defaultValues: {
      email: prefilledEmail,
      password: '',
      rememberSession: false,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const authenticatedUser = await login({
        email: values.email.trim(),
        password: values.password,
        remember_session: Boolean(values.rememberSession),
      });

      const targetPath = isPathAllowedForRole(
        redirectFrom,
        authenticatedUser.role,
      )
        ? redirectFrom
        : getDashboardPathForRole(authenticatedUser.role);

      showToast(
        `${copy.welcome}, ${authenticatedUser.full_name}`,
        copy.signedIn,
        'success',
      );
      navigate(targetPath, { replace: true });
    } catch (error) {
      setFormError(extractApiErrorMessage(error, copy.fallback));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[var(--cb-shadow-sm)] sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--cb-text)]">
          {copy.heading}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--cb-text-muted)]">
          {copy.description}
        </p>
      </div>

      {redirectFrom && !formError && (
        <div
          role="status"
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/60 p-3 text-xs text-[var(--cb-text-secondary)]"
        >
          <Lock
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-primary)]"
          />
          <span>{copy.requiredSession}</span>
        </div>
      )}

      {formError && (
        <ErrorState title={copy.failed} message={formError} className="mt-4" />
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-5 space-y-4"
      >
        <Input
          label={copy.email}
          type="email"
          autoComplete="email"
          placeholder="name@example.org"
          leftIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordInput
          label={copy.password}
          autoComplete="current-password"
          placeholder={copy.passwordPlaceholder}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <label className="inline-flex items-center gap-2 text-[var(--cb-text-secondary)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--cb-border-strong)] accent-[#1769AA]"
              {...register('rememberSession')}
            />
            {copy.remember}
          </label>
          <Link
            to="/forgot-password"
            className="font-semibold text-[var(--cb-primary)] hover:underline"
          >
            {copy.forgot}
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          {isSubmitting ? copy.signing : copy.signIn}
        </Button>
      </form>

      <p className="mt-6 border-t border-[var(--cb-border)] pt-5 text-center text-sm text-[var(--cb-text-muted)]">
        {copy.newUser}{' '}
        <Link
          to="/register"
          className="font-semibold text-[var(--cb-primary)] hover:underline"
        >
          {copy.create}
        </Link>
      </p>
    </div>
  );
}
