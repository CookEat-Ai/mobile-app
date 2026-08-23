import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import esES from './locales/es-ES.json';
import esMX from './locales/es-MX.json';
import ptBR from './locales/pt-BR.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'de', 'es-ES', 'es-MX', 'pt-BR'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function resolveSupportedLanguage(languageTag?: string | null): SupportedLanguage {
  const normalized = languageTag?.replace('_', '-').toLowerCase() ?? '';
  if (normalized === 'es-mx' || normalized.startsWith('es-mx-')) return 'es-MX';
  if (normalized.startsWith('es')) return 'es-ES';
  if (normalized.startsWith('pt')) return 'pt-BR';
  if (normalized.startsWith('de')) return 'de';
  if (normalized.startsWith('fr')) return 'fr';
  return 'en';
}

export function getLanguageLocale(languageTag?: string | null): string {
  const language = resolveSupportedLanguage(languageTag);
  if (language === 'fr') return 'fr-FR';
  if (language === 'en') return 'en-US';
  if (language === 'de') return 'de-DE';
  return language;
}

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  de: { translation: de },
  'es-ES': { translation: esES },
  'es-MX': { translation: esMX },
  'pt-BR': { translation: ptBR },
};

// Initialisation immédiate avec une configuration de base
i18n.use(initReactI18next).init({
  // Pas de `compatibilityJSON: 'v3'` : l'option a été retirée d'i18next en v23
  // et la 25 l'ignore silencieusement. Elle laissait croire que les pluriels
  // s'écrivaient `clé_plural` alors que c'est bien le format v4 qui s'applique
  // (`clé_one` / `clé_other`), et elle produisait une erreur de typage.
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
      i18n.changeLanguage(resolveSupportedLanguage(savedLanguage));
    } else {
      const locales = Localization.getLocales();
      const language = resolveSupportedLanguage(locales[0]?.languageTag);
      i18n.changeLanguage(language);
      await AsyncStorage.setItem('app_language', language);
    }
  } catch (error) {
    console.error('[i18n] Error loading saved language:', error);
  }
};

initI18n();

export default i18n;
