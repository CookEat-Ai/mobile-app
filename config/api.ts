import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import { PUBLIC_ENV } from './env';

const API_PORT = 8083;

/**
 * Hôte du serveur Metro *tel que l'appareil le voit*, ou `null`.
 *
 * L'URL du bundle est la seule source fiable sur un build `expo run:ios/android`
 * sans `expo-dev-client` : `Constants.expoConfig.hostUri` provient alors du
 * manifeste embarqué à la compilation et ne contient aucune IP. Sur un appareil
 * physique, se rabattre sur `localhost` désigne le téléphone lui-même.
 */
const getMetroHost = (): string | null => {
  // En dev le bundle est servi par Metro (http://192.168.x.x:8081/index.bundle…).
  // En production c'est un `file://` : le motif ne matche pas et on renvoie null.
  //
  // Deux accès plutôt qu'un : sous la New Architecture `SourceCode` est un
  // TurboModule et le proxy `NativeModules` n'expose pas systématiquement ses
  // constantes. `getDevServer` est l'helper interne dont dépendent LogBox et le
  // HMR, donc disponible dans les deux modes.
  let scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;

  if (!scriptURL) {
    try {
      scriptURL = require('react-native/Libraries/Core/Devtools/getDevServer').default().url;
    } catch {
      // Chemin interne : absent après une montée de version majeure de RN.
      // Les branches suivantes prennent le relais.
    }
  }

  const fromBundle = scriptURL?.match(/^https?:\/\/([^/:]+)/)?.[1];
  if (fromBundle && fromBundle !== 'localhost' && fromBundle !== '127.0.0.1') return fromBundle;

  // Expo Go et dev-client renseignent l'hôte dans le manifeste servi à chaud.
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  return debuggerHost?.split(':').shift() ?? null;
};

const getApiBaseUrl = (): string => {
  if (!__DEV__) {
    if (!PUBLIC_ENV.apiUrl) {
      throw new Error('[config] EXPO_PUBLIC_API_URL est obligatoire hors développement.');
    }
    return PUBLIC_ENV.apiUrl.replace(/\/+$/, '');
  }

  // Échappatoire manuelle (fichier .env, non versionné). Volontairement ignorée
  // hors dev : un .env oublié ne doit pas pouvoir détourner un build de release.
  const override = PUBLIC_ENV.apiUrl;
  if (override) return override.replace(/\/+$/, '');

  const host = getMetroHost();
  if (host) return `http://${host}:${API_PORT}/api`;

  // Dernier recours : le simulateur iOS partage la pile réseau du Mac,
  // l'émulateur Android l'atteint via 10.0.2.2. Faux sur un appareil physique,
  // d'où le log ci-dessous.
  return `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:${API_PORT}/api`;
};

export const API_BASE_URL = getApiBaseUrl();

export const WS_URL = API_BASE_URL
  .replace(/^http/, 'ws')
  .replace(/\/api$/, '/ws');

if (__DEV__) {
  const detected = getMetroHost();
  console.log(
    `[api] base=${API_BASE_URL} (metro=${detected ?? 'non détecté'}` +
      `${PUBLIC_ENV.apiUrl ? ', override .env actif' : ''})`,
  );

  if (!detected) {
    console.warn(
      "[api] Hôte Metro introuvable : l'app vise la machine locale, ce qui échoue " +
        'sur un appareil physique. Définir EXPO_PUBLIC_API_URL dans mobileapp/.env.',
    );
  } else if (/\.(exp\.direct|ngrok\.[a-z]+|trycloudflare\.com)$/.test(detected)) {
    console.warn(
      `[api] Metro passe par un tunnel (${detected}) qui ne relaie que le port 8081. ` +
        `Le port ${API_PORT} sera injoignable : définir EXPO_PUBLIC_API_URL.`,
    );
  }
}
