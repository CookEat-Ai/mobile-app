import { AppSpinner as ActivityIndicator } from '../ui/AppSpinner';
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppRadii, AppTheme as theme, appStyles, NutritionColors } from '../../constants/AppTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { nutritionKeys, type FoodNutrition } from '../../services/mealTracking';

/** Carbs and fats are often missing from labels, so an empty field counts as 0. */
const optionalKeys = new Set<keyof FoodNutrition>(['carbs', 'fats']);

/** Draft strings keep empty fields and decimal commas editable without writing partial values. */
export function NutritionEditor({ initial, food, onApply }: {
  initial: FoodNutrition | null;
  food?: { name: string; grams: number };
  onApply: (nutrition: FoodNutrition, food?: { name: string; grams: number }) => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false), [error, setError] = useState(false);
  const busy = useRef(false);
  const { t } = useTranslation(), insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const [name, setName] = useState(food?.name || ''), [grams, setGrams] = useState(String(food?.grams || 100));
  const [draft, setDraft] = useState(() => Object.fromEntries(nutritionKeys.map(key => [key, initial ? String(Math.round(initial[key] * 100) / 100) : ''])) as Record<keyof FoodNutrition, string>);
  const parse = (raw: string) => /^\d+(?:[.,]\d*)?$/.test(raw.trim()) ? Number(raw.replace(',', '.')) : NaN;
  const values = Object.fromEntries(nutritionKeys.map(key => [key, optionalKeys.has(key) && !draft[key].trim() ? 0 : parse(draft[key])])) as FoodNutrition;
  const weight = parse(grams);
  const valid = nutritionKeys.every(key => Number.isFinite(values[key]) && values[key] >= 0 && values[key] <= 1000000) && (!food || (!!name.trim() && Number.isInteger(weight) && weight >= 1 && weight <= 2000 && nutritionKeys.every(key => values[key] * 100 / weight <= 1000000)));
  const apply = async () => {
    if (!valid || busy.current) return;
    busy.current = true; setSaving(true); setError(false);
    try { await onApply(values, food ? {name: name.trim(), grams: weight} : undefined); }
    catch { setError(true); }
    finally { busy.current = false; setSaving(false); }
  };
  const field = (key: keyof FoodNutrition) => <TextInput editable={!saving} accessibilityLabel={t(`tracking.${key}`)} value={draft[key]} onChangeText={raw => setDraft(current => ({...current, [key]: raw}))} keyboardType="decimal-pad" selectTextOnFocus maxLength={12} placeholder="0" placeholderTextColor={theme.muted} style={key === 'calories' ? styles.caloriesInput : styles.macroInput}/>;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, {paddingHorizontal: gutter, paddingBottom: insets.bottom + 24}]}>
      <Text style={styles.note}>{t(food ? 'tracking.portionNutritionNote' : 'tracking.mealNutritionNote')}</Text>
      {food && <View style={styles.card}>
        <View style={styles.row}><Text style={styles.label}>{t('tracking.foodName')}</Text><TextInput editable={!saving} accessibilityLabel={t('tracking.foodName')} value={name} onChangeText={setName} maxLength={100} style={styles.input}/></View>
        <View style={styles.divider}/>
        <View style={styles.row}><Text style={styles.label}>{t('tracking.portionGrams')}</Text><View style={styles.inline}><TextInput editable={!saving} accessibilityLabel={t('tracking.portionGrams')} value={grams} onChangeText={setGrams} keyboardType="number-pad" selectTextOnFocus style={[styles.input, {flex: 1}]}/><Text style={styles.unit}>g</Text></View></View>
      </View>}
      <View style={[styles.card, styles.calories]}>
        <View style={[styles.dot, {backgroundColor: NutritionColors.calories}]}/>
        <Text style={styles.label}>{t('tracking.calories')}</Text>
        <View style={styles.inline}>{field('calories')}<Text style={styles.caloriesUnit}>kcal</Text></View>
      </View>
      <View style={styles.macros}>{(['proteins', 'carbs', 'fats'] as const).map(key => <View key={key} style={[styles.card, styles.macro]}>
        <View style={[styles.dot, {backgroundColor: NutritionColors[key]}]}/>
        <Text style={styles.label} numberOfLines={1}>{t(`tracking.${key}`)}</Text>
        <View style={styles.inline}>{field(key)}<Text style={styles.unit}>g</Text></View>
        <Text style={styles.optional}>{optionalKeys.has(key) ? t('tracking.optional') : ' '}</Text>
      </View>)}</View>
      <Text style={styles.help}>{t('tracking.nutritionInputHelp')}</Text>
      {food && <Text style={styles.help}>{t('tracking.defaultNutritionNote')}</Text>}
      {error && <Text accessibilityRole="alert" style={appStyles.error}>{t('tracking.saveError')}</Text>}
      <TouchableOpacity accessibilityRole="button" disabled={!valid || saving} onPress={() => {void apply();}} style={[appStyles.button, (!valid || saving) && {opacity: .45}]}>{saving ? <ActivityIndicator color={theme.onPrimary}/> : <Text style={appStyles.buttonText}>{t('tracking.applyNutrition')}</Text>}</TouchableOpacity>
    </ScrollView>;
}

const shadow = {shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2};
const styles = StyleSheet.create({
  content: {paddingTop: 4, gap: 14},
  note: {...appStyles.subtitle, fontSize: 15, lineHeight: 21},
  card: {padding: 16, borderRadius: AppRadii.card, backgroundColor: theme.surface, ...shadow},
  row: {gap: 6},
  divider: {height: 1, backgroundColor: theme.line, marginVertical: 12},
  label: {fontFamily: 'CronosProBold', fontSize: 13, color: theme.muted},
  input: {minHeight: 44, paddingHorizontal: 14, borderRadius: AppRadii.control, backgroundColor: theme.cream, fontFamily: 'Degular', fontSize: 20, color: theme.ink},
  inline: {flexDirection: 'row', alignItems: 'baseline', gap: 6},
  unit: {fontFamily: 'CronosPro', fontSize: 15, color: theme.muted},
  dot: {width: 22, height: 5, borderRadius: 3, marginBottom: 8},
  calories: {paddingVertical: 18},
  caloriesInput: {flex: 1, padding: 0, paddingTop: 4, borderBottomWidth: 3, borderBottomColor: theme.yellow, fontFamily: 'Degular', fontSize: 40, color: theme.ink},
  caloriesUnit: {fontFamily: 'CronosPro', fontSize: 18, color: theme.muted},
  macros: {flexDirection: 'row', gap: 8},
  macro: {flex: 1, padding: 12},
  macroInput: {flex: 1, minWidth: 0, padding: 0, paddingTop: 4, borderBottomWidth: 2, borderBottomColor: theme.line, fontFamily: 'Degular', fontSize: 24, color: theme.ink},
  optional: {marginTop: 6, fontFamily: 'CronosPro', fontSize: 11, color: theme.muted},
  help: {fontFamily: 'CronosPro', fontSize: 13, lineHeight: 18, color: theme.muted},
});
