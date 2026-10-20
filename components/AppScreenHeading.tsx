import { AppTheme as designTheme, appStyles } from '../constants/AppTheme';
import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useResponsive } from '../hooks/useResponsive';

/** Same title typography as Planning and the shopping list. */
export function AppScreenHeading({ title, subtitle, action, showAppLogo = false, compact = false, tone = 'default' }: {
  title: string; subtitle?: string; action?: React.ReactNode; showAppLogo?: boolean; compact?: boolean; tone?: 'default' | 'light';
}) {
  const { font } = useResponsive();
  return <View style={[styles.container, compact && styles.compact]}>
    <View style={styles.row}>
      <View style={styles.titleGroup}>
        <Text accessibilityRole="header" style={[appStyles.headerTitle, styles.title, { fontSize: font(29) }, tone === 'light' && { color: designTheme.onPrimary }]}>{title}</Text>
        {showAppLogo ? <Image source={require('../assets/images/mascot.png')} style={styles.logo} contentFit="contain" accessible={false} /> : null}
      </View>
      {action}
    </View>
    {subtitle ? <Text style={[appStyles.subtitle, styles.subtitle]}>{subtitle}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  compact: { marginBottom: 0 },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  title: { flexShrink: 1 },
  logo: { width: 52, height: 52, transform: [{ rotate: '20deg' }] },
  subtitle: { marginTop: 8 },
});
