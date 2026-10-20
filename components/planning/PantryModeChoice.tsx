import { FORM_CONTENT_MAX_WIDTH } from '../../constants/Layout';
import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export function PantryModeChoice({ value, onChange, disabled = false }: { value: 'priority' | 'strict' | null; onChange: (value: 'priority' | 'strict') => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return <View style={styles.options}>
    <Text accessibilityRole="header" style={[appStyles.title, styles.question]}>{t('planningPantry.completeQuestion')}</Text>
    {(['priority', 'strict'] as const).map(mode => <Pressable key={mode} accessibilityRole="radio" accessibilityLabel={t(`planningPantry.${mode}`)} accessibilityState={{ checked: value === mode, disabled }} disabled={disabled} style={[styles.option, value === mode && styles.selected, disabled && styles.disabled]} onPress={() => onChange(mode)}><Text accessible={false} style={styles.emoji}>{mode === 'priority' ? '🛒' : '🥕'}</Text><Text style={styles.text}>{t(`planningPantry.${mode}`)}</Text><Ionicons name="arrow-forward" size={22} color={theme.ink} /></Pressable>)}
  </View>;
}
const styles = StyleSheet.create({ options: { gap: 10, width: '100%', maxWidth: FORM_CONTENT_MAX_WIDTH, alignSelf: 'center' }, question: { marginBottom: 18 }, option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 64, borderWidth: 1, borderColor: theme.line, borderRadius: AppRadii.control, backgroundColor: theme.surface }, selected: { borderColor: theme.yellow, backgroundColor: theme.yellowSoft }, emoji: { fontSize: 30 }, text: { flex: 1, fontFamily: 'Degular', fontSize: 20, lineHeight: 23, color: theme.ink }, disabled: { opacity: 0.45 } });
