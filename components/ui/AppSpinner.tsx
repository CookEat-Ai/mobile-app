import React from 'react';
import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';
import { AppTheme } from '../../constants/AppTheme';

/** All loading states use the tracking screen's orange indicator. */
export function AppSpinner({ color, style, ...props }: ActivityIndicatorProps) {
  const onAccent = color === AppTheme.onPrimary || color === 'white' || color === '#fff' || color === '#ffffff';
  return <ActivityIndicator {...props} color={AppTheme.yellow} style={[style, onAccent && { backgroundColor: AppTheme.surface, borderRadius: 24, padding: 4 }]} />;
}
