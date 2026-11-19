import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/common';
import { Input } from '@/components/forms';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const forgotSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required.')
    .email('Enter a valid email address.'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  useDocumentTitle('Reset Password');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 text-center shadow-[var(--cb-shadow-sm)] sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--cb-success-soft)] text-[var(--cb-success)]">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-[var(--cb-text)]">
          Check recovery options
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--cb-text-muted)]">
          If an active account matches the email address provided, recovery
          guidance applies. Outbound email delivery is scheduled for a future
          release — please contact your CareBridge AI platform administrator for
          immediate account assistance.
        </p>
        <div className="mt-6 space-y-2.5">
          <Button
            variant="outline"
            fullWidth
            onClick={() => {
              setSubmitted(false);
              reset();
            }}
          >
            Enter a different email
          </Button>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-[var(--cb-primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[var(--cb-shadow-sm)] sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--cb-text)]">
          Reset your password
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--cb-text-muted)]">
          Enter the email address linked to your CareBridge AI account for
          password recovery guidance.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-6 space-y-4"
      >
        <Input
          label="Account Email"
          type="email"
          autoComplete="email"
          placeholder="name@example.org"
          leftIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          helperText="Automated email dispatch connects in the notifications phase; contact your administrator for immediate assistance."
          error={errors.email?.message}
          {...register('email')}
        />

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Send Reset Instructions'}
        </Button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--cb-border)] pt-5 text-sm">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-semibold text-[var(--cb-primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Sign In
        </Link>
        <Link
          to="/register"
          className="font-medium text-[var(--cb-text-muted)] hover:text-[var(--cb-text)]"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
