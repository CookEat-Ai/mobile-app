import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { SymbolWeight } from 'expo-symbols';

/** Legacy names resolve to the same Ionicons glyph on iOS and Android. */
export const ICON_ALIASES = {
  'wheel.fill': 'refresh-circle', 'wheel': 'refresh-circle-outline',
  'gift.fill': 'gift', 'house': 'home-outline', 'house.fill': 'home',
  'paperplane.fill': 'send', 'search': 'search-outline', 'search.fill': 'search', 'magnifyingglass': 'search-outline',
  'heart': 'heart-outline', 'heart.fill': 'heart', 'settings': 'settings-outline', 'settings.fill': 'settings',
  'person': 'person-outline', 'person.fill': 'person', 'plus': 'add', 'plus.fill': 'add',
  'camera': 'camera-outline', 'camera.fill': 'camera', 'archivebox': 'archive-outline',
  'crown.fill': 'ribbon', 'sparkles': 'sparkles-outline', 'clock': 'time-outline',
  'list.bullet': 'list-outline', 'checklist': 'checkbox-outline', 'chevron.left': 'chevron-back',
  'checkmark': 'checkmark', 'close': 'close', 'xmark': 'close', 'flip.camera': 'camera-reverse-outline',
  'chevron-forward': 'chevron-forward', 'chevron.right': 'chevron-forward', 'slider.horizontal.3': 'options-outline',
  'trash': 'trash-outline', 'arrow.right': 'arrow-forward', 'arrow_forward': 'arrow-forward',
  'help': 'help-circle-outline', 'square.and.arrow.down': 'download-outline', 'square.and.arrow.down.fill': 'download',
  'bell': 'notifications-outline', 'notifications': 'notifications-outline', 'envelope': 'mail-outline',
  'globe': 'globe-outline', 'pricetag': 'pricetag-outline', 'doc.text': 'document-text-outline',
  'star': 'star-outline', 'star.fill': 'star', 'time': 'time-outline', 'timer': 'timer-outline',
  'microphone': 'mic-outline', 'microphone.slash': 'mic-off-outline',
} as const satisfies Record<string, React.ComponentProps<typeof Ionicons>['name']>;
export function IconSymbol({ name, size = 24, color, style }: {
  name: keyof typeof ICON_ALIASES; size?: number; color: React.ComponentProps<typeof Ionicons>['color'];
  style?: React.ComponentProps<typeof Ionicons>['style']; weight?: SymbolWeight;
}) {
  const icon = ICON_ALIASES[name];
  if (!icon) return null;
  return <Ionicons name={icon} size={size} color={color} style={style} accessible={false} importantForAccessibility="no" />;
}
