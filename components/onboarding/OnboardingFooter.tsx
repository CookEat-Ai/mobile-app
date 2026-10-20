import { AppSpinner as ActivityIndicator } from '../ui/AppSpinner';
import { useResponsive } from '../../hooks/useResponsive';
import { AppTheme as designTheme, AppRadii } from '../../constants/AppTheme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { FORM_CONTENT_MAX_WIDTH, ONBOARDING_CTA_BOTTOM_GAP } from '../../constants/Layout';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  backgroundColor?: string;
};

/**
 * Socle commun à tout l'onboarding. Le bouton conserve ainsi exactement la
 * même hauteur et le même écart au bord inférieur sur chaque écran.
 */
export function OnboardingFooter({
  label,
  onPress,
  disabled = false,
  loading = false,
  backgroundColor = designTheme.background,
}: Props) {
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();

  return (
    <View style={[styles.footer, { paddingHorizontal: Math.max(24, gutter), paddingBottom: insets.bottom + ONBOARDING_CTA_BOTTOM_GAP, backgroundColor }]}>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.82}
        disabled={disabled || loading}
        onPress={onPress}
        style={[styles.button, (disabled || loading) && styles.disabled]}
      >
        {loading ? <ActivityIndicator color={designTheme.onPrimary} /> : <Text style={styles.label}>{label}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  button: {
    width: '100%',
    maxWidth: FORM_CONTENT_MAX_WIDTH - 48,
    minHeight: 56,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AppRadii.pill,
    backgroundColor: Colors.light.button,
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabled: { opacity: 0.58 },
  label: { color: designTheme.onPrimary, fontFamily: 'Degular', fontSize: 20 },
});
