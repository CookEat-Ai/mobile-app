import { AppSpinner as ActivityIndicator } from '../ui/AppSpinner';
import React, { useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { nutritionKeys, type FoodNutrition } from '../../services/mealTracking';

/** Draft strings keep empty fields and decimal commas editable without writing partial values. */
export function NutritionEditor({ initial, food, onApply }: {
  initial: FoodNutrition | null;
  food?: { name: string; grams: number };
  onApply: (nutrition: FoodNutrition, food?: { name: string; grams: number }) => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false), [error, setError] = useState(false);
  const busy = useRef(false);
  const { t } = useTranslation(), insets = useSafeAreaInsets();
  const [name, setName] = useState(food?.name || ''), [grams, setGrams] = useState(String(food?.grams || 100));
  const [draft, setDraft] = useState(() => Object.fromEntries(nutritionKeys.map(key => [key, initial ? String(Math.round(initial[key] * 100) / 100) : ''])) as Record<keyof FoodNutrition, string>);
  const parse = (raw: string) => /^\d+(?:[.,]\d*)?$/.test(raw.trim()) ? Number(raw.replace(',', '.')) : NaN;
  const values = Object.fromEntries(nutritionKeys.map(key => [key, parse(draft[key])])) as FoodNutrition;
  const weight = parse(grams);
  const valid = nutritionKeys.every(key => Number.isFinite(values[key]) && values[key] >= 0 && values[key] <= 1000000) && (!food || (!!name.trim() && Number.isInteger(weight) && weight >= 1 && weight <= 2000 && nutritionKeys.every(key => values[key] * 100 / weight <= 1000000)));
  const apply = async () => {
    if (!valid || busy.current) return;
    busy.current = true; setSaving(true); setError(false);
    try { await onApply(values, food ? {name: name.trim(), grams: weight} : undefined); }
    catch { setError(true); }
    finally { busy.current = false; setSaving(false); }
  };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding: 20, gap: 18, paddingBottom: insets.bottom + 24}}>
      <Text style={appStyles.subtitle}>{t(food ? 'tracking.portionNutritionNote' : 'tracking.mealNutritionNote')}</Text>
      {food && <>
        <View style={{gap: 8}}><Text style={appStyles.textAction}>{t('tracking.foodName')}</Text><TextInput editable={!saving} accessibilityLabel={t('tracking.foodName')} value={name} onChangeText={setName} maxLength={100} style={appStyles.input}/></View>
        <View style={{gap: 8}}><Text style={appStyles.textAction}>{t('tracking.portionGrams')}</Text><TextInput editable={!saving} accessibilityLabel={t('tracking.portionGrams')} value={grams} onChangeText={setGrams} keyboardType="number-pad" selectTextOnFocus style={appStyles.input}/></View>
      </>}
      {nutritionKeys.map(key => <View key={key} style={{gap: 8}}><Text style={appStyles.textAction}>{t(`tracking.${key}`)} · {key === 'calories' ? 'kcal' : 'g'}</Text><TextInput editable={!saving} accessibilityLabel={t(`tracking.${key}`)} value={draft[key]} onChangeText={raw => setDraft(current => ({...current, [key]: raw}))} keyboardType="decimal-pad" selectTextOnFocus maxLength={12} style={appStyles.input}/></View>)}
      <Text style={appStyles.subtitle}>{t('tracking.nutritionInputHelp')}</Text>
      {food && <Text style={appStyles.subtitle}>{t('tracking.defaultNutritionNote')}</Text>}
      {error && <Text accessibilityRole="alert" style={appStyles.error}>{t('tracking.saveError')}</Text>}
      <TouchableOpacity accessibilityRole="button" disabled={!valid || saving} onPress={() => {void apply();}} style={[appStyles.button, (!valid || saving) && {opacity: .45}]}>{saving ? <ActivityIndicator color={theme.onPrimary}/> : <Text style={appStyles.buttonText}>{t('tracking.applyNutrition')}</Text>}</TouchableOpacity>
    </ScrollView>;
}
