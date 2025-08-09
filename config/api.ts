// import Constants from 'expo-constants';

// Configuration de l'API selon l'environnement
const getApiBaseUrl = () => {
  // En développement local
  if (__DEV__) {
    return 'http://192.168.1.192:8083/api';
  }

  // En production (remplacez par votre vraie URL)
  return 'https://cookeat.info/api';
};

// Configuration avec expo-constants
const getApiUrlFromConstants = () => {
  // const manifest = Constants.expoConfig;

  // Si vous avez configuré apiBaseUrl dans app.json
  // if (manifest?.extra?.apiBaseUrl) {
  //   return manifest.extra.apiBaseUrl;
  // }

  // Fallback vers la configuration par défaut
  return getApiBaseUrl();
};

export const API_BASE_URL = getApiUrlFromConstants(); 