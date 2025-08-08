import I18n from "react-native-i18n";
import en from './locales/en.json';
import fr from './locales/fr.json';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from 'expo-localization';

I18n.translations = { en, fr };

const loadLanguage = async () => {
  const language = await AsyncStorage.getItem('app_language');
  if (language) {
    I18n.locale = language;
  } else {
    const locales = getLocales();
    I18n.locale = locales[0].languageCode || 'fr';
    await AsyncStorage.setItem('app_language', I18n.locale);
  }
};

loadLanguage();

export default I18n;