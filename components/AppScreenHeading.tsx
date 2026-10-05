import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { appStyles } from '../constants/AppTheme';
import { useResponsive } from '../hooks/useResponsive';

/** Same title typography as Planning and the shopping list. */
export function AppScreenHeading({ title, subtitle, action, showAppLogo = false }: {
  title: string; subtitle?: string; action?: React.ReactNode; showAppLogo?: boolean;
}) {
  const { font } = useResponsive();
  return <View style={styles.container}>
    <View style={styles.row}>
      <View style={styles.titleGroup}>
        <Text accessibilityRole="header" style={[appStyles.headerTitle, styles.title, { fontSize: font(29) }]}>{title}</Text>
        {showAppLogo ? <Image source={require('../assets/images/mascot.png')} style={styles.logo} contentFit="contain" accessible={false} /> : null}
      </View>
      {action}
    </View>
    {subtitle ? <Text style={[appStyles.subtitle, styles.subtitle]}>{subtitle}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  title: { flexShrink: 1 },
  logo: { width: 52, height: 52, transform: [{ rotate: '20deg' }] },
  subtitle: { marginTop: 8 },
});
