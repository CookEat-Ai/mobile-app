import { usePlanningClock } from '../../hooks/usePlanningClock';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CuisineDishPhoto } from '../../components/planning/CuisineDishPhoto';
import { PlanningFlowHeader } from '../../components/planning/PlanningFlowHeader';
import { PlanningPantry, type PlanningPantryValue } from '../../components/planning/PlanningPantry';
import { PantryModeChoice } from '../../components/planning/PantryModeChoice';
import { CookingDaysPicker } from '../../components/planning/CookingDaysPicker';
import { OnboardingScrollView } from '../../components/onboarding/OnboardingScrollView';
import { ServingsControl } from '../../components/ServingsControl';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { apiService, type CatalogCuisine } from '../../services/api';
import { loadFitnessProfile, type FitnessGoal } from '../../services/fitnessProfile';
import { FITNESS_GOALS } from '../../services/nutritionModel';
import { isPresentationModeEnabled } from '../../services/presentationMode';
import { ingredientCategories } from '../../services/ingredientCategories';
import analytics from '../../services/analytics';
import { feedback } from '../../services/haptics';
import { planningSteps, planningConfiguration, planningStepAfterScan, planningChoiceDraft, planningStepCanContinue, type PlanningStep } from '../../services/planningConfiguration';
import { dailyMealsForDays, loadPlanningGenerationSettings, PLANNING_DIETS, type PlanningDiet, savePlanningGenerationSettings } from '../../services/weeklyPlanning';

export default function ConfigurePlanningScreen() {
  const { t, i18n } = useTranslation();
  const { weekStart } = usePlanningClock();
  const { replace } = useLocalSearchParams<{ replace?: string }>();
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const [step, setStep] = useState<PlanningStep>('days');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [servings, setServings] = useState<number | null>(null);
  const [duration, setDuration] = useState<'all' | 'fast' | 'medium' | null>(null);
  const [diet, setDiet] = useState<PlanningDiet | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[] | null>(null);
  const [excludedIngredients, setExcludedIngredients] = useState('');
  const [pantry, setPantry] = useState<PlanningPantryValue>({ pantryIngredients: [], pantryMode: 'priority' });
  const [pantryStage, setPantryStage] = useState<'review' | 'shopping'>('review');
  const [useIngredients, setUseIngredients] = useState(false);
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [presentation, setPresentation] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cuisines, setCuisines] = useState<CatalogCuisine[]>([]);
  const [cuisinesLoading, setCuisinesLoading] = useState(true);
  const [cuisinesError, setCuisinesError] = useState(false);
  const savingRef = useRef(false);
  const steps = planningSteps(presentation);
  const index = steps.indexOf(step);
  const isSingleChoiceStep = step === 'goal' || step === 'duration' || step === 'diet' || (step === 'ingredients' && pantryStage === 'shopping');
  const canContinue = ready && !saving && planningStepCanContinue(step, {
    goal, cookingDays: selectedDays, duration, diet, cuisineIds: selectedCuisines, servings,
  });
  const moveTo = useCallback((next: PlanningStep) => { Keyboard.dismiss(); setStep(next); }, []);
  const back = useCallback(() => {
    if (savingRef.current) return;
    if (step === 'ingredients' && pantryStage === 'shopping') { setPantryStage('review'); return; }
    if (index > 0) moveTo(steps[index - 1]);
    else router.back();
  }, [index, moveTo, steps, step, pantryStage]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index === 0 && !savingRef.current) return false;
      back(); return true;
    });
    return () => subscription.remove();
  }, [back, index]));
  useEffect(() => {
    let active = true;
    void Promise.all([loadPlanningGenerationSettings(), loadFitnessProfile(), isPresentationModeEnabled()]).then(([settings, profile, demo]) => {
      if (!active) return;
      const draft = planningChoiceDraft(settings, demo);
      setSelectedDays(draft.cookingDays); setDuration(draft.duration); setServings(draft.servings);
      setSelectedCuisines(draft.cuisineIds); setDiet(draft.diet); setExcludedIngredients(draft.excludedIngredients.join(', '));
      setPantry({ pantryIngredients: draft.pantryIngredients || [], pantryMode: draft.pantryMode || 'priority' });
      setUseIngredients(!!draft.pantryIngredients?.length); setPresentation(demo);
      setGoal(demo ? null : profile.goal); setStep(demo ? 'goal' : 'days');
    }).catch(() => { if (active) setError(t('planning.errors.load')); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [t]);
  const loadCuisines = useCallback(async () => {
    setCuisinesLoading(true); setCuisinesError(false);
    try {
      const response = await apiService.getCatalogCuisines();
      if (!response.data?.cuisines) throw new Error('cuisines_unavailable');
      setCuisines(response.data.cuisines);
    } catch { setCuisinesError(true); }
    finally { setCuisinesLoading(false); }
  }, []);
  useEffect(() => { void loadCuisines(); }, [loadCuisines]);
  const cuisineLabel = (item: CatalogCuisine) => {
    const language = (i18n.resolvedLanguage || 'fr').split(/[-_]/)[0];
    return item.names.find(name => name.language === language)?.value || item.names.find(name => name.language === 'fr')?.value || item.id;
  };
  const configured = () => {
    if (!selectedDays.length || duration === null || diet === null || selectedCuisines === null || servings === null || (presentation && goal === null)) return null;
    return planningConfiguration({ ...pantry, servings, cookingDays: selectedDays,
      mealsByDay: dailyMealsForDays(selectedDays), includeSnack: true, duration, cuisineIds: selectedCuisines, diet,
      excludedIngredients: [...new Set(excludedIngredients.split(',').map(item => item.trim()).filter(Boolean))],
    }, useIngredients);
  };
  const generate = async () => {
    if (!ready || savingRef.current) return;
    const configuration = configured();
    if (!configuration) return;
    savingRef.current = true; setSaving(true); setError('');
    try {
      const settings = { ...configuration, ...(presentation && goal ? { goal } : {}) };
      await savePlanningGenerationSettings(settings);
      void feedback.confirm();
      router.push({ pathname: '/planning/loading', params: { config: JSON.stringify(settings), replace: replace || 'false' } });
    } catch { feedback.error(); setError(t('planning.errors.update')); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const confirmPantry = useCallback((value: PlanningPantryValue) => {
    setPantry(value); setUseIngredients(value.pantryIngredients.length > 0);
    void analytics.track('planning_pantry_review_confirmed', { ingredient_count: value.pantryIngredients.length }).catch(() => undefined);
    void feedback.selection();
    if (value.pantryIngredients.length) { setPantryStage('shopping'); Keyboard.dismiss(); }
    else { setPantryStage('review'); moveTo(planningStepAfterScan()); }
  }, [moveTo]);
  const chooseAndAdvance = (select: () => void) => {
    if (!ready || savingRef.current) return;
    select();
    void feedback.selection();
    moveTo(steps[index + 1]);
  };
  const next = () => {
    if (!canContinue) return;
    if (step === 'ingredients' && !pantry.pantryIngredients.length) setUseIngredients(false);
    if (step === 'servings') { void generate(); return; }
    void feedback.selection(); moveTo(steps[index + 1]);
  };
  const skipIngredients = () => { setPantryStage('review'); setUseIngredients(false); moveTo('duration'); feedback.selection(); };
  const quickExclusions = ingredientCategories(t).flatMap(category => category.ingredients)
    .filter(item => ['porc', 'lait', 'cacahuete', 'champignon', 'oignon', 'saumon'].includes(item.id));
  const excludedNames = excludedIngredients.split(',').map(name => name.trim()).filter(Boolean);
  return <KeyboardAvoidingView style={appStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <PlanningFlowHeader onBack={back} progress={(index + 1) / steps.length} caption={t('planningFlow.step', { current: index + 1, total: steps.length })} />
    {goal && step !== 'goal' && <Text style={[styles.goal, { paddingLeft: 20 + insets.left, paddingRight: 20 + insets.right }]}>{GOAL_EMOJI[goal]} {t('planningFlow.goal', { goal: t(`fitnessOnboarding.options.goal.${goal}`) })}</Text>}
    <OnboardingScrollView stepKey={`${step}:${pantryStage}`} style={[styles.fill, { marginLeft: insets.left, marginRight: insets.right }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ ...contentColumn(), paddingHorizontal: gutter, paddingTop: 14, paddingBottom: 28 }}>
      {(step !== 'ingredients' || !pantry.pantryIngredients.length) && <View style={styles.heading}><Text accessible={false} style={styles.headingEmoji}>{STEP_EMOJI[step]}</Text><Text accessibilityRole="header" style={[appStyles.title, styles.headingTitle]}>{t(`planningFlow.${step}Title`)}</Text></View>}
      {!!error && <Text accessibilityRole="alert" style={appStyles.error}>{error}</Text>}
      {!ready ? <ActivityIndicator style={{ marginTop: 40 }} color={theme.yellow} /> : <>
        {step === 'goal' && <View style={styles.goals}>{FITNESS_GOALS.map(item => <TouchableOpacity key={item} accessibilityRole="radio" accessibilityLabel={t(`fitnessOnboarding.options.goal.${item}`)} accessibilityState={{ checked: goal === item }}
          style={[styles.goalCard, goal === item && styles.choiceActive]} onPress={() => chooseAndAdvance(() => setGoal(item))}>
          <Text accessible={false} style={styles.goalEmoji}>{GOAL_EMOJI[item]}</Text><Text style={styles.goalName}>{t(`fitnessOnboarding.options.goal.${item}`)}</Text>
          {goal === item && <View style={styles.cuisineCheck}><Ionicons name="checkmark-circle" size={22} color={theme.yellow} /></View>}
        </TouchableOpacity>)}</View>}
        {step === 'days' && <CookingDaysPicker weekStart={weekStart} value={selectedDays} onChange={setSelectedDays} />}
        <View style={step === 'ingredients' && pantryStage === 'review' ? undefined : styles.hidden}>
          <PlanningPantry value={pantry} onChange={value => { setPantry(value); setUseIngredients(value.pantryIngredients.length > 0); }} onConfirm={confirmPantry} active={step === 'ingredients'} />
        </View>
        {step === 'ingredients' && pantryStage === 'shopping' && <View style={styles.shopping}>
          <PantryModeChoice value={null} disabled={!canContinue} onChange={pantryMode => {
            void analytics.track('planning_pantry_shopping_selected', { pantry_mode: pantryMode, ingredient_count: pantry.pantryIngredients.length }).catch(() => undefined);
            setPantry({ ...pantry, pantryMode }); void feedback.selection(); moveTo('duration');
          }} />
          <Text style={appStyles.subtitle}>{t('pantryReview.keptCount', { count: pantry.pantryIngredients.length })}</Text>
        </View>}
        {step === 'duration' && <View style={styles.choices}>{(['fast', 'medium', 'all'] as const).map(item => <Choice key={item} emoji={{ fast: '⚡️', medium: '🍳', all: '👨‍🍳' }[item]} selected={duration === item} title={t(`planning.settings.duration.${item}`)} onPress={() => chooseAndAdvance(() => setDuration(item))} />)}</View>}
        {step === 'cuisines' && <>
          {cuisinesLoading ? <ActivityIndicator color={theme.yellow} /> : cuisinesError ? <View style={styles.choices}>
            <Text accessibilityRole="alert" style={appStyles.error}>{t('planningFlow.cuisinesError')}</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => void loadCuisines()}><Text style={appStyles.textAction}>{t('mealLibrary.retry')}</Text></TouchableOpacity>
          </View> : <>
            <Choice emoji="🌍" selected={selectedCuisines !== null && selectedCuisines.length === 0} title={t('mealLibrary.cuisines.all')} onPress={() => { feedback.selection(); setSelectedCuisines([]); }} />
            <View style={styles.cuisines}>{cuisines.map(item => {
              const selected = selectedCuisines?.includes(item.id) ?? false;
              return <TouchableOpacity key={item.id} accessibilityRole="checkbox" accessibilityLabel={cuisineLabel(item)} accessibilityState={{ checked: selected }}
                style={[styles.cuisine, selected && styles.choiceActive]} onPress={() => { feedback.selection(); setSelectedCuisines(previous => {
                  const current = previous || [];
                  const next = current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id];
                  return next.length ? next : null;
                }); }}>
                <CuisineDishPhoto cuisineId={item.id} />
                <View style={styles.cuisineCheck}>
                  <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? theme.yellow : theme.muted} />
                </View>
                <View style={styles.cuisineLabel}>
                  <Text style={styles.cuisineName}>{cuisineLabel(item)}</Text>
                </View>
              </TouchableOpacity>;
            })}</View>
          </>}
        </>}
        {step === 'diet' && <View style={styles.choices}>{PLANNING_DIETS.map(item => <Choice key={item} emoji={{ none: '🍽️', vegetarian: '🥦', vegan: '🌱', pescatarian: '🐟', halal: '☪️' }[item]} selected={diet === item} title={t(`planningConfig.diets.${item}`)} onPress={() => chooseAndAdvance(() => setDiet(item))} />)}</View>}
        {step === 'exclusions' && <>
          <View style={styles.exclusions}>{quickExclusions.map(item => {
            const selected = excludedNames.some(name => name.toLocaleLowerCase() === item.name.toLocaleLowerCase());
            return <TouchableOpacity key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityState={{ checked: selected }} style={[styles.exclusion, selected && styles.choiceActive]} onPress={() => {
              setExcludedIngredients((selected ? excludedNames.filter(name => name.toLocaleLowerCase() !== item.name.toLocaleLowerCase()) : [...excludedNames, item.name]).join(', ')); feedback.selection();
            }}><Text accessible={false} style={styles.choiceEmoji}>{item.icon}</Text><Text style={styles.exclusionName}>{item.name}</Text><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selected ? theme.yellow : theme.muted} /></TouchableOpacity>;
          })}</View>
          <TextInput accessibilityLabel={t('planningConfig.exclude')} value={excludedIngredients} onChangeText={setExcludedIngredients}
            placeholder={t('planningConfig.excludePlaceholder')} placeholderTextColor={theme.muted} style={styles.input} autoCapitalize="none" returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
        </>}
        {step === 'servings' && <>
          <View style={styles.people}><Text accessible={false} style={styles.peopleEmoji}>{servings === null ? '👥' : Array.from({ length: Math.min(4, servings) }, () => '🧑').join(' ')}{servings !== null && servings > 4 ? ' +' : ''}</Text><ServingsControl value={servings} onChange={setServings} /></View>
          <Text style={styles.selection}>{t('planningFlow.meals', { days: selectedDays.length, meals: selectedDays.length * 4 })}</Text>
        </>}
      </>}
    </OnboardingScrollView>
    {!isSingleChoiceStep && <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24), paddingLeft: gutter + insets.left, paddingRight: gutter + insets.right }]}>
      {step === 'ingredients' ? <>
        {!!pantry.pantryIngredients.length && <TouchableOpacity accessibilityRole="button" disabled={!canContinue} style={styles.skip} onPress={skipIngredients}><Text style={appStyles.textAction}>{t('planningFlow.skip')}</Text></TouchableOpacity>}
        <TouchableOpacity accessibilityRole="button" disabled={!canContinue} accessibilityState={{ disabled: !canContinue }} style={[appStyles.button, styles.button, !canContinue && { opacity: 0.45 }]} onPress={() => pantry.pantryIngredients.length ? confirmPantry(pantry) : skipIngredients()}>
          <Text style={appStyles.buttonText}>{t(pantry.pantryIngredients.length ? 'pantryScan.confirm' : 'planningFlow.skip')}</Text><Ionicons name="arrow-forward" size={22} color="white" />
        </TouchableOpacity>
      </> : <TouchableOpacity accessibilityRole="button" disabled={!canContinue} accessibilityState={{ disabled: !canContinue, busy: saving }} style={[appStyles.button, styles.button, !canContinue && { opacity: 0.45 }]} onPress={next}>
        {saving ? <ActivityIndicator color="white" /> : <><Text style={appStyles.buttonText}>{t(step === 'servings' ? replace === 'true' ? 'planningDetail.regenerate' : 'dailyApp.createWeek' : 'common.continue')}</Text><Ionicons name="arrow-forward" size={22} color="white" /></>}
      </TouchableOpacity>}

    </View>}
  </KeyboardAvoidingView>;
}
const GOAL_EMOJI: Record<FitnessGoal, string> = { gain_muscle: '💪', lose_weight: '📉', maintain: '⚖️', balanced: '🥗' };
const STEP_EMOJI: Record<PlanningStep, string> = { goal: '🎯', days: '📅', ingredients: '🧺', duration: '⏱️', cuisines: '🍽️', diet: '🥗', exclusions: '🚫', servings: '👥' };
function Choice({ selected, title, emoji, onPress }: { selected: boolean; title: string; emoji?: string; onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="radio" accessibilityLabel={title} accessibilityState={{ checked: selected }} style={[styles.option, selected && styles.choiceActive]} onPress={onPress}>
    {emoji && <Text accessible={false} style={styles.choiceEmoji}>{emoji}</Text>}<Text style={[styles.optionText, { flex: 1 }]}>{title}</Text><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={selected ? theme.yellow : '#CEC8B8'} />
  </TouchableOpacity>;
}
const styles = StyleSheet.create({
  shopping: { gap: 24 }, fill: { flex: 1 }, hidden: { display: 'none' },
  goal: { paddingHorizontal: 20, paddingBottom: 8, fontFamily: 'CronosProBold', fontSize: 16, color: theme.ink },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 }, headingEmoji: { fontSize: 40, width: 52, textAlign: 'center' }, headingTitle: { flex: 1 },
  goals: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }, goalCard: { width: '48%', minHeight: 136, borderWidth: 1, borderColor: theme.line, borderRadius: 20, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12 }, goalEmoji: { fontSize: 42 }, goalName: { fontFamily: 'Degular', fontSize: 20, color: theme.ink, textAlign: 'center' },
  selection: { fontFamily: 'CronosProBold', fontSize: 16, color: theme.ink, marginTop: 22 },
  choices: { gap: 4 }, people: { ...appStyles.card, minHeight: 180, justifyContent: 'center', gap: 22 }, peopleEmoji: { fontSize: 44, textAlign: 'center' }, retry: { minHeight: 44, justifyContent: 'center' },
  option: { minHeight: 64, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 17, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  choiceActive: { backgroundColor: '#FFF6D9', borderColor: theme.yellow },
  optionText: { fontFamily: 'Degular', fontSize: 20, color: theme.ink, flexShrink: 1 }, choiceEmoji: { fontSize: 30 },
  exclusions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 }, exclusion: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 17, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, minHeight: 64 }, exclusionName: { fontFamily: 'CronosProBold', fontSize: 15, color: theme.ink },
  cuisines: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  cuisine: { width: '48%', padding: 8, borderRadius: 17, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, gap: 8 },
  cuisineCheck: { position: 'absolute', top: 14, right: 14, borderRadius: 16, padding: 4, backgroundColor: theme.surface },
  cuisineLabel: { minHeight: 48, justifyContent: 'center' },
  cuisineName: { fontFamily: 'Degular', fontSize: 20, color: theme.ink, textAlign: 'center' },
  input: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: '#FFFCF4', padding: 14, fontFamily: 'CronosPro', fontSize: 16, color: theme.ink },
  footer: { paddingTop: 12, backgroundColor: theme.background }, button: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  skip: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
});
