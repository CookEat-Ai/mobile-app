import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import des traductions
import en from './locales/en.json';
import fr from './locales/fr.json';

// Détecter la langue du système avec expo-localization
const getSystemLanguage = () => {
  try {
    // Utiliser expo-localization qui est plus fiable
    const locale = Localization.getLocales()[0]?.languageCode || 'fr';

    // Normaliser les codes de langue
    if (locale.startsWith('fr')) {
      return 'fr';
    } else if (locale.startsWith('en')) {
      return 'en';
    } else {
      return 'fr'; // Par défaut français
    }
  } catch (error) {
    console.error('Erreur lors de la détection de la langue:', error);
    return 'fr'; // Par défaut français
  }
};

const resources = {
  fr: {
    translation: fr
  },
  en: {
    translation: en
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSystemLanguage(),
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n; 