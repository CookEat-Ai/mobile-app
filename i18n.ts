import I18n from "react-native-i18n";
import en from './locales/en.json';
import fr from './locales/fr.json';
import AsyncStorage from "@react-native-async-storage/async-storage";

I18n.translations = { en, fr };

const loadLanguage = async () => {
  const language = await AsyncStorage.getItem('app_language');
  if (language) {
    I18n.locale = language;
  } else {
    I18n.locale = 'fr';
  }
};

loadLanguage();

export default I18n;