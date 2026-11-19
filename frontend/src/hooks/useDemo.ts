import { useContext } from 'react';
import { DemoContext, type DemoContextValue } from '@/contexts/demo-context';

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
