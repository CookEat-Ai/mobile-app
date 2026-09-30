import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appStyles } from '../constants/AppTheme';
import { useResponsive } from '../hooks/useResponsive';

/** Same title typography as Planning and the shopping list. */
export function AppScreenHeading({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  const { font } = useResponsive();
  return <View style={styles.container}>
    <View style={styles.row}>
      <Text accessibilityRole="header" style={[appStyles.headerTitle, styles.title, { fontSize: font(29) }]}>{title}</Text>
      {action}
    </View>
    {subtitle ? <Text style={[appStyles.subtitle, styles.subtitle]}>{subtitle}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1 },
  subtitle: { marginTop: 8 },
});
