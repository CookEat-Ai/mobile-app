import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * Doit rester aligné sur `SUPPORTED_URL_PATTERNS` côté API
 * (`api/src/services/video-import-service.ts`) : une liste plus restrictive ici
 * ferait rejeter des liens que le serveur sait pourtant traiter, une liste plus
 * large enverrait l'utilisateur attendre une analyse vouée à échouer.
 */
const SUPPORTED_HOSTS = [
  'tiktok.com',
  'instagram.com',
  'youtube.com',
  'youtu.be',
  'facebook.com',
  'x.com',
  'twitter.com',
];

/**
 * Capture l'URL et son hôte en un passage. On n'utilise pas `new URL()` :
 * l'implémentation de React Native est partielle et `hostname` n'y est pas fiable.
 */
const URL_WITH_HOST = /https?:\/\/([^\s/?#<>"']+)[^\s<>"']*/i;

function hostIsSupported(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^www\./, '');
  return SUPPORTED_HOSTS.some(
    (supported) => normalized === supported || normalized.endsWith(`.${supported}`)
  );
}

/**
 * Extrait la première URL de plateforme supportée d'un texte libre.
 * On extrait au lieu de valider la chaîne entière car les partages TikTok et
 * Instagram collent la légende *et* le lien (« Regarde cette recette 😍 https://... »).
 */
export function extractVideoUrl(text?: string | null): string | null {
  if (!text) return null;

  const match = text.match(URL_WITH_HOST);
  if (!match) return null;

  // Ponctuation collée en fin de lien quand il est pris dans une phrase.
  const url = match[0].replace(/[.,;:!?)\]]+$/, '');
  return hostIsSupported(match[1]) ? url : null;
}

export function isSupportedVideoUrl(text?: string | null): boolean {
  return extractVideoUrl(text) !== null;
}

/**
 * Indique s'il y a probablement un lien à importer, pour décider d'afficher ou
 * non un CTA d'import à quelqu'un qui n'est pas venu pour ça.
 *
 * On n'utilise volontairement pas `hasStringAsync()` : il est vrai dès qu'un
 * texte quelconque est dans le presse-papier, ce qui reviendrait à afficher en
 * permanence un CTA sur lequel l'utilisateur ne peut rien faire.
 *
 * - iOS : `hasUrlAsync()` détecte une URL sans exposer le contenu, donc sans
 *   déclencher la bannière système « collé depuis … ».
 * - Android : l'API est iOS-only, on lit et on valide (Android 12+ affiche sa
 *   propre notification de lecture, au bénéfice d'une détection exacte).
 */
export async function clipboardMayHoldLink(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') return await Clipboard.hasUrlAsync();
    return (await readVideoUrlFromClipboard()) !== null;
  } catch {
    // Presse-papier indisponible (permission, plateforme) : on n'affiche rien.
    return false;
  }
}

/** Lit le presse-papier et renvoie l'URL supportée qu'il contient, s'il y en a une. */
export async function readVideoUrlFromClipboard(): Promise<string | null> {
  // `getUrlAsync` est iOS-only : sans ce garde, l'exception sur Android
  // empêcherait d'atteindre la lecture texte, seule disponible là-bas.
  if (Platform.OS === 'ios') {
    try {
      const fromUrl = extractVideoUrl(await Clipboard.getUrlAsync());
      if (fromUrl) return fromUrl;
    } catch {
      // iOS 16+ peut refuser l'accès : on tente la lecture texte ci-dessous.
    }
  }

  try {
    return extractVideoUrl(await Clipboard.getStringAsync());
  } catch {
    return null;
  }
}
