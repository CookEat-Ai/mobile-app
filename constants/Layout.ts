/**
 * Socle responsive de l'app.
 *
 * Deux problèmes que ce module résout :
 *
 * 1. Les écrans dimensionnaient tout à partir de `Dimensions.get('window')` lu au
 *    niveau du module, donc figé au premier import. Sur iPad (rotation, Split View,
 *    Stage Manager) et sur Android en multi-fenêtre, les valeurs devenaient fausses.
 * 2. Les tailles étaient proportionnelles à la largeur réelle (`width * 0.15`).
 *    Sur un iPad de 1024pt ça donnait des titres de 150pt et des emojis de 512pt.
 *
 * La réponse est la notion de *largeur de mise en page* : la largeur de la fenêtre
 * plafonnée à CONTENT_MAX_WIDTH. Sur téléphone elle vaut la largeur réelle (donc
 * aucun changement de rendu), sur tablette elle se stabilise à la largeur d'un grand
 * téléphone et le contenu est simplement centré.
 *
 * Utiliser `useResponsive()` dans les composants (réagit à la rotation).
 * Les helpers statiques (`rw`, `font`, `space`) restent disponibles pour les
 * `StyleSheet.create` où un hook n'est pas possible ; ils s'appuient sur la
 * dernière taille de fenêtre connue.
 */
import { Dimensions, PixelRatio, Platform, ScaledSize } from 'react-native';

/** Largeur de référence du design : iPhone 13 / 14 / 15 (390pt). */
export const BASE_WIDTH = 390;
/** Hauteur de référence du design : iPhone 13 / 14 / 15 (844pt). */
export const BASE_HEIGHT = 844;

export const BREAKPOINTS = {
  /** iPhone SE 1re gén., petits Android (<= 360pt). */
  smallPhone: 360,
  /** iPhone SE 2/3, iPhone 13 mini (<= 375pt). */
  compactPhone: 375,
  /** iPhone Pro Max, grands Android. */
  largePhone: 414,
  /** iPad mini portrait et au-delà. */
  tablet: 768,
} as const;

/**
 * Largeur maximale d'une colonne de contenu. Au-delà, on centre au lieu d'étirer :
 * une carte de 900pt de large est illisible, et les lignes de texte trop longues.
 */
export const CONTENT_MAX_WIDTH = 560;

/** Baseline commune des CTA principaux de l'onboarding, hors safe area. */
export const ONBOARDING_CTA_BOTTOM_GAP = 24;

/** Position verticale commune de la croix des paywalls, proche du coin écran. */
export function getPaywallCloseTopInset(safeAreaTop: number): number {
  return safeAreaTop >= 44
    ? Math.max(safeAreaTop - 24, 8)
    : Math.max(safeAreaTop - 6, 8);
}

/** Hauteur en dessous de laquelle on doit compacter le vertical (iPhone SE : 667pt). */
export const SHORT_SCREEN_HEIGHT = 700;

export type ResponsiveInfo = {
  /** Largeur réelle de la fenêtre. */
  width: number;
  /** Hauteur réelle de la fenêtre. */
  height: number;
  /** Largeur utilisée pour tout calcul proportionnel (plafonnée à CONTENT_MAX_WIDTH). */
  layoutWidth: number;
  isTablet: boolean;
  isSmallPhone: boolean;
  isCompactPhone: boolean;
  isLargePhone: boolean;
  /** Écran court : il faut réduire les marges verticales et les visuels. */
  isShortScreen: boolean;
  isLandscape: boolean;
  /** Marge horizontale d'écran recommandée. */
  gutter: number;
  /** Nombre de colonnes recommandé pour une grille de cartes. */
  columns: number;
  /** Proportion de la largeur de mise en page, arrondie au pixel physique. */
  rw: (fraction: number) => number;
  /** Proportion de la hauteur de fenêtre. */
  rh: (fraction: number) => number;
  /** Taille de police adaptée depuis la maquette 390pt. */
  font: (size: number) => number;
  /** Espacement adapté depuis la maquette 390pt. */
  space: (size: number) => number;
};

const round = (value: number) => PixelRatio.roundToNearestPixel(value);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Largeur de mise en page : largeur réelle sur téléphone, plafonnée sur tablette. */
export function getLayoutWidth(width: number): number {
  return Math.min(width, CONTENT_MAX_WIDTH);
}

/**
 * Facteur d'échelle typographique. Volontairement compressé (0.88 → 1.12) :
 * un texte ne doit pas doubler de taille entre un iPhone SE et un iPad, il doit
 * juste respirer un peu plus.
 */
export function getFontScale(width: number): number {
  const layoutWidth = getLayoutWidth(width);
  return clamp(layoutWidth / BASE_WIDTH, 0.88, 1.12);
}

/**
 * Facteur d'échelle des espacements. Un peu plus large que la typo car les marges
 * peuvent légitimement grandir sur tablette.
 */
export function getSpaceScale(width: number): number {
  const layoutWidth = getLayoutWidth(width);
  return clamp(layoutWidth / BASE_WIDTH, 0.86, 1.2);
}

export function getGutter(width: number): number {
  if (width >= BREAKPOINTS.tablet) return 32;
  if (width <= BREAKPOINTS.smallPhone) return 16;
  return 20;
}

export function getColumns(width: number): number {
  if (width >= 1024) return 3;
  if (width >= BREAKPOINTS.tablet) return 2;
  return 1;
}

export function buildResponsiveInfo(size: ScaledSize | { width: number; height: number }): ResponsiveInfo {
  const { width, height } = size;
  const layoutWidth = getLayoutWidth(width);
  const fontScale = getFontScale(width);
  const spaceScale = getSpaceScale(width);
  const shortestSide = Math.min(width, height);

  return {
    width,
    height,
    layoutWidth,
    // On se base sur le plus petit côté : un iPhone en paysage n'est pas une tablette.
    isTablet: shortestSide >= BREAKPOINTS.tablet,
    isSmallPhone: shortestSide <= BREAKPOINTS.smallPhone,
    isCompactPhone: shortestSide <= BREAKPOINTS.compactPhone,
    isLargePhone: shortestSide >= BREAKPOINTS.largePhone && shortestSide < BREAKPOINTS.tablet,
    isShortScreen: height < SHORT_SCREEN_HEIGHT,
    isLandscape: width > height,
    gutter: getGutter(width),
    columns: getColumns(width),
    rw: (fraction: number) => round(layoutWidth * fraction),
    rh: (fraction: number) => round(height * fraction),
    font: (size: number) => round(size * fontScale),
    space: (size: number) => round(size * spaceScale),
  };
}

/* -------------------------------------------------------------------------- */
/* API statique (pour StyleSheet.create)                                       */
/* -------------------------------------------------------------------------- */

let snapshot = buildResponsiveInfo(Dimensions.get('window'));

Dimensions.addEventListener('change', ({ window }) => {
  snapshot = buildResponsiveInfo(window);
});

/**
 * Dernière taille de fenêtre connue. Utile dans les `StyleSheet.create`, mais
 * préférer `useResponsive()` dès que le composant peut re-rendre : un StyleSheet
 * est évalué une seule fois et ne suivra pas une rotation.
 */
export const responsive = {
  get current() {
    return snapshot;
  },
};

/** Proportion de la largeur de mise en page. Remplace `width * fraction`. */
export const rw = (fraction: number) => snapshot.rw(fraction);
/** Proportion de la hauteur de fenêtre. */
export const rh = (fraction: number) => snapshot.rh(fraction);
/** Taille de police adaptée depuis la maquette 390pt. */
export const font = (size: number) => snapshot.font(size);
/** Espacement adapté depuis la maquette 390pt. */
export const space = (size: number) => snapshot.space(size);
/** Vrai sur iPad / tablette Android. */
export const isTabletDevice = () => snapshot.isTablet;

/**
 * Bloque la mise à l'échelle système du texte au-delà d'un facteur raisonnable.
 * Sans ça, un utilisateur en « Texte très grand » casse toutes les cartes à
 * hauteur fixe. À passer aux `<Text>` porteurs de mise en page.
 */
export const MAX_FONT_SIZE_MULTIPLIER = 1.3;

/**
 * Hauteur de la barre d'onglets, hors safe area.
 * Android n'a pas de home indicator : la safe area est ajoutée par l'appelant.
 */
export function getTabBarHeight(width: number, height: number): number {
  const info = buildResponsiveInfo({ width, height });
  if (info.isTablet) return 72;
  if (info.isShortScreen) return 56;
  return Platform.OS === 'ios' ? 64 : 60;
}
