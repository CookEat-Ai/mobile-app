import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { PantryReviewSection } from './PantryReviewSection';
import { PANTRY_SCAN_HANDOFF_KEY, readPantryScanHandoff } from '../../services/pantryScanHandoff';
import analytics from '../../services/analytics';
import { normalizePantryIngredients } from '../../services/planningPantry';
export type PlanningPantryValue = { pantryIngredients: string[]; pantryMode: 'priority' | 'strict' };

export function PlanningPantry({ value, onChange, onConfirm, active }: {
  value: PlanningPantryValue; onChange: (value: PlanningPantryValue) => void; onConfirm: (value: PlanningPantryValue) => void; active: boolean;
}) {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const latest = useRef({ value, onConfirm }); latest.current = { value, onConfirm };
  useFocusEffect(useCallback(() => {
    if (!active) return;
    let mounted = true;
    void AsyncStorage.getItem(PANTRY_SCAN_HANDOFF_KEY).then(async raw => {
      if (!raw || !mounted) return;
      const handoff = readPantryScanHandoff(raw);
      await AsyncStorage.removeItem(PANTRY_SCAN_HANDOFF_KEY);
      if (!mounted) return;
      const current = latest.current;
      current.onConfirm({ pantryMode: handoff.pantryMode || current.value.pantryMode, pantryIngredients: handoff.replace ? handoff.ingredients : normalizePantryIngredients([...current.value.pantryIngredients, ...handoff.ingredients]) });
    }).catch(() => { if (mounted) setError(t('planningPantry.scanError')); });
    return () => { mounted = false; };
  }, [active, t]));
  const scan = () => { setError(''); void analytics.track('planning_pantry_started', { source: 'scan' }).catch(() => undefined); router.push({ pathname: '/camera', params: { planningPantry: 'true', initialMode: 'photo', mode: 'append' } }); };
  const manual = () => { setError(''); void analytics.track('planning_pantry_started', { source: 'manual' }).catch(() => undefined); router.push({ pathname: '/planning/ingredients', params: { ingredients: JSON.stringify(value.pantryIngredients) } }); };
  return <View style={styles.card}>
    {!value.pantryIngredients.length && <><Pressable accessibilityRole="button" style={styles.method} onPress={scan}>
      <Text accessible={false} style={styles.emoji}>📸</Text><Text style={styles.text}>{t('planningFlow.scanFridge')}</Text><Ionicons name="chevron-forward" size={20} color={theme.muted} />
    </Pressable>
    <Pressable accessibilityRole="button" style={styles.method} onPress={manual}><Text accessible={false} style={styles.emoji}>🧺</Text><Text style={styles.text}>{t('pantry.title')}</Text><Ionicons name="chevron-forward" size={20} color={theme.muted} /></Pressable></>}
    {!!value.pantryIngredients.length && <PantryReviewSection ingredients={value.pantryIngredients} onChange={pantryIngredients => onChange({ ...value, pantryIngredients })} />}
    {!!value.pantryIngredients.length && <Pressable accessibilityRole="button" style={styles.scanAgain} onPress={scan}><Text style={appStyles.textAction}>📸 {t('planningFlow.scanFridge')}</Text></Pressable>}
    {!!error && <Text accessibilityRole="alert" style={appStyles.error}>{error}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  card: { gap: 14 },
  scanAgain: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  method: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, minHeight: 96, borderWidth: 1, borderColor: theme.line, borderRadius: 20, backgroundColor: theme.surface },
  emoji: { fontSize: 40, width: 52, textAlign: 'center' },
  text: { ...appStyles.textAction, fontSize: 23, lineHeight: 27, flex: 1 },
});
