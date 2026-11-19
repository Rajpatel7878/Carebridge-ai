import { useContext } from 'react';
import {
  LanguageContext,
  type LanguageContextValue,
} from '@/contexts/language-context';

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
