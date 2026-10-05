import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme } from '../constants/AppTheme';
export function ServingsControl({ value, onChange, disabled = false, compact = false }: { value: number; onChange: (value: number) => void; disabled?: boolean; compact?: boolean }) {
  const { t } = useTranslation();
  return <View style={[styles.row, compact && { gap: 0 }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('planningConfig.fewerPeople')} disabled={disabled || value <= 1} style={[styles.button, compact && { minWidth: 32 }, (disabled || value <= 1) && styles.disabled]} onPress={() => onChange(value - 1)}><Ionicons name="remove" size={20} color={theme.ink} /></Pressable>
    <Text accessibilityLiveRegion="polite" style={[styles.value, compact && { minWidth: 22 }]}>{value}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={t('planningConfig.morePeople')} disabled={disabled || value >= 20} style={[styles.button, compact && { minWidth: 32 }, (disabled || value >= 20) && styles.disabled]} onPress={() => onChange(value + 1)}><Ionicons name="add" size={20} color={theme.ink} /></Pressable>
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }, button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.yellowSoft }, value: { minWidth: 28, textAlign: 'center', fontFamily: 'CronosProBold', fontSize: 22, color: theme.ink }, disabled: { opacity: 0.4 } });
