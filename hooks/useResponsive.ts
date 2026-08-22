import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { buildResponsiveInfo, CONTENT_MAX_WIDTH, ResponsiveInfo } from '../constants/Layout';

/**
 * Infos de mise en page réactives : suit la rotation, le Split View iPad et le
 * multi-fenêtre Android, contrairement à un `Dimensions.get('window')` lu à
 * l'import.
 */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  return useMemo(() => buildResponsiveInfo({ width, height }), [width, height]);
}

/**
 * Style d'une colonne de contenu : pleine largeur sur téléphone, largeur
 * plafonnée et centrée sur tablette.
 */
export const contentColumn = (maxWidth: number = CONTENT_MAX_WIDTH) =>
  ({
    width: '100%',
    maxWidth,
    alignSelf: 'center',
  }) as const;
