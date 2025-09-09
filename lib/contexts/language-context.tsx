'use client';

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface LanguageContextType {
  language: 'en' | 'es';
  setLanguage: (lang: 'en' | 'es') => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
});

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<'en' | 'es'>(() => {
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      // Check localStorage first
      const stored = localStorage.getItem('app-language');
      if (stored === 'en' || stored === 'es') {
        return stored;
      }

      // Fallback to browser language
      const browserLang = navigator?.language?.toLowerCase() || '';
      if (browserLang.startsWith('es')) {
        return 'es';
      }
    }

    // Default to English (server-side or no preference)
    return 'en';
  });

  const setLanguage = (newLang: 'en' | 'es') => {
    setLanguageState(newLang);
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-language', newLang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
