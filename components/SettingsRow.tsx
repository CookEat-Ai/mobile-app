import { feedback } from '../services/haptics';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppTheme as theme } from '../constants/AppTheme';

export function SettingsRow({ icon, title, description, onPress, destructive = false }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; title: string; description?: string;
  onPress: () => void; destructive?: boolean;
}) {
  const color = destructive ? '#B44336' : theme.ink;
  return <TouchableOpacity accessibilityRole="button" onPress={() => { feedback.light(); onPress(); }} activeOpacity={0.75} style={styles.row}>
    <View style={[styles.icon, destructive && styles.destructive]}><Ionicons name={icon} size={22} color={destructive ? color : theme.yellow} /></View>
    <View style={styles.copy}>
      <Text style={[styles.title, { color }]}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
    <Ionicons name="chevron-forward" size={20} color={theme.muted} />
  </TouchableOpacity>;
}
const styles = StyleSheet.create({
  row: { minHeight: 72, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 14, backgroundColor: theme.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  destructive: { backgroundColor: '#FFF1EE' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: 'Degular', fontSize: 19, lineHeight: 23 },
  description: { fontFamily: 'CronosPro', fontSize: 14, lineHeight: 19, color: theme.muted, marginTop: 3 },
});
