import { z } from 'zod';

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordStrengthResult {
  score: number;
  maxScore: number;
  label: 'Enter a password' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  requirements: PasswordRequirement[];
}

export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .max(128, 'Password must not exceed 128 characters.')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must include at least one number.')
  .regex(
    /[^A-Za-z0-9\s]/,
    'Password must include at least one special character (e.g., !@#$%^&*).',
  );

export function evaluatePasswordStrength(
  password: string,
): PasswordStrengthResult {
  const requirements: PasswordRequirement[] = [
    {
      id: 'length',
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'One number (0-9)',
      met: /[0-9]/.test(password),
    },
    {
      id: 'special',
      label: 'One special character (!@#$...)',
      met: /[^A-Za-z0-9\s]/.test(password),
    },
  ];

  const score = requirements.filter((rule) => rule.met).length;

  let label: PasswordStrengthResult['label'] = 'Enter a password';
  if (password.length > 0) {
    if (score <= 2) label = 'Weak';
    else if (score === 3) label = 'Fair';
    else if (score === 4) label = 'Good';
    else label = 'Strong';
  }

  return {
    score,
    maxScore: requirements.length,
    label,
    requirements,
  };
}
