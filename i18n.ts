import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import fr from './locales/fr.json';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
};

// Initialisation immédiate avec une configuration de base
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources,
  lng: 'en', // langue par défaut immédiate
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

const initI18n = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem('app_language');
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    } else {
      const locales = Localization.getLocales();
      const languageCode = locales[0]?.languageCode || 'en';
      i18n.changeLanguage(languageCode);
      await AsyncStorage.setItem('app_language', languageCode);
    }
  } catch (error) {
    console.error('[i18n] Error loading saved language:', error);
  }
};

initI18n();

export default i18n;
