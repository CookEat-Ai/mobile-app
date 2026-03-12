import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import I18n from '../i18n';

interface LanguageContextType {
  locale: string;
  setLanguage: (lang: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [locale, setLocale] = useState<string>(I18n.locale);

  useEffect(() => {
    const initLanguage = async () => {
      const savedLang = await AsyncStorage.getItem('app_language');
      if (savedLang) {
        I18n.locale = savedLang;
        setLocale(savedLang);
      } else {
        const locales = getLocales();
        const deviceLang = locales[0].languageCode || 'fr';
        I18n.locale = deviceLang;
        setLocale(deviceLang);
      }
    };
    initLanguage();
  }, []);

  const setLanguage = async (lang: string) => {
    I18n.locale = lang;
    setLocale(lang);
    await AsyncStorage.setItem('app_language', lang);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
