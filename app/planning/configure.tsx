import { finishPresentationScan } from '../../services/presentationScan';
import { ServingsControl } from '../../components/ServingsControl';
import { PlanningPantry, type PlanningPantryValue } from '../../components/planning/PlanningPantry';
import { EntranceView } from '../../components/motion/Entrance';
import { NavigationIconButton } from '../../components/NavigationIconButton';
import { Ionicons } from '@expo/vector-icons';
import { feedback } from '../../services/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { planningStyles } from '../../components/planning/PlanningStyles';
import { apiService, type CatalogCuisine } from '../../services/api';
import { planDays } from '../../services/planningDisplay';
import {
  DEFAULT_COOKING_DAYS,
  loadPlanningGenerationSettings,
  dailyMealsForDays,
  savePlanningGenerationSettings,
  startOfWeekMondayKey,
} from '../../services/weeklyPlanning';

export default function ConfigurePlanningScreen() {
  const { t, i18n } = useTranslation();
  const { replace } = useLocalSearchParams<{ replace?: string }>();
  const insets = useSafeAreaInsets();
  const { gutter, font } = useResponsive();
  const [selectedDays, setSelectedDays] = useState<number[]>([...DEFAULT_COOKING_DAYS]);
  const [servings, setServings] = useState(1);
  const [duration, setDuration] = useState<'all' | 'fast' | 'medium'>('all');
  const [cuisines, setCuisines] = useState<CatalogCuisine[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [diet, setDiet] = useState<'none' | 'vegetarian' | 'vegan'>('none');
  const [excludedIngredients, setExcludedIngredients] = useState('');
  const [ready, setReady] = useState(false);
  const [pantry, setPantry] = useState<PlanningPantryValue>({ pantryIngredients: [], pantryMode: 'priority' });
  const [pantryBusy, setPantryBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const [cuisinesLoading, setCuisinesLoading] = useState(true);
  const [cuisinesError, setCuisinesError] = useState(false);

  useEffect(() => {
    let active = true;
    void loadPlanningGenerationSettings().then(settings => {
      if (!active) return;
      setSelectedDays(settings.cookingDays);
      setDuration(settings.duration);
      setServings(settings.servings || 1);
      setSelectedCuisines(settings.cuisineIds);
      setDiet(settings.diet);
      setExcludedIngredients(settings.excludedIngredients.join(', '));
    }).catch(() => { if (active) setError(t('planning.errors.load')); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [t]);

  const loadCuisines = async () => {
    setCuisinesLoading(true); setCuisinesError(false);
    try {
      const response = await apiService.getCatalogCuisines();
      if (!response.data?.cuisines) throw new Error('cuisines_unavailable');
      setCuisines(response.data.cuisines);
    } catch { setCuisinesError(true); }
    finally { setCuisinesLoading(false); }
  };
  useEffect(() => { void loadCuisines(); }, []);

  const days = useMemo(() => planDays(startOfWeekMondayKey()).map(day => ({
    ...day,
    label: new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'long' }).format(day.date),
    short: new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'short' }).format(day.date),
  })), [i18n.resolvedLanguage]);
  const mealCount = selectedDays.length * 4;

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex) && selectedDays.length === 1) return;
    void feedback.selection();
    if (selectedDays.includes(dayIndex)) {
      const next = selectedDays.filter(day => day !== dayIndex);
      setSelectedDays(next);
    } else {
      setSelectedDays(current => [...current, dayIndex].sort((a, b) => a - b));
    }
  };
  const continueFlow = async (pantryOverride?: PlanningPantryValue) => {
    if (!ready || pantryBusy || savingRef.current) return;
    savingRef.current = true; setSaving(true); setError('');
    try {
      const normalizedMeals = dailyMealsForDays(selectedDays);
      const excluded = [...new Set(excludedIngredients.split(',').map(item => item.trim()).filter(Boolean))];
      const settings = { ...(pantryOverride || pantry), servings, cookingDays: selectedDays, mealsByDay: normalizedMeals, includeSnack: true, duration, cuisineIds: selectedCuisines, diet, excludedIngredients: excluded };
      await savePlanningGenerationSettings(settings);
      void feedback.confirm();
      router.push({ pathname: '/planning/loading', params: { config: JSON.stringify(settings), replace: replace || 'false' } });
    } catch { finishPresentationScan(); feedback.error(); setError(t('planning.errors.update')); }
    finally { savingRef.current = false; setSaving(false); }
  };

  return <KeyboardAvoidingView style={appStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[appStyles.backHeader, styles.topBar, { paddingTop: insets.top + 8, paddingHorizontal: gutter }]}>
      <NavigationIconButton style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} />
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[appStyles.headerTitle, appStyles.backHeaderLeadingTitle, { fontSize: font(29) }]}>{t('tabs.planning')}</Text>
    </View>
    <ScrollView style={styles.fill} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ ...contentColumn(), paddingHorizontal: gutter, paddingTop: 8, paddingBottom: 32 }}>
      <Text style={appStyles.title}>{t('planningConfig.title')}</Text>
      <Text style={styles.subtitle}>{t('planningConfig.dailyMeals')}</Text>
      {error ? <Text accessibilityRole="alert" style={appStyles.error}>{error}</Text> : null}
      {!ready ? <ActivityIndicator style={styles.loader} color={theme.yellow} /> : <>
        <View style={styles.sectionHeading}><Text style={appStyles.section}>{t('planning.generation.daysTitle')}</Text><Text style={styles.count}>{t('dailyApp.mealCount', { count: mealCount })}</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={planningStyles.days}>
          {days.map(day => {
            const selected = selectedDays.includes(day.dayIndex);
            return <TouchableOpacity key={day.key} onPress={() => toggleDay(day.dayIndex)} style={[planningStyles.day, selected && planningStyles.dayActive]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={`${day.label} ${day.date.getDate()}`}>
              <Text style={[planningStyles.dayShort, selected && planningStyles.dayTextActive]}>{day.short}</Text>
              <Text style={[planningStyles.dayNumber, selected && planningStyles.dayTextActive]}>{day.date.getDate()}</Text>
            </TouchableOpacity>;
          })}
        </ScrollView>
        <PlanningPantry presentationConfig={JSON.stringify({ servings, cookingDays: selectedDays, mealsByDay: dailyMealsForDays(selectedDays), includeSnack: true, duration, cuisineIds: selectedCuisines, diet, excludedIngredients: [...new Set(excludedIngredients.split(',').map(item => item.trim()).filter(Boolean))] })} presentationReplace={replace} onChange={setPantry} onBusy={setPantryBusy} useDisabled={!ready || saving} onUseIngredients={value => void continueFlow(value)} />
        <EntranceView entranceIndex={0} style={styles.preferencesCard}>
          <Text style={appStyles.section}>{t('planningConfig.duration')}</Text>
          <Text style={styles.sectionHelp}>{t('planning.settings.durationHelp')}</Text>
          <View style={styles.optionList}>
            {(['all', 'fast', 'medium'] as const).map(item => <TouchableOpacity key={item} style={[styles.option, duration === item && styles.choiceActive]} onPress={() => { if (duration !== item) feedback.selection(); setDuration(item); }} accessibilityRole="radio" accessibilityState={{ checked: duration === item }}><Text style={styles.optionText}>{t(`planning.settings.duration.${item}`)}</Text><Ionicons name={duration === item ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={duration === item ? theme.yellow : '#CEC8B8'} /></TouchableOpacity>)}
          </View>
        </EntranceView>
        <EntranceView entranceIndex={1} style={styles.preferencesCard}>
          <Text style={appStyles.section}>{t('planningConfig.diet')}</Text>
          <View style={styles.optionList}>
            {(['none', 'vegetarian', 'vegan'] as const).map(item => <TouchableOpacity key={item} style={[styles.option, diet === item && styles.choiceActive]} onPress={() => { if (diet !== item) feedback.selection(); setDiet(item); }} accessibilityRole="radio" accessibilityState={{ checked: diet === item }}><Text style={styles.optionText}>{t(`planningConfig.diets.${item}`)}</Text><Ionicons name={diet === item ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={diet === item ? theme.yellow : '#CEC8B8'} /></TouchableOpacity>)}
          </View>
        </EntranceView>
        <EntranceView entranceIndex={2} style={styles.preferencesCard}>
          <Text style={appStyles.section}>{t('planningConfig.cuisines')}</Text>
          <Text style={styles.sectionHelp}>{t('planningConfig.cuisinesHelp')}</Text>
          {cuisinesLoading ? <ActivityIndicator style={{ marginTop: 16 }} color={theme.yellow} /> : cuisinesError ? <TouchableOpacity style={styles.option} onPress={() => void loadCuisines()} accessibilityRole="button"><Text style={appStyles.textAction}>{t('mealLibrary.retry')}</Text><Ionicons name="refresh" size={20} color={theme.ink} /></TouchableOpacity> : <View style={styles.choiceWrap}>
            {cuisines.map(item => {
              const selected = selectedCuisines.includes(item.id);
              const language = (i18n.resolvedLanguage || 'fr').split(/[-_]/)[0];
              const label = item.names.find(name => name.language === language)?.value || item.names.find(name => name.language === 'fr')?.value || item.id;
              return <TouchableOpacity key={item.id} onPress={() => { feedback.selection(); setSelectedCuisines(current => selected ? current.filter(id => id !== item.id) : [...current, item.id]); }} style={[styles.choice, selected && styles.choiceActive]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}><Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{label}</Text></TouchableOpacity>;
            })}
          </View>}
        </EntranceView>
        <View style={styles.preferencesCard}><Text style={appStyles.section}>{t('planningConfig.people')}</Text><ServingsControl value={servings} onChange={setServings} disabled={!ready || saving} /></View>
        <EntranceView entranceIndex={3} style={styles.preferencesCard}>
          <Text style={appStyles.section}>{t('planningConfig.exclude')}</Text>
          <Text style={styles.sectionHelp}>{t('planningConfig.excludeHelp')}</Text>
          <TextInput accessibilityLabel={t('planningConfig.exclude')} value={excludedIngredients} onChangeText={setExcludedIngredients} placeholder={t('planningConfig.excludePlaceholder')} placeholderTextColor="#9A9589" style={styles.input} autoCapitalize="none" returnKeyType="done" />
        </EntranceView>
      </>}
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24), paddingHorizontal: gutter }]}>
      <TouchableOpacity style={[appStyles.button, styles.continueButton, (!ready || saving || pantryBusy) && styles.disabled]} disabled={!ready || saving || pantryBusy} accessibilityRole="button" accessibilityState={{ disabled: !ready || saving || pantryBusy, busy: saving }} onPress={() => void continueFlow()} activeOpacity={0.82}>
        {saving ? <ActivityIndicator color="white" /> : <Text style={[appStyles.buttonText, styles.continueText]}>{t(replace === 'true' ? 'planningDetail.regenerate' : 'planning.generation.cta')}</Text>}
      </TouchableOpacity>
    </View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: { paddingBottom: 12 },
  backButton: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
  subtitle: { ...appStyles.subtitle, marginTop: 8, marginBottom: 28 },
  loader: { marginVertical: 40 },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  count: { fontFamily: 'CronosProBold', fontSize: 14, color: theme.muted },
  preferencesCard: { ...planningStyles.mealCard, padding: 18, marginTop: 24 },
  sectionHelp: { marginTop: 6, fontFamily: 'CronosPro', fontSize: 14, lineHeight: 20, color: theme.muted },
  optionList: { gap: 8, marginTop: 16 },
  option: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.line, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionText: { flex: 1, fontFamily: 'Degular', fontSize: 18, color: theme.ink },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  choice: { minHeight: 44, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: theme.line, flexDirection: 'row', alignItems: 'center', gap: 7 },
  choiceActive: { backgroundColor: '#FFF6D9', borderColor: theme.yellow },
  choiceText: { fontFamily: 'CronosProBold', fontSize: 14, color: theme.muted },
  choiceTextActive: { color: theme.ink },
  input: { minHeight: 54, marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: '#FFFCF4', paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'CronosPro', fontSize: 16, color: theme.ink },
  footer: { paddingTop: 12, backgroundColor: theme.background },
  continueButton: { width: '100%', maxWidth: 520, alignSelf: 'center', shadowColor: theme.yellow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  continueText: { textAlign: 'center' },
  disabled: { opacity: 0.58 },
});
