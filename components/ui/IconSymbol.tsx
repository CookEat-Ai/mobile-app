import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, SymbolWeight } from 'expo-symbols';
import { Platform } from 'react-native';

// Mapping pour MaterialIcons (Android/Web) et SF Symbols (iOS)
const MAPPING = {
  'house': { ios: 'house', android: 'home' },
  'house.fill': { ios: 'house.fill', android: 'home' },
  'paperplane.fill': { ios: 'paperplane.fill', android: 'send' },
  'search': { ios: 'magnifyingglass', android: 'search' },
  'search.fill': { ios: 'magnifyingglass', android: 'search' },
  'heart': { ios: 'heart', android: 'favorite-border' },
  'heart.fill': { ios: 'heart.fill', android: 'favorite' },
  'settings': { ios: 'gearshape', android: 'settings' },
  'settings.fill': { ios: 'gearshape.fill', android: 'settings' },
  'person': { ios: 'person', android: 'person-outline' },
  'person.fill': { ios: 'person.fill', android: 'person' },
  'plus': { ios: 'plus', android: 'add' },
  'plus.fill': { ios: 'plus.fill', android: 'add' },
  'camera': { ios: 'camera', android: 'camera-alt' },
  'camera.fill': { ios: 'camera.fill', android: 'camera-alt' },
  'archivebox': { ios: 'archivebox.fill', android: 'inventory' },
    'crown.fill': { ios: 'crown.fill', android: 'workspace-premium' },
  'sparkles': { ios: 'sparkles', android: 'auto-fix-high' },
  'clock': { ios: 'clock', android: 'access-time' },
  'list.bullet': { ios: 'list.bullet', android: 'list' },
  'checklist': { ios: 'checklist', android: 'checklist' },
  'chevron.left': { ios: 'chevron.left', android: 'chevron-left' },
  'checkmark': { ios: 'checkmark', android: 'check' },
  'close': { ios: 'xmark', android: 'close' },
  'flip.camera': { ios: 'camera.rotate', android: 'flip-camera-ios' },
  'chevron-forward': { ios: 'chevron.right', android: 'chevron-right' },
  'slider.horizontal.3': { ios: 'slider.horizontal.3', android: 'tune' },
  'trash': { ios: 'trash', android: 'delete' },
  'arrow.right': { ios: 'arrow.right', android: 'arrow-forward' },
  'arrow_forward': { ios: 'arrow.right', android: 'arrow-forward' },
  'help': { ios: 'questionmark.circle', android: 'help-outline' },
  'square.and.arrow.down': { ios: 'square.and.arrow.down', android: 'file-download' },
  'square.and.arrow.down.fill': { ios: 'square.and.arrow.down.fill', android: 'file-download' },
} as const;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight,
}: {
  name: keyof typeof MAPPING;
  size?: number;
  color: any;
  style?: any;
  weight?: SymbolWeight;
}) {
  const icon = MAPPING[name];
  if (!icon) return null;

  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={icon.ios}
        size={size}
        tintColor={color}
        style={[{ width: size, height: size }, style]}
        weight={weight}
      />
    );
  } else {
    return <MaterialIcons color={color} size={size} name={icon.android as any} style={style} />;
  }
}
