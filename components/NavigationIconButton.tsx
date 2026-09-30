import { feedback } from '../services/haptics';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppTheme, appStyles } from '../constants/AppTheme';

/** Shared geometry for navigation and image-overlay actions. */
export function NavigationIconButton({ kind = 'back', icon, iconColor = AppTheme.ink, loading = false, onPress, style, accessibilityLabel, accessibilityState, disabled, ...props }: TouchableOpacityProps & {
  kind?: 'back' | 'close';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  return <TouchableOpacity {...props} onPress={event => { if (onPress && !icon) feedback.light(); onPress?.(event); }} disabled={disabled || loading} activeOpacity={0.75} accessibilityRole="button"
    accessibilityState={{ ...accessibilityState, disabled: !!(disabled || loading), busy: loading }}
    accessibilityLabel={accessibilityLabel || t(kind === 'back' ? 'common.back' : 'common.close')}
    style={[style, appStyles.iconButton, styles.flat, disabled && styles.disabled]}>
    {loading ? <ActivityIndicator size="small" color={iconColor} />
      : <Ionicons name={icon || (kind === 'back' ? 'chevron-back' : 'close')} size={24} color={iconColor} />}
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  flat: { shadowOpacity: 0, elevation: 0 },
  disabled: { opacity: 0.5 },
});
