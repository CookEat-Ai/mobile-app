import { feedback } from '../services/haptics';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppTheme, AppControl, appStyles } from '../constants/AppTheme';

/** One geometry for back, close and image-overlay actions across both platforms. */
export function NavigationIconButton({ kind = 'back', icon, tone = 'surface', iconColor, loading = false, onPress, style, accessibilityLabel, accessibilityState, disabled, ...props }: TouchableOpacityProps & {
  kind?: 'back' | 'close';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  tone?: 'surface' | 'overlay' | 'primary';
  iconColor?: string;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const foreground = iconColor || (tone === 'surface' ? AppTheme.ink : AppTheme.onPrimary);
  const unavailable = !!(disabled || loading);
  return <TouchableOpacity {...props} onPress={event => { if (onPress && !icon) feedback.light(); onPress?.(event); }} disabled={unavailable} activeOpacity={0.75} accessibilityRole="button"
    accessibilityState={{ ...accessibilityState, disabled: unavailable, busy: loading }}
    accessibilityLabel={accessibilityLabel || t(kind === 'back' ? 'common.back' : 'common.close')}
    style={[style, appStyles.iconButton, styles[tone], styles.flat, unavailable && styles.disabled]}>
    {loading ? <ActivityIndicator size="small" color={foreground} />
      : <Ionicons accessible={false} importantForAccessibility="no" name={icon || (kind === 'back' ? 'chevron-back' : 'close')} size={AppControl.icon} color={foreground} />}
  </TouchableOpacity>;
}
const styles = StyleSheet.create({
  surface: { backgroundColor: AppTheme.surface, borderColor: AppTheme.line },
  overlay: { backgroundColor: AppTheme.mediaControl, borderColor: AppTheme.mediaControlBorder },
  primary: { backgroundColor: AppTheme.yellow, borderColor: AppTheme.yellow },
  flat: { padding: 0, flexShrink: 0, shadowOpacity: 0, elevation: 0 },
  disabled: { opacity: AppControl.disabledOpacity },
});
