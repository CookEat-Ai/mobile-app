import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppTheme as theme, AppRadii } from '../../constants/AppTheme';

/** Functional feature badges share their container and icon contrast. */
export function AppIconBadge({ name, size = 44, tone = 'accent', style }: {
  name: React.ComponentProps<typeof Ionicons>['name']; size?: number;
  tone?: 'accent' | 'soft' | 'danger'; style?: StyleProp<ViewStyle>;
}) {
  return <View accessible={false} style={[style, styles.badge, { width: size, height: size, borderRadius: size > 54 ? AppRadii.card : AppRadii.control, backgroundColor: tone === 'accent' ? theme.yellow : tone === 'danger' ? theme.dangerSoft : theme.yellowSoft }]}>
    <Ionicons name={name} size={size > 54 ? 30 : 22} color={tone === 'accent' ? theme.onPrimary : tone === 'danger' ? theme.danger : theme.ink} accessible={false} importantForAccessibility="no" />
  </View>;
}
const styles = StyleSheet.create({ badge: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' } });
