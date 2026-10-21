import { AppSpinner as ActivityIndicator } from '../../components/ui/AppSpinner';
import { FORM_CONTENT_MAX_WIDTH } from '../../constants/Layout';
import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { PlanningBudgetPicker } from '../../components/planning/PlanningBudgetPicker';
import { COOKING_LEVELS, KITCHEN_EQUIPMENT, type CookingLevel, type MealBudget } from '../../services/cookingPreferences';
import { usePlanningClock } from '../../hooks/usePlanningClock';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { apiService, type CatalogCuisine } from '../../services/api';
import { loadFitnessProfile, type FitnessGoal } from '../../services/fitnessProfile';
import { FITNESS_GOALS } from '../../services/nutritionModel';
import { isPresentationModeEnabled } from '../../services/presentationMode';
import { ingredientCategories } from '../../services/ingredientCategories';
import { loadSavedPantryIngredientNames, savePantryIngredientNames } from '../../services/pantryDefaults';
import { planningGoalFromPlan, planningSettingsFromPlan } from '../../services/planningRegeneration';
import analytics from '../../services/analytics';
import { feedback } from '../../services/haptics';
import { planningSteps, planningConfiguration, planningStepAfterScan, planningChoiceDraft, planningStepCanContinue, type PlanningStep } from '../../services/planningConfiguration';
import { dailyMealsForDays, loadPlanningGenerationSettings, PLANNING_DIETS, type PlanningDiet, savePlanningGenerationSettings } from '../../services/weeklyPlanning';

export default function ConfigurePlanningScreen() {
  const { t, i18n } = useTranslation();
  const { weekStart } = usePlanningClock();
  const { replace, sourcePlanId } = useLocalSearchParams<{ replace?: string; sourcePlanId?: string }>();
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const [step, setStep] = useState<PlanningStep>('goal');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [servings, setServings] = useState<number | null>(null);
  const [duration, setDuration] = useState<'all' | 'fast' | 'medium' | null>(null);
  const [cookingLevel, setCookingLevel] = useState<CookingLevel | null>(null);
  const [weeklyBudget,setWeeklyBudget]=useState<number|undefined>();
  const [budgetRegion,setBudgetRegion]=useState<{country:string;currency:string}|null>(null);
  const [mealBudget, setMealBudget] = useState<MealBudget | null>(null);
  const [equipments, setEquipments] = useState<string[] | null>(null);
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
  const isSingleChoiceStep = step === 'goal' || step === 'duration' || step === 'diet' || step === 'cookingLevel' || (step === 'ingredients' && pantryStage === 'shopping');
  const canContinue = ready && !saving && planningStepCanContinue(step, {
    goal, cookingDays: selectedDays, duration, diet, cuisineIds: selectedCuisines, servings, cookingLevel, mealBudget, equipments, weeklyBudget,
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
    setReady(false); setError('');
    const sourcePlan = (async () => {
      if (!sourcePlanId) return null;
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error('missing_user');
      const response = await apiService.getMealPlanById(sourcePlanId, userId);
      if (!response.data?.plan) throw new Error('missing_source_plan');
      return response.data.plan;
    })();
    void Promise.all([loadPlanningGenerationSettings(), loadFitnessProfile(), isPresentationModeEnabled(), loadSavedPantryIngredientNames(), sourcePlan]).then(([settings, profile, demo, storedPantry, plan]) => {
      if (!active) return;
      const draft = planningChoiceDraft(plan ? planningSettingsFromPlan(plan) : settings, demo && !plan);
      setWeeklyBudget(draft.weeklyBudget);
      setBudgetRegion(draft.country && draft.currency ? { country: draft.country, currency: draft.currency } : null);
      setSelectedDays(draft.cookingDays); setDuration(draft.duration); setServings(draft.servings);
      setCookingLevel(draft.cookingLevel ?? (demo ? null : 'beginner')); setMealBudget(draft.mealBudget ?? (demo ? null : 'budget_medium'));
      setEquipments(draft.equipments ?? (demo ? null : ['standard-kitchen']));
      setSelectedCuisines(draft.cuisineIds); setDiet(draft.diet); setExcludedIngredients(draft.excludedIngredients.join(', '));
      const pantryIngredients = plan ? draft.pantryIngredients || [] : storedPantry ?? settings.pantryIngredients ?? [];
      setPantry({ pantryIngredients, pantryMode: draft.pantryMode || 'priority' });
      setUseIngredients(pantryIngredients.length > 0); setPresentation(demo);
      setGoal(plan ? planningGoalFromPlan(plan, profile.goal) : demo ? null : profile.goal); setStep('goal');
    }).catch(() => { if (active) setError(t('planning.errors.load')); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [t, sourcePlanId]);
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
    if (cookingLevel === null || equipments === null || mealBudget === null || !selectedDays.length || duration === null || diet === null || selectedCuisines === null || servings === null || goal === null || !weeklyBudget || !budgetRegion) return null;
    return planningConfiguration({ ...pantry, servings, weeklyBudget, ...budgetRegion, cookingLevel, mealBudget, equipments, cookingDays: selectedDays,
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
      const settings = { ...configuration, ...(goal ? { goal } : {}) };
      // Skipping pantry constraints for this plan must not empty the device inventory.
      await savePantryIngredientNames(pantry.pantryIngredients);
      await savePlanningGenerationSettings(settings);
      void feedback.confirm();
      router.push({ pathname: '/planning/loading', params: { config: JSON.stringify(settings), replace: replace || 'false' } });
    } catch { feedback.error(); setError(t('planning.errors.update')); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const updatePantry = useCallback((value: PlanningPantryValue) => {
    setPantry(value); setUseIngredients(value.pantryIngredients.length > 0);
    void savePantryIngredientNames(value.pantryIngredients).catch(() => setError(t('planning.errors.update')));
  }, [t]);
  const confirmPantry = useCallback((value: PlanningPantryValue) => {
    updatePantry(value);
    void analytics.track('planning_pantry_review_confirmed', { ingredient_count: value.pantryIngredients.length }).catch(() => undefined);
    void feedback.selection();
    if (value.pantryIngredients.length) { setPantryStage('shopping'); Keyboard.dismiss(); }
    else { setPantryStage('review'); moveTo(planningStepAfterScan()); }
  }, [moveTo, updatePantry]);
  const chooseAndAdvance = (select: () => void) => {
    if (!ready || savingRef.current) return;
    select();
    void feedback.selection();
    moveTo(steps[index + 1]);
  };
  const next = () => {
    if (!canContinue) return;
    if (step === 'ingredients' && !pantry.pantryIngredients.length) setUseIngredients(false);
    if (index === steps.length-1) { void generate(); return; }
    void feedback.selection(); moveTo(steps[index + 1]);
  };
  const skipIngredients = () => { setPantryStage('review'); setUseIngredients(false); moveTo('duration'); feedback.selection(); };
  const quickExclusions = ingredientCategories(t).flatMap(category => category.ingredients)
    .filter(item => ['porc', 'lait', 'cacahuete', 'champignon', 'oignon', 'saumon'].includes(item.id));
  const excludedNames = excludedIngredients.split(',').map(name => name.trim()).filter(Boolean);
  return <KeyboardAvoidingView style={appStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <PlanningFlowHeader onBack={back} progress={(index + 1) / steps.length} />
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
        {step === 'days' && <CookingDaysPicker weekStart={weekStart} value={selectedDays} onChange={days => { setSelectedDays(days); setWeeklyBudget(undefined); setBudgetRegion(null); }} />}
        <View style={step === 'ingredients' && pantryStage === 'review' ? undefined : styles.hidden}>
          <PlanningPantry value={pantry} onChange={updatePantry} onConfirm={confirmPantry} active={step === 'ingredients'} />
        </View>
        {step === 'ingredients' && pantryStage === 'shopping' && <View style={styles.shopping}>
          <PantryModeChoice value={sourcePlanId ? pantry.pantryMode : null} disabled={!canContinue} onChange={pantryMode => {
            void analytics.track('planning_pantry_shopping_selected', { pantry_mode: pantryMode, ingredient_count: pantry.pantryIngredients.length }).catch(() => undefined);
            setPantry({ ...pantry, pantryMode }); void feedback.selection(); moveTo('duration');
          }} />
          <Text style={appStyles.subtitle}>{t('pantryReview.keptCount', { count: pantry.pantryIngredients.length })}</Text>
        </View>}
        {step === 'duration' && <View style={styles.choices}>{(['fast', 'medium', 'all'] as const).map(item => <Choice key={item} emoji={{ fast: '⚡️', medium: '🍳', all: '👨‍🍳' }[item]} selected={duration === item} title={t(`planning.settings.duration.${item}`)} onPress={() => chooseAndAdvance(() => setDuration(item))} />)}</View>}
        {step === 'cookingLevel' && <View style={styles.choices}>{COOKING_LEVELS.map(item => <Choice key={item} emoji={{ beginner: '🍳', medium: '🥘', advanced: '👨‍🍳' }[item]} selected={cookingLevel === item} title={t(`onboarding.formQuestions.${item}`)} onPress={() => chooseAndAdvance(() => { setCookingLevel(item); void analytics.track('planning_preference_selected', { preference: 'cookingLevel', value: item }).catch(() => undefined); })} />)}</View>}
        {step === 'mealBudget' && <PlanningBudgetPicker people={servings||1} days={selectedDays.length} value={weeklyBudget} onChange={(amount,region)=>{setWeeklyBudget(amount);setBudgetRegion({country:region.country,currency:region.currency});if(amount!==weeklyBudget||mealBudget===null)setMealBudget(amount&&amount>region.minimum*3?'budget_large':amount&&amount>region.minimum*1.5?'budget_medium':'budget_small');}}/>}
        {step === 'equipments' && <View style={styles.choices}>
          {['standard-kitchen', ...KITCHEN_EQUIPMENT].map(item => <Choice key={item} multiple={item !== 'standard-kitchen'} emoji={item === 'standard-kitchen' ? '🍳' : { oven: '🔥', airfryer: '🍟', fryer: '🍟', microwave: '📡', blender: '🥤', robot: '🤖' }[item as typeof KITCHEN_EQUIPMENT[number]]} selected={item === 'standard-kitchen' ? equipments?.length === 1 : !!equipments?.includes(item)} title={item === 'standard-kitchen' ? t('cookingPreferences.basicKitchen') : t(`onboarding.formQuestions.equipment_${item}`)} onPress={() => { feedback.selection(); setEquipments(previous => item === 'standard-kitchen' ? ['standard-kitchen'] : ['standard-kitchen', ...(previous || []).filter(tool => tool !== 'standard-kitchen' && tool !== item), ...(!previous?.includes(item) ? [item] : [])]); }} />)}
        </View>}
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
          <View style={styles.people}><Text accessible={false} style={styles.peopleEmoji}>{servings === null ? '👥' : Array.from({ length: Math.min(4, servings) }, () => '🧑').join(' ')}{servings !== null && servings > 4 ? ' +' : ''}</Text><ServingsControl value={servings} onChange={value=>{setServings(value);setWeeklyBudget(undefined);setBudgetRegion(null);}} /></View>
        </>}
      </>}
    </OnboardingScrollView>
    {!isSingleChoiceStep && <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24), paddingLeft: gutter + insets.left, paddingRight: gutter + insets.right }]}>
      {step === 'ingredients' ? <>
        {!!pantry.pantryIngredients.length && <TouchableOpacity accessibilityRole="button" disabled={!canContinue} style={styles.skip} onPress={skipIngredients}><Text style={appStyles.textAction}>{t('planningFlow.skip')}</Text></TouchableOpacity>}
        <TouchableOpacity accessibilityRole="button" disabled={!canContinue} accessibilityState={{ disabled: !canContinue }} style={[appStyles.button, styles.button, !canContinue && { opacity: 0.45 }]} onPress={() => pantry.pantryIngredients.length ? confirmPantry(pantry) : skipIngredients()}>
          <Text style={appStyles.buttonText}>{t(pantry.pantryIngredients.length ? 'pantryScan.confirm' : 'planningFlow.skip')}</Text><Ionicons name="arrow-forward" size={22} color={theme.onPrimary} />
        </TouchableOpacity>
      </> : <TouchableOpacity accessibilityRole="button" disabled={!canContinue} accessibilityState={{ disabled: !canContinue, busy: saving }} style={[appStyles.button, styles.button, !canContinue && { opacity: 0.45 }]} onPress={next}>
        {saving ? <ActivityIndicator color={theme.onPrimary} /> : <><Text style={appStyles.buttonText}>{t(index === steps.length-1 ? replace === 'true' ? 'planningDetail.regenerate' : 'dailyApp.createWeek' : 'common.continue')}</Text><Ionicons name="arrow-forward" size={22} color={theme.onPrimary} /></>}
      </TouchableOpacity>}

    </View>}
  </KeyboardAvoidingView>;
}
const GOAL_EMOJI: Record<FitnessGoal, string> = { gain_muscle: '💪', lose_weight: '📉', maintain: '⚖️', balanced: '🥗' };
const STEP_EMOJI: Record<PlanningStep, string> = { goal: '🎯', days: '📅', ingredients: '🧺', duration: '⏱️', cookingLevel: '🍳', equipments: '🥘', mealBudget: '🪙', cuisines: '🍽️', diet: '🥗', exclusions: '🚫', servings: '👥' };
function Choice({ selected, title, emoji, onPress, multiple = false }: { multiple?: boolean; selected: boolean; title: string; emoji?: string; onPress: () => void }) {
  return <TouchableOpacity accessibilityRole={multiple ? "checkbox" : "radio"} accessibilityLabel={title} accessibilityState={{ checked: selected }} style={[styles.option, selected && styles.choiceActive]} onPress={onPress}>
    {emoji && <Text accessible={false} style={styles.choiceEmoji}>{emoji}</Text>}<Text style={[styles.optionText, { flex: 1 }]}>{title}</Text><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={selected ? theme.yellow : '#CEC8B8'} />
  </TouchableOpacity>;
}
const styles = StyleSheet.create({
  shopping: { gap: 24 }, fill: { flex: 1 }, hidden: { display: 'none' },
  goal: { paddingHorizontal: 20, paddingBottom: 8, fontFamily: 'CronosProBold', fontSize: 16, color: theme.ink },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 }, headingEmoji: { fontSize: 40, width: 52, textAlign: 'center' }, headingTitle: { flex: 1 },
  goals: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }, goalCard: { width: '48%', minHeight: 136, borderWidth: 1, borderColor: theme.line, borderRadius: AppRadii.card, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12 }, goalEmoji: { fontSize: 42 }, goalName: { fontFamily: 'Degular', fontSize: 20, color: theme.ink, textAlign: 'center' },
  choices: { gap: 4 }, people: { ...appStyles.card, minHeight: 180, justifyContent: 'center', gap: 22 }, peopleEmoji: { fontSize: 44, textAlign: 'center' }, retry: { minHeight: 44, justifyContent: 'center' },
  option: { minHeight: 64, paddingHorizontal: 16, paddingVertical: 16, borderRadius: AppRadii.control, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  choiceActive: { backgroundColor: theme.yellowSoft, borderColor: theme.yellow },
  optionText: { fontFamily: 'Degular', fontSize: 20, color: theme.ink, flexShrink: 1 }, choiceEmoji: { fontSize: 30 },
  exclusions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 }, exclusion: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: AppRadii.control, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, minHeight: 64 }, exclusionName: { fontFamily: 'CronosProBold', fontSize: 15, color: theme.ink },
  cuisines: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  cuisine: { width: '48%', padding: 8, borderRadius: AppRadii.control, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, gap: 8 },
  cuisineCheck: { position: 'absolute', top: 14, right: 14, borderRadius: AppRadii.control, padding: 4, backgroundColor: theme.surface },
  cuisineLabel: { minHeight: 48, justifyContent: 'center' },
  cuisineName: { fontFamily: 'Degular', fontSize: 20, color: theme.ink, textAlign: 'center' },
  input: { minHeight: 54, borderRadius: AppRadii.control, borderWidth: 1, borderColor: theme.line, backgroundColor: '#FFFCF4', padding: 14, fontFamily: 'CronosPro', fontSize: 16, color: theme.ink },
  footer: { paddingTop: 12, backgroundColor: theme.background }, button: { width: '100%', maxWidth: FORM_CONTENT_MAX_WIDTH, alignSelf: 'center' },
  skip: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
});
