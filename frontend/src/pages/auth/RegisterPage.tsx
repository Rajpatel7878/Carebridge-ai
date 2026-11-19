import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Check,
  CheckCircle2,
  Circle,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, ErrorState } from '@/components/common';
import { Input, PasswordInput, Select } from '@/components/forms';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import type { RegisterResponse } from '@/types/auth';
import { cn } from '@/utils/cn';
import {
  evaluatePasswordStrength,
  strongPasswordSchema,
} from '@/utils/password';

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter your full name (at least 2 characters).')
      .max(150, 'Full name must not exceed 150 characters.'),
    email: z
      .string()
      .trim()
      .min(1, 'Email address is required.')
      .email('Enter a valid email address.'),
    role: z.enum(['PATIENT', 'DOCTOR']),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'Please accept the platform terms and privacy guidelines.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const STRENGTH_BAR_COLORS: Record<number, string> = {
  0: 'bg-[var(--cb-border)]',
  1: 'bg-[var(--cb-critical)]',
  2: 'bg-[var(--cb-critical)]',
  3: 'bg-[var(--cb-warning)]',
  4: 'bg-[var(--cb-primary)]',
  5: 'bg-[var(--cb-success)]',
};

export function RegisterPage() {
  useDocumentTitle('Create Account');
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const { showToast } = useDemo();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [registrationResult, setRegistrationResult] =
    useState<RegisterResponse | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: 'PATIENT',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const passwordValue = useWatch({ control, name: 'password' }) ?? '';
  const selectedRole = useWatch({ control, name: 'role' });
  const strength = evaluatePasswordStrength(passwordValue);

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await registerUser({
        full_name: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
        confirm_password: values.confirmPassword,
        role: values.role,
      });

      setRegistrationResult(result);
      showToast(
        'Account created successfully',
        result.requires_role_approval
          ? 'Sign in now as a patient; clinician access awaits admin verification.'
          : 'You can now sign in with your email and password.',
        'success',
      );
    } catch (error) {
      setFormError(
        extractApiErrorMessage(
          error,
          'Unable to complete registration. Please check your details and try again.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationResult) {
    const { user, requires_role_approval: pendingDoctor } = registrationResult;

    return (
      <div className="rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 text-center shadow-[var(--cb-shadow-sm)] sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--cb-success-soft)] text-[var(--cb-success)]">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-[var(--cb-text)]">
          Account created successfully
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--cb-text-muted)]">
          Welcome,{' '}
          <strong className="text-[var(--cb-text)]">{user.full_name}</strong>.
          Your CareBridge AI account (
          <strong className="text-[var(--cb-text)]">{user.email}</strong>) is
          ready to sign in with{' '}
          <strong className="text-[var(--cb-text)]">Patient</strong> access.
        </p>

        {pendingDoctor && (
          <div className="mt-4 rounded-xl border border-[var(--cb-warning-border)] bg-[var(--cb-warning-soft)] p-3 text-left text-xs leading-relaxed text-[var(--cb-warning)]">
            <strong>Doctor verification pending:</strong> Your clinician access
            request has been recorded for administrator review. Doctor dashboard
            access is enabled once an administrator approves your account.
          </div>
        )}

        <div className="mt-6 space-y-2.5">
          <Button
            size="lg"
            fullWidth
            onClick={() =>
              navigate('/login', {
                state: { registeredEmail: user.email },
              })
            }
          >
            Continue to Sign In
          </Button>
          <Link
            to="/"
            className="block py-2 text-sm font-semibold text-[var(--cb-primary)] hover:underline"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[var(--cb-shadow-sm)] sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--cb-text)]">
          Create your CareBridge account
        </h1>
        <p className="mt-1.5 text-sm text-[var(--cb-text-muted)]">
          Register to access secure, role-based care coordination.
        </p>
      </div>

      {formError && (
        <ErrorState
          title="Registration failed"
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
          label="Full Name"
          type="text"
          autoComplete="name"
          placeholder="e.g., Ananya Mehta"
          leftIcon={<User className="h-4 w-4" aria-hidden="true" />}
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Input
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="name@example.org"
          leftIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Select
          label="Account Type"
          options={[
            { value: 'PATIENT', label: 'Patient — Personal Health & Care' },
            {
              value: 'DOCTOR',
              label: 'Doctor — Request Clinician Access (Admin Approval)',
            },
          ]}
          error={errors.role?.message}
          {...register('role')}
        />

        {selectedRole === 'DOCTOR' && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/60 p-3 text-xs text-[var(--cb-text-secondary)]">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-primary)]"
            />
            <span>
              For clinical security, new accounts start with standard{' '}
              <strong className="text-[var(--cb-text)]">Patient</strong> access.
              A platform administrator must verify and approve your account
              before Doctor privileges are activated.
            </span>
          </div>
        )}

        <div>
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Password strength meter & checklist */}
          <div
            aria-live="polite"
            className="mt-2.5 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-3"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--cb-text-secondary)]">
                Password strength
              </span>
              <span className="font-semibold text-[var(--cb-text)]">
                {strength.label}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-5 gap-1" aria-hidden="true">
              {Array.from({ length: strength.maxScore }).map((_, index) => {
                const active = index < strength.score;
                return (
                  <span
                    key={index}
                    className={cn(
                      'h-1.5 rounded-full transition-colors',
                      active
                        ? STRENGTH_BAR_COLORS[strength.score]
                        : 'bg-[var(--cb-border)]',
                    )}
                  />
                );
              })}
            </div>
            <ul className="mt-2.5 grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
              {strength.requirements.map((rule) => (
                <li
                  key={rule.id}
                  className={cn(
                    'flex items-center gap-1.5',
                    rule.met
                      ? 'text-[var(--cb-success)]'
                      : 'text-[var(--cb-text-muted)]',
                  )}
                >
                  {rule.met ? (
                    <Check
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle className="h-3 w-3 shrink-0" aria-hidden="true" />
                  )}
                  <span>{rule.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <PasswordInput
          label="Confirm Password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <div>
          <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--cb-text-secondary)]">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-[var(--cb-border-strong)] accent-[#1769AA]"
              {...register('acceptTerms')}
            />
            <span>
              I agree to the CareBridge AI Terms of Use and Privacy Guidelines
              and acknowledge not to submit real protected patient information
              in demonstration workflows.
            </span>
          </label>
          {errors.acceptTerms && (
            <p
              role="alert"
              className="mt-1.5 text-xs font-medium text-[var(--cb-critical)]"
            >
              {errors.acceptTerms.message}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <p className="mt-6 border-t border-[var(--cb-border)] pt-5 text-center text-sm text-[var(--cb-text-muted)]">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-[var(--cb-primary)] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
