import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppRadii, AppTheme } from '../constants/AppTheme';
import { AppSpinner } from './ui/AppSpinner';

/** The same photo action for meal tracking and ingredient/fridge capture. */
export function CameraShutterButton({ onPress, accessibilityLabel, busy = false, disabled = false }: {
  onPress: () => void;
  accessibilityLabel: string;
  busy?: boolean;
  disabled?: boolean;
}) {
  const unavailable = busy || disabled;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled: unavailable, busy }} disabled={unavailable} onPress={onPress}
    style={[styles.shutter, unavailable && styles.disabled]}>
    {busy ? <AppSpinner color={AppTheme.onPrimary} /> : <Ionicons name="camera" size={32} color={AppTheme.onPrimary} />}
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  shutter: { height: 78, width: 78, borderRadius: AppRadii.pill, borderWidth: 5, borderColor: 'rgba(255,255,255,.65)', backgroundColor: AppTheme.yellow, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: .45 },
});
