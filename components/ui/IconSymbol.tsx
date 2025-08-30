import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, SymbolWeight } from 'expo-symbols';
import { Platform } from 'react-native';

// Mapping pour MaterialIcons (Android/Web)
const MAPPING = {
  'house': 'home',
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'search': 'search',
  'search.fill': 'search',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'plus.square': 'add-box-outline',
  'plus.square.fill': 'add-box',
  'square.grid.2x2': 'grid-view',
  'square.grid.2x2.fill': 'grid-view',
  'person': 'person-outline',
  'person.fill': 'person',
  'arrow.back': 'arrow-back',
  'time': 'access-time',
  'star': 'star',
  'star.fill': 'star',
  'star.outline': 'star-outline',
  'star-half': 'star-half',
  'restaurant': 'restaurant',
  'fast-food': 'fastfood',
  'wine': 'local-bar',
  'mic': 'microphone',
  'record-voice': 'record-voice',
  'pizza': 'local-pizza',
  'cafe': 'local-cafe',
  'ice-cream': 'icecream',
  'ellipsis-horizontal': 'more-horiz',
  'settings': 'settings',
  'notifications': 'notifications',
  'logout': 'logout',
  'edit': 'edit',
  'camera': 'camera-alt',
  'checkmark': 'check',
  'close': 'close',
  'chevron-forward': 'chevron-right',
} as const;

type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight,
}: {
  name: any;//IconSymbolName | SymbolViewProps['name'];
  size?: number;
  color: any;//string | OpaqueColorValue;
  style?: any;//StyleProp<TextStyle> | StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  if (Platform.OS === 'ios') {
    // Utiliser SF Symbols sur iOS
    return <SymbolView
      resizeMode="scaleAspectFit"
      name={name}
      size={size}
      tintColor={color}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]} weight={weight} />;
  } else {
    // Utiliser Material Icons sur Android et Web
    return <MaterialIcons color={color} size={size} name={MAPPING[name] as any} style={style} />;
  }
}
