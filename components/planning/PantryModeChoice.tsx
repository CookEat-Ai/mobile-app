import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme } from '../../constants/AppTheme';
export function PantryModeChoice({ value, onChange, disabled = false }: { value: 'priority' | 'strict'; onChange: (value: 'priority' | 'strict') => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return <View style={styles.options}>{(['priority', 'strict'] as const).map(mode => <Pressable key={mode} accessibilityRole="radio" accessibilityState={{ checked: value === mode, disabled }} disabled={disabled} style={[styles.option, value === mode && styles.selected]} onPress={() => onChange(mode)}><Text style={styles.text}>{t(`planningPantry.${mode}`)}</Text><Ionicons name={value === mode ? 'radio-button-on' : 'radio-button-off'} size={22} color={theme.ink} /></Pressable>)}</View>;
}
const styles = StyleSheet.create({ options: { gap: 8 }, option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 52, borderWidth: 1, borderColor: theme.line, borderRadius: 14 }, selected: { borderColor: theme.yellow, backgroundColor: theme.yellowSoft }, text: { flex: 1, fontFamily: 'CronosProBold', fontSize: 15, color: theme.ink } });
