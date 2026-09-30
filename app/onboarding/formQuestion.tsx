import { EntranceView } from '../../components/motion/Entrance';
import { NavigationIconButton } from '../../components/NavigationIconButton';
import { NutritionExplanation } from '../../components/NutritionExplanation';
import { WEIGHT_LOGS_KEY, normalizeWeightLogs, WEIGHT_REVIEW_KEY, weightDateKey, weightReviewContext } from '../../services/weightTracking';
import { OnboardingScrollView } from '../../components/onboarding/OnboardingScrollView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { feedback } from '../../services/haptics';
import { Image } from 'expo-image';
import * as Localization from 'expo-localization';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingProgressBar } from '../../components/onboarding/OnboardingProgressBar';
import { OnboardingIconCard } from '../../components/onboarding/OnboardingIconCard';
import { Colors } from '../../constants/Colors';
import { rw } from '../../constants/Layout';
import analytics from '../../services/analytics';
import apiService from '../../services/api';
import { getUniqueDeviceId } from '../../services/deviceStorage';
import { calculateFitnessProjection, FitnessGoal, FitnessProfile } from '../../services/fitnessProfile';
import { FITNESS_GOALS, normalizeFitnessGoal } from '../../services/nutritionModel';

type AnswerValue = string | string[];
type Answers = Record<string, AnswerValue>;
type Option = { value: string; label: string; emoji: string; description?: string };
type StepKind = 'single' | 'multi' | 'number' | 'interstitial' | 'socialProof' | 'ready';
type Step = { id: string; title: string; subtitle?: string; kind: StepKind; options?: Option[]; unit?: string; min?: number; max?: number; optional?: boolean; hideProgress?: boolean };

const requiresWeightTarget = (goal?: AnswerValue) => goal === 'lose_weight' || goal === 'gain_muscle';

export default function FitnessOnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const routeParams = useLocalSearchParams<{ initialStep?: string }>();
  const [answers, setAnswers] = useState<Answers>({ includeSnack: 'false' });
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const socialProofExit = useRef(new Animated.Value(0)).current;
  const transitioning = useRef(false);
  const devJumpApplied = useRef(false);

  const option = React.useCallback((group: string, value: string, emoji: string): Option => ({ value, emoji, label: t(`fitnessOnboarding.options.${group}.${value}`), description: group === 'activity' ? t(`nutritionEstimate.activityDescriptions.${value}`) : undefined }), [t]);

  const changeTitleKey = answers.fitnessGoal === 'lose_weight'
    ? 'fitnessOnboarding.change.loseTitle'
    : 'fitnessOnboarding.change.muscleTitle';

  const steps = useMemo<Step[]>(() => [
    { id: 'fitnessGoal', kind: 'single', title: t('fitnessOnboarding.goal.title'), subtitle: t('fitnessOnboarding.goal.subtitle'), options: FITNESS_GOALS.map(goal => option('goal', goal, { lose_weight: '📉', gain_muscle: '💪', maintain: '⚖️', balanced: '🥗' }[goal])) },
    { id: 'goalReflection', kind: 'interstitial', hideProgress: true, title: t(`fitnessOnboarding.reflection.${String(answers.fitnessGoal || 'balanced')}.title`), subtitle: t(`fitnessOnboarding.reflection.${String(answers.fitnessGoal || 'balanced')}.subtitle`) },
    { id: 'sex', kind: 'single', title: t('fitnessOnboarding.sex.title'), subtitle: t('fitnessOnboarding.sex.subtitle'), options: [option('sex', 'female', '👩'), option('sex', 'male', '👨'), option('sex', 'unspecified', '✨')] },
    { id: 'age', kind: 'number', title: t('fitnessOnboarding.age.title'), subtitle: t('fitnessOnboarding.age.subtitle'), unit: t('fitnessOnboarding.units.years'), min: 18, max: 80 },
    { id: 'heightCm', kind: 'number', title: t('fitnessOnboarding.height.title'), subtitle: t('fitnessOnboarding.height.subtitle'), unit: 'cm', min: 130, max: 230 },
    { id: 'currentWeightKg', kind: 'number', title: t('fitnessOnboarding.weight.title'), subtitle: t('fitnessOnboarding.weight.subtitle'), unit: 'kg', min: 35, max: 300 },
    ...(requiresWeightTarget(answers.fitnessGoal) ? [
      { id: 'targetChangeKg', kind: 'number' as const, title: t(changeTitleKey), subtitle: t('fitnessOnboarding.change.subtitle'), unit: 'kg', min: 1, max: 100 },
    ] : []),
    { id: 'activityLevel', kind: 'single', title: t('fitnessOnboarding.activity.title'), subtitle: t('fitnessOnboarding.activity.subtitle'), options: [option('activity', 'sedentary', '🪑'), option('activity', 'light', '🚶'), option('activity', 'moderate', '🏃'), option('activity', 'active', '🏋️'), option('activity', 'very_active', '⚡️')] },
    { id: 'trainingDays', kind: 'single', title: t('fitnessOnboarding.training.title'), subtitle: t('fitnessOnboarding.training.subtitle'), options: Array.from({ length: 8 }, (_, day) => option('training', String(day), day === 0 ? '😌' : '🔥')) },
    ...(Number(answers.trainingDays) > 0 ? [{ id: 'trainingDurationMinutes', kind: 'single' as const, title: t('nutritionEstimate.durationTitle'), subtitle: t('nutritionEstimate.durationSubtitle'), options: [20, 45, 75].map(minutes => ({ value: String(minutes), emoji: '⏱️', label: t(`nutritionEstimate.durations.${minutes}`) })) }] : []),
    { id: 'profileReflection', kind: 'interstitial', hideProgress: true, title: t('fitnessOnboarding.interstitials.profile.title'), subtitle: t('fitnessOnboarding.interstitials.profile.subtitle') },
    { id: 'cookingTime', kind: 'single', title: t('fitnessOnboarding.cookingTime.title'), subtitle: t('fitnessOnboarding.cookingTime.subtitle'), options: [option('cookingTime', 'less_than_30_minutes', '⏱️'), option('cookingTime', 'between_30_minutes_and_1_hour', '⏲️'), option('cookingTime', 'more_than_1_hour', '👨‍🍳')] },
    { id: 'diet', kind: 'single', title: t('fitnessOnboarding.diet.title'), subtitle: t('fitnessOnboarding.diet.subtitle'), options: [option('diet', 'none', '🍽️'), option('diet', 'vegetarian', '🥬'), option('diet', 'vegan', '🌱'), option('diet', 'pescatarian', '🐟'), option('diet', 'halal', '🌙')] },
    { id: 'avoidIngredients', kind: 'multi', optional: true, title: t('fitnessOnboarding.avoid.title'), subtitle: t('fitnessOnboarding.avoid.subtitle'), options: [option('avoid', 'avoid_pork', '🥓'), option('avoid', 'avoid_alcohol', '🍷'), option('avoid', 'avoid_beef', '🥩'), option('avoid', 'avoid_fish', '🐟'), option('avoid', 'avoid_dairy', '🥛'), option('avoid', 'avoid_gluten', '🌾'), option('avoid', 'avoid_egg', '🥚'), option('avoid', 'avoid_peanut', '🥜')] },
    { id: 'favoriteCuisineStyle', kind: 'multi', optional: true, title: t('fitnessOnboarding.cuisine.title'), subtitle: t('fitnessOnboarding.cuisine.subtitle'), options: [option('cuisine', 'cuisine_mediterranean', '🫒'), option('cuisine', 'cuisine_french', '🥖'), option('cuisine', 'cuisine_italian', '🍝'), option('cuisine', 'cuisine_middle_eastern', '🧆'), option('cuisine', 'cuisine_indian', '🍛'), option('cuisine', 'cuisine_asian', '🥢')] },
    { id: 'mealReflection', kind: 'interstitial', hideProgress: true, title: t('fitnessOnboarding.interstitials.meals.title'), subtitle: t('fitnessOnboarding.interstitials.meals.subtitle') },
    { id: 'socialProof', kind: 'socialProof', hideProgress: true, title: t('onboarding.socialProof.title') },
    { id: 'ready', kind: 'ready', hideProgress: true, title: t('fitnessOnboarding.ready.title'), subtitle: t('fitnessOnboarding.ready.subtitle') },
  ], [answers.fitnessGoal, answers.trainingDays, changeTitleKey, option, t]);

  const step = steps[index] || steps[steps.length - 1];
  const value = answers[step.id];
  const profile = useMemo<FitnessProfile>(() => {
    const base: FitnessProfile = {
      goal: normalizeFitnessGoal(answers.fitnessGoal),
      sex: String(answers.sex || 'unspecified') as FitnessProfile['sex'],
      age: Number(answers.age) || 30,
      heightCm: Number(answers.heightCm) || 170,
      currentWeightKg: Number(answers.currentWeightKg) || 70,
      targetChangeKg: Number(answers.targetChangeKg) || 0,
      durationWeeks: 0,
      activityLevel: String(answers.activityLevel || 'light') as FitnessProfile['activityLevel'],
      trainingDays: Number(answers.trainingDays) || 0,
      trainingDurationMinutes: Number(answers.trainingDurationMinutes) || 45,
      includeSnack: answers.includeSnack === 'true',
      diet: String(answers.diet || 'none'),
      avoidIngredients: Array.isArray(answers.avoidIngredients) ? answers.avoidIngredients : [],
      cookingTime: String(answers.cookingTime || 'less_than_30_minutes'),
      favoriteCuisineStyle: Array.isArray(answers.favoriteCuisineStyle) ? answers.favoriteCuisineStyle : [],
    };
    return base;
  }, [answers]);
  const projection = calculateFitnessProjection(profile);

  useEffect(() => {
    if (!__DEV__ || devJumpApplied.current || !routeParams.initialStep) return;
    const targetIndex = steps.findIndex((item) => item.id === routeParams.initialStep);
    if (targetIndex >= 0) {
      devJumpApplied.current = true;
      setIndex(targetIndex);
    }
  }, [routeParams.initialStep, steps]);

  const validate = () => {
    if (step.kind === 'number') {
      const number = Number(value);
      if (!Number.isFinite(number) || number < (step.min || 0) || number > (step.max || Infinity)) return t('fitnessOnboarding.numberError', { min: step.min, max: step.max });
      if (step.id === 'targetChangeKg' && !projection.isTargetWeightSupported) return t('fitnessOnboarding.change.targetError');
    }
    if (step.kind === 'multi' && !step.optional && (!Array.isArray(value) || value.length === 0)) return t('fitnessOnboarding.required');
    return '';
  };

  const persist = async () => {
    const serialized: Record<string, string> = {};
    Object.entries(answers).forEach(([key, item]) => { serialized[key] = Array.isArray(item) ? JSON.stringify(item) : String(item); });
    serialized.entryFeature = 'generate';
    serialized.fitnessGoal = profile.goal;
    serialized.trainingDurationMinutes = String(profile.trainingDurationMinutes ?? 45);
    serialized.nutritionWeightKg = String(profile.currentWeightKg);
    serialized.dailyCalorieAdjustment = '0';
    serialized.targetWeightKg = String(projection.targetWeightKg);
    const today = weightDateKey();
    let existing = normalizeWeightLogs([]);
    try { existing = normalizeWeightLogs(JSON.parse(await AsyncStorage.getItem(WEIGHT_LOGS_KEY) || '[]')); } catch { /* Ignore corrupt legacy history. */ }
    const initialLogs = existing.length ? existing : [{ date: today, weight: profile.currentWeightKg }];
    await AsyncStorage.multiSet([[WEIGHT_LOGS_KEY, JSON.stringify(initialLogs)], ...Object.entries(serialized), [WEIGHT_REVIEW_KEY, JSON.stringify({ context: weightReviewContext({ ...profile, targetWeightKg: projection.targetWeightKg }), since: weightDateKey() })]]);
    await AsyncStorage.setItem('questions_answered', 'true');
    try {
      const mobileId = await getUniqueDeviceId();
      const timezone = Localization.getCalendars()[0]?.timeZone || undefined;
      const response = await apiService.saveOnboardingAnswers(serialized, mobileId, timezone);
      if (response.data?.userId) await AsyncStorage.setItem('userId', response.data.userId);
    } catch { /* La copie locale permet de reprendre le parcours hors ligne. */ }
  };

  const moveTo = (nextIndex: number) => {
    if (transitioning.current) return;
    transitioning.current = true;
    const leavingSocialProof = step.kind === 'socialProof' && steps[nextIndex]?.kind === 'ready';
    const exitAnimation = leavingSocialProof
      ? Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 0, duration: 420, useNativeDriver: true }),
        Animated.timing(socialProofExit, { toValue: 1, duration: 520, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ])
      : Animated.timing(contentOpacity, { toValue: 0, duration: 160, useNativeDriver: true });
    exitAnimation.start(() => {
      setIndex(nextIndex);
      setError('');
      contentOpacity.setValue(0);
      socialProofExit.setValue(0);
      Animated.timing(contentOpacity, { toValue: 1, duration: leavingSocialProof ? 420 : 280, useNativeDriver: true }).start(() => { transitioning.current = false; });
    });
  };

  const continueFlow = async () => {
    if (transitioning.current || saving) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    await feedback.light();
    analytics.track('fitness_onboarding_step_completed', { step_id: step.id, step_index: index });
    if (index < steps.length - 1) { moveTo(index + 1); return; }
    setSaving(true);
    await persist();
    router.replace('/onboarding/loading');
  };

  const select = (next: string) => {
    if (transitioning.current) return;
    void feedback.selection();
    setError('');
    if (step.kind === 'multi') {
      const current = Array.isArray(value) ? value : [];
      setAnswers((old) => ({ ...old, [step.id]: current.includes(next) ? current.filter((item) => item !== next) : [...current, next] }));
      return;
    }
    setAnswers((old) => ({ ...old, [step.id]: next }));
    analytics.track('fitness_onboarding_answered', { step_id: step.id });
    setTimeout(() => moveTo(index + 1), 180);
  };

  const showContinue = step.kind !== 'single';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.progressHeader, { paddingTop: insets.top + 5 }, step.hideProgress && { display: 'none' }]}>
        <NavigationIconButton onPress={() => index > 0 ? moveTo(index - 1) : router.back()} style={styles.backButton} />
        <View style={styles.progressTrackContainer}><OnboardingProgressBar progress={(index + 1) / steps.length} /></View>
      </View>
      <OnboardingScrollView stepKey={step.id} contentContainerStyle={[styles.scrollContent, { paddingTop: step.hideProgress ? insets.top + 18 : 0, paddingBottom: showContinue ? 140 + insets.bottom : 30 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} scrollEnabled>
        <Image source={require('../../assets/images/mascot.png')} contentFit="contain" transition={0} style={[styles.progressMascot, step.hideProgress && { display: 'none' }]} />
        <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
          {step.kind === 'interstitial' && <Interstitial id={step.id} title={step.title} subtitle={step.subtitle} projection={projection} profile={profile} t={t} />}
          {step.kind === 'socialProof' && <SocialProofContent t={t} goal={profile.goal} exit={socialProofExit} windowWidth={windowWidth} />}
          {step.kind === 'ready' && <ReadyContent title={step.title} subtitle={step.subtitle} t={t} windowWidth={windowWidth} />}
          {(step.kind === 'single' || step.kind === 'multi' || step.kind === 'number') && (
            <>
              <Text style={styles.title}>{step.title}</Text>
              {!!step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}
              {step.kind === 'number' && (
                <View style={styles.numberRow}>
                  <TextInput value={typeof value === 'string' ? value : ''} onChangeText={(text) => { setError(''); setAnswers((old) => ({ ...old, [step.id]: text.replace(',', '.') })); }} keyboardType="decimal-pad" autoFocus maxLength={5} style={styles.numberInput} placeholder="0" placeholderTextColor="#C8BFA5" />
                  <Text style={styles.unit}>{step.unit}</Text>
                </View>
              )}
              {(step.kind === 'single' || step.kind === 'multi') && (
                <View style={styles.cardsContainer}>
                  {step.options?.map((item) => {
                    const selected = Array.isArray(value) ? value.includes(item.value) : value === item.value;
                    return (
                      <TouchableOpacity key={item.value} onPress={() => select(item.value)} activeOpacity={0.8} style={[styles.card, selected && styles.cardSelected]}>
                        <Text style={styles.emoji}>{item.emoji}</Text>
                        <View style={{ flex: 1 }}><Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>{item.label}</Text>{item.description && <Text style={styles.optionDescription}>{item.description}</Text>}</View>
                        {step.kind === 'multi' ? <View style={[styles.checkboxBox, selected && styles.checkboxChecked]}>{selected && <Ionicons name="checkmark" size={16} color="white" />}</View> : <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>{selected && <View style={styles.radioButtonInner} />}</View>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {!!error && <Text style={styles.error}>{error}</Text>}
            </>
          )}
        </Animated.View>
      </OnboardingScrollView>
      {showContinue && <OnboardingFooter loading={saving} label={step.kind === 'ready' ? t('fitnessOnboarding.ready.cta') : t('onboarding.continue')} onPress={() => void continueFlow()} />}
    </KeyboardAvoidingView>
  );
}

function Interstitial({ id, title, subtitle, projection, profile, t }: { id: string; title: string; subtitle?: string; projection: ReturnType<typeof calculateFitnessProjection>; profile: FitnessProfile; t: (key: string, options?: Record<string, unknown>) => string }) {
  const isProfile = id === 'profileReflection';
  const isMeals = id === 'mealReflection';
  const facts = isProfile ? [
    { icon: 'flame-outline' as const, value: `≈ ${projection.dailyCalories}`, label: t('nutritionEstimate.caloriesPerDay') },
    { icon: 'barbell-outline' as const, value: `≈ ${projection.dailyProteinGrams} g`, label: t('fitnessOnboarding.projection.protein') },
  ] : [];
  const preferences = isMeals ? [
    { label: t('fitnessOnboarding.interstitials.meals.cooking'), value: t(`fitnessOnboarding.options.cookingTime.${profile.cookingTime}`) },
    { label: t('fitnessOnboarding.interstitials.meals.diet'), value: t(`fitnessOnboarding.options.diet.${profile.diet}`) },
    ...(profile.avoidIngredients.length ? [{ label: t('fitnessOnboarding.interstitials.meals.avoid'), value: profile.avoidIngredients.map(item => t(`fitnessOnboarding.options.avoid.${item}`)).join(', ') }] : []),
    ...(profile.favoriteCuisineStyle.length ? [{ label: t('fitnessOnboarding.interstitials.meals.cuisines'), value: profile.favoriteCuisineStyle.map(item => t(`fitnessOnboarding.options.cuisine.${item}`)).join(', ') }] : []),
  ] : [];
  const icon = isProfile ? 'calculator-outline' : isMeals ? 'restaurant-outline' : ({ gain_muscle: 'barbell-outline', lose_weight: 'trending-down-outline', maintain: 'scale-outline', balanced: 'leaf-outline' } as const)[profile.goal];
  return <View style={styles.interstitialContainer}>
    <OnboardingIconCard name={icon} style={styles.interstitialIcon} />
    <Text style={styles.interstitialTitle}>{title}</Text>
    {!!subtitle && <Text style={styles.interstitialSubtitle}>{subtitle}</Text>}
    {isProfile && <EntranceView entranceIndex={0} style={styles.answerContext}>
      <Text style={styles.answerContextText}>{t('fitnessOnboarding.interstitials.profile.activity', { activity: t(`fitnessOnboarding.options.activity.${profile.activityLevel}`) })}</Text>
      <Text style={styles.answerContextText}>{t(profile.trainingDays > 0 ? 'fitnessOnboarding.interstitials.profile.training' : 'fitnessOnboarding.interstitials.profile.noTraining', { days: profile.trainingDays, minutes: profile.trainingDurationMinutes ?? 45 })}</Text>
    </EntranceView>}
    {facts.length > 0 && <View style={styles.factRow}>{facts.map((fact) => <EntranceView entranceIndex={1} key={`${id}-${fact.label}`} style={styles.factCard}><Ionicons name={fact.icon} size={21} color={Colors.light.button} /><Text style={styles.factValue}>{fact.value}</Text><Text style={styles.factLabel}>{fact.label}</Text></EntranceView>)}</View>}
    {preferences.length > 0 && <EntranceView entranceIndex={2} style={styles.preferenceSummary}>{preferences.map(item => <View key={item.label} style={styles.preferenceRow}><Text style={styles.preferenceLabel}>{item.label}</Text><Text style={styles.preferenceValue}>{item.value}</Text></View>)}</EntranceView>}
    <View style={styles.reassurance}><Ionicons name="information-circle-outline" size={20} color={Colors.light.button} /><Text style={styles.reassuranceText}>{t(`fitnessOnboarding.interstitials.${id === 'goalReflection' ? 'goal' : isProfile ? 'profile' : 'meals'}.proof`)}</Text></View>
    {isProfile && <NutritionExplanation profile={profile} />}
  </View>;
}

function SocialProofContent({ t, goal, exit, windowWidth }: { t: (key: string, options?: Record<string, unknown>) => string; goal: FitnessGoal; exit: Animated.Value; windowWidth: number }) {
  const reviewGoals = [normalizeFitnessGoal(goal), 'balanced', 'gain_muscle', 'lose_weight', 'maintain']
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, 3) as FitnessGoal[];
  const reviews = reviewGoals.map((reviewGoal) => ({
    name: t(`fitnessOnboarding.social.reviews.${reviewGoal}.author`),
    text: t(`fitnessOnboarding.social.reviews.${reviewGoal}.text`),
  })).filter((review, index, items) => items.findIndex(item => item.name === review.name && item.text === review.text) === index);
  return (
    <Animated.View style={[styles.specialStepContainer, { transform: [{ translateX: exit.interpolate({ inputRange: [0, 1], outputRange: [0, -windowWidth] }) }] }]}>
      <View style={styles.topBadge}><Text style={styles.topBadgeText}>{t('onboarding.socialProof.topBadge')}</Text></View>
      <Text style={styles.title}>{t('fitnessOnboarding.social.title')}</Text>
      <View style={styles.ratingSection}><Text style={styles.ratingPrompt}>{t('fitnessOnboarding.social.subtitle')}</Text><View style={styles.starsContainer}>{[1, 2, 3, 4, 5].map((star) => <Ionicons key={star} name="star" size={32} color={Colors.light.button} />)}</View></View>
      <View style={styles.reviewsContainer}>{reviews.map((review) => <View key={review.name} style={styles.reviewCard}><View style={styles.reviewHeader}><Text style={styles.reviewName}>{review.name}</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <Ionicons key={star} name="star" size={14} color={Colors.light.button} />)}</View></View><Text style={styles.reviewText}>{review.text}</Text></View>)}</View>
    </Animated.View>
  );
}

function ReadyContent({ title, subtitle, t, windowWidth }: { title: string; subtitle?: string; t: (key: string) => string; windowWidth: number }) {
  const translateX = useRef(new Animated.Value(windowWidth)).current;
  const scale = useRef(new Animated.Value(0.72)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, tension: 48, friction: 8, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.6, duration: 900, easing: Easing.out(Easing.back(1.35)), useNativeDriver: true }),
    ]).start();
  }, [scale, translateX]);

  return <View style={styles.readyContainer}>
    <Animated.View style={[styles.readyMascotStage, { transform: [{ translateX }, { scale }] }]}>
      <Image source={require('../../assets/images/mascot.png')} contentFit="contain" style={styles.readyMascot} />
    </Animated.View>
    <View style={styles.readyBadge}><Ionicons name="checkmark-circle" size={20} color={Colors.light.button} /><Text style={styles.readyBadgeText}>{t('onboardingReady.badge')}</Text></View>
    <Text style={styles.interstitialTitle}>{title}</Text>
    {!!subtitle && <Text style={styles.interstitialSubtitle}>{subtitle}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF9E2' },
  progressHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 5, gap: 14 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F2F5', justifyContent: 'center', alignItems: 'center' },
  progressTrackContainer: { flex: 1, height: 36, justifyContent: 'center' },
  scrollContent: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  progressMascot: { width: rw(0.25), height: rw(0.25), alignSelf: 'center', transform: [{ rotate: '20deg' }] },
  content: { flex: 1 },
  title: { textAlign: 'center', fontSize: rw(0.08), lineHeight: rw(0.1), fontFamily: 'Degular', color: Colors.light.text },
  subtitle: { marginTop: 12, marginBottom: 32, paddingHorizontal: 12, textAlign: 'center', fontSize: 16, lineHeight: 22, fontFamily: 'CronosPro', color: Colors.light.textSecondary },
  cardsContainer: { width: '100%', gap: 16, paddingHorizontal: Platform.OS === 'android' ? 4 : 0, paddingBottom: 12 },
  card: { minHeight: 68, backgroundColor: 'white', borderRadius: 200, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 2, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  cardSelected: { borderColor: Colors.light.button },
  emoji: { width: 34, marginRight: 12, textAlign: 'center', fontSize: 20 },
  cardTitle: { flex: 1, fontSize: rw(0.05), lineHeight: rw(0.06), fontFamily: 'Degular', color: Colors.light.text },
  optionDescription: { marginTop: 6, fontFamily: 'CronosPro', fontSize: 14, lineHeight: 19, color: Colors.light.textSecondary },
  cardTitleSelected: { color: Colors.light.button },
  radioButton: { width: 24, height: 24, marginLeft: 16, borderRadius: 12, borderWidth: 2, borderColor: Colors.light.border, justifyContent: 'center', alignItems: 'center' },
  radioButtonSelected: { borderColor: Colors.light.button },
  radioButtonInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.light.button },
  checkboxBox: { width: 24, height: 24, marginLeft: 16, borderRadius: 6, borderWidth: 2, borderColor: Colors.light.border, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { borderColor: Colors.light.button, backgroundColor: Colors.light.button },
  numberRow: { alignSelf: 'center', flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 24 },
  numberInput: { minWidth: 160, borderBottomWidth: 3, borderBottomColor: Colors.light.button, color: Colors.light.text, fontFamily: 'Degular', fontSize: 64, textAlign: 'center', padding: 8 },
  unit: { fontFamily: 'CronosPro', fontSize: 24, color: Colors.light.textSecondary },
  error: { marginTop: 18, color: '#C43A32', fontFamily: 'CronosProBold', fontSize: 15, textAlign: 'center' },
  interstitialContainer: { flex: 1, minHeight: 520, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  interstitialIcon: { marginBottom: 20 },
  answerContext: { marginTop: 18, gap: 5, width: '100%' },
  answerContextText: { textAlign: 'center', fontFamily: 'CronosPro', fontSize: 15, lineHeight: 21, color: Colors.light.textSecondary },
  preferenceSummary: { width: '100%', marginTop: 24, padding: 18, borderRadius: 20, backgroundColor: 'white', gap: 14 },
  preferenceRow: { gap: 3 },
  preferenceLabel: { fontFamily: 'CronosPro', fontSize: 13, lineHeight: 18, color: Colors.light.textSecondary },
  preferenceValue: { fontFamily: 'CronosProBold', fontSize: 16, lineHeight: 22, color: Colors.light.text },
  interstitialTitle: { textAlign: 'center', fontSize: rw(0.085), lineHeight: rw(0.105), fontFamily: 'Degular', color: Colors.light.text },
  interstitialSubtitle: { marginTop: 18, maxWidth: 340, textAlign: 'center', fontSize: 17, lineHeight: 23, fontFamily: 'CronosPro', color: Colors.light.textSecondary },
  factRow: { width: '100%', flexDirection: 'row', gap: 9, marginTop: 28 },
  factCard: { flex: 1, minHeight: 116, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'white', paddingHorizontal: 7, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  factValue: { marginTop: 8, fontFamily: 'Degular', fontSize: 25, color: Colors.light.text },
  factLabel: { marginTop: 1, minHeight: 30, fontFamily: 'CronosPro', fontSize: 12, lineHeight: 15, color: Colors.light.textSecondary, textAlign: 'center' },
  reassurance: { width: '100%', flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 16, padding: 14, borderRadius: 17, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#F4E6A8' },
  reassuranceText: { flex: 1, fontFamily: 'CronosProBold', fontSize: 14, lineHeight: 18, color: '#6A4B00' },
  specialStepContainer: { width: '100%', alignItems: 'center' },
  topBadge: { backgroundColor: '#FFFBEB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: Colors.light.button, marginBottom: 20 },
  topBadgeText: { color: Colors.light.button, fontSize: 14, fontFamily: 'Degular' },
  ratingSection: { backgroundColor: 'white', padding: 20, borderRadius: 24, width: '100%', alignItems: 'center', marginVertical: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  ratingPrompt: { fontSize: 18, color: Colors.light.text, textAlign: 'center', marginBottom: 12, fontFamily: 'Degular' },
  starsContainer: { flexDirection: 'row', gap: 12 },
  reviewsContainer: { width: '100%', gap: 12, paddingBottom: 8 },
  reviewCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewName: { fontSize: 16, color: Colors.light.text, fontFamily: 'Degular' },
  stars: { flexDirection: 'row', gap: 2 },
  reviewText: { fontFamily: 'CronosPro', fontSize: 14, lineHeight: 18, color: Colors.light.textSecondary },
  readyContainer: { flex: 1, minHeight: 520, alignItems: 'center', justifyContent: 'center' },
  readyMascotStage: { width: rw(0.32), height: rw(0.54), alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  readyMascot: { width: rw(0.32), height: rw(0.32), transform: [{ rotate: '20deg' }] },
  readyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, marginBottom: 20, gap: 8 },
  readyBadgeText: { color: Colors.light.button, fontSize: 16, fontFamily: 'Degular' },
});
