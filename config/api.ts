import Constants from 'expo-constants';

// Configuration de l'API selon l'environnement
const getApiBaseUrl = () => {
  // En développement local
  if (__DEV__) {
    // Récupère l'IP de l'ordinateur qui fait tourner Metro (ex: 192.168.1.29:8081)
    const debuggerHost = Constants.expoConfig?.hostUri;
    
    // On extrait juste l'IP (on enlève le port :8081)
    const localhost = debuggerHost?.split(':').shift();
    
    if (localhost) {
      // On utilise l'IP trouvée avec ton port d'API (8083)
      return `http://${localhost}:8083/api`;
    }
    
    // Fallback si on ne trouve pas l'IP
    return 'http://localhost:8083/api';
  }

  // En production (remplacez par votre vraie URL)
  return 'https://cookeat.info/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const WS_URL = API_BASE_URL
  .replace(/^http/, 'ws')
  .replace(/\/api$/, '/ws');