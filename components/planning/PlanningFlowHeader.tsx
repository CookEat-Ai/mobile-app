import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTheme as theme } from '../../constants/AppTheme';
import { AppScreenHeading } from '../AppScreenHeading';
import { NavigationIconButton } from '../NavigationIconButton';
import { OnboardingProgressBar } from '../onboarding/OnboardingProgressBar';

/** The brand stays outside scrolling content throughout planning. */
export function PlanningFlowHeader({ onBack, onClose, closeDisabled = false, progress, caption, inset = true }: {
  onBack?: () => void; onClose?: () => void; closeDisabled?: boolean; progress?: number; caption?: string; inset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.root, {
    paddingTop: inset ? insets.top + 8 : 8,
    paddingLeft: 20 + insets.left,
    paddingRight: 20 + insets.right,
  }]}>
    <View style={styles.row}>
      {onBack && <NavigationIconButton onPress={onBack} />}
      <View style={styles.brand}><AppScreenHeading title="CookEat" showAppLogo compact action={caption ? <Text style={styles.caption}>{caption}</Text> : undefined} /></View>
      {onClose && <NavigationIconButton kind="close" onPress={onClose} disabled={closeDisabled} />}
    </View>
    {progress !== undefined && <View style={styles.progress}><OnboardingProgressBar progress={progress} /></View>}
  </View>;
}
const styles = StyleSheet.create({
  root: { backgroundColor: theme.background, paddingHorizontal: 20, paddingBottom: 14 },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  brand: { flex: 1 },
  caption: { flexShrink: 1, marginLeft: 'auto', fontFamily: 'CronosProBold', fontSize: 13, color: theme.muted },
  progress: { marginTop: 10 },
});
