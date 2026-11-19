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
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import {
  getDashboardPathForRole,
  getRoleDisplayName,
  isPathAllowedForRole,
} from '@/types/auth';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required.')
    .email('Enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(128, 'Password must not exceed 128 characters.'),
  rememberSession: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginLocationState {
  from?: string;
  registeredEmail?: string;
}

export function LoginPage() {
  useDocumentTitle('Sign In');
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
    resolver: zodResolver(loginSchema),
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
        `Welcome back, ${authenticatedUser.full_name}`,
        `Signed in to your ${getRoleDisplayName(authenticatedUser.role)} workspace.`,
        'success',
      );
      navigate(targetPath, { replace: true });
    } catch (error) {
      setFormError(
        extractApiErrorMessage(
          error,
          'Unable to sign in with those credentials. Please try again.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[var(--cb-shadow-sm)] sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--cb-text)]">
          Sign in to CareBridge AI
        </h1>
        <p className="mt-1.5 text-sm text-[var(--cb-text-muted)]">
          Enter your registered email and password to access your authorized
          workspace.
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
          <span>Please sign in to access your CareBridge AI workspace.</span>
        </div>
      )}

      {formError && (
        <ErrorState
          title="Sign-in failed"
          message={formError}
          className="mt-4"
        />
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-5 space-y-4"
      >
        <Input
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="name@example.org"
          leftIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
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
            Remember session on this device
          </label>
          <Link
            to="/forgot-password"
            className="font-semibold text-[var(--cb-primary)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <p className="mt-6 border-t border-[var(--cb-border)] pt-5 text-center text-sm text-[var(--cb-text-muted)]">
        New to CareBridge AI?{' '}
        <Link
          to="/register"
          className="font-semibold text-[var(--cb-primary)] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
