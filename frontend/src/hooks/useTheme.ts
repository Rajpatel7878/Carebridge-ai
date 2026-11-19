import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '@/contexts/theme-context';

export interface ChartPalette {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  critical: string;
  neutral: string;
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useChartPalette(): ChartPalette {
  const { isDark } = useTheme();
  if (isDark) {
    return {
      primary: '#3B9AE1',
      secondary: '#2DD4BF',
      success: '#4ADE80',
      warning: '#FBBF24',
      critical: '#F87171',
      neutral: '#64748B',
      grid: '#1F2F4A',
      axis: '#94A3B8',
      tooltipBg: '#152238',
      tooltipBorder: '#2D4366',
      tooltipText: '#F1F5F9',
    };
  }
  return {
    primary: '#1769AA',
    secondary: '#14B8A6',
    success: '#16A34A',
    warning: '#D97706',
    critical: '#DC2626',
    neutral: '#64748B',
    grid: '#E2E8F0',
    axis: '#64748B',
    tooltipBg: '#FFFFFF',
    tooltipBorder: '#CBD5E1',
    tooltipText: '#172B4D',
  };
}
