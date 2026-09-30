import { NavigationIconButton } from '../../components/NavigationIconButton';
import { PlanningCalorieNotice } from '../../components/planning/PlanningCalorieNotice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { feedback } from '../../services/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Reanimated, { FadeInDown, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { getIngredientIcon } from '../../constants/IngredientIcons';
import { PlanningLoadingView, usePlanningLoading } from '../../components/loading/PlanningLoadingView';
import { MealArtwork } from '../../components/planning/MealArtwork';
import { getTabBarHeight, MAX_FONT_SIZE_MULTIPLIER } from '../../constants/Layout';
import { getRecipeImageSource } from '../../constants/RecipeImages';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { useSubscription } from '../../hooks/useSubscription';
import analytics from '../../services/analytics';
import { schedulePlanningReview } from '../../services/planningReview';
import { apiService, MealPlan, MealPlanMeal, ShoppingListItem } from '../../services/api';
import { fitnessProfileToPlanningPreferences, loadFitnessProfile } from '../../services/fitnessProfile';
import {
  addDays,
  dailyMealsForDays,
  DEFAULT_PLANNING_GENERATION_SETTINGS,
  isCompleteWeeklyPlan,
  isDateInsideRollingWeek,
  isUsableWeeklyPlan,
  loadPlanningGenerationSettings,
  normalizeCookingDays,
  PlanningGenerationSettings,
  roundNutritionValue,
  savePlanningGenerationSettings,
  startOfWeekMondayKey,
} from '../../services/weeklyPlanning';

type PlanningView = 'meals' | 'shopping';
const PLAN_CACHE_PREFIX = 'meal_plan_cache_v1';

function quantityText(item: ShoppingListItem): string {
  return item.quantities.map((quantity) => quantity.display).join(' + ');
}

export function WeeklyPlanner({ initialView = 'meals' }: { initialView?: PlanningView }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { ready: loadingReady, reset: resetLoadingBar, finish: finishLoadingBar, onComplete: completeLoadingBar } = usePlanningLoading();
  const { width, height, gutter, font } = useResponsive();
  const reduceMotion = useReducedMotion();
  const { subscriptionStatus, isLoading: subscriptionLoading } = useSubscription();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [view, setView] = useState<PlanningView>(initialView);
  const [generationSettings, setGenerationSettings] = useState<PlanningGenerationSettings>({
    ...DEFAULT_PLANNING_GENERATION_SETTINGS,
    cookingDays: [...DEFAULT_PLANNING_GENERATION_SETTINGS.cookingDays],
    mealsByDay: { ...DEFAULT_PLANNING_GENERATION_SETTINGS.mealsByDay },
    cuisineIds: [],
    excludedIngredients: [],
  });
  const [setupCookingDays, setSetupCookingDays] = useState<number[]>([...DEFAULT_PLANNING_GENERATION_SETTINGS.cookingDays]);
  const [settingsDraft, setSettingsDraft] = useState<PlanningGenerationSettings>({
    ...DEFAULT_PLANNING_GENERATION_SETTINGS,
    cookingDays: [...DEFAULT_PLANNING_GENERATION_SETTINGS.cookingDays],
    mealsByDay: { ...DEFAULT_PLANNING_GENERATION_SETTINGS.mealsByDay },
    cuisineIds: [],
    excludedIngredients: [],
  });
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const paywallOpened = useRef(false);
  const replaceExistingOnCreate = useRef(false);
  const planLoadRequest = useRef(0);

  const getUserId = useCallback(async () => AsyncStorage.getItem('userId'), []);

  useEffect(() => {
    void loadPlanningGenerationSettings().then((settings) => {
      setGenerationSettings(settings);
      setSetupCookingDays(settings.cookingDays);
      setSettingsDraft(settings);
    });
  }, []);

  const loadPlan = useCallback(async (refresh = false) => {
    const request = ++planLoadRequest.current;
    if (!subscriptionStatus.isSubscribed) {
      if (!subscriptionLoading) setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const userId = await getUserId();
      if (!userId) throw new Error(t('planning.errors.user'));
      const weekStart = startOfWeekMondayKey();
      const cacheKey = `${PLAN_CACHE_PREFIX}:${userId}:${weekStart}:${i18n.language.toLowerCase()}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (request !== planLoadRequest.current) return;
      if (cached) {
        try {
          const cachedPlan = JSON.parse(cached) as MealPlan;
          if (isUsableWeeklyPlan(cachedPlan)) {
            setPlan(cachedPlan);
            if (!refresh) setLoading(false);
          } else {
            replaceExistingOnCreate.current = true;
            await AsyncStorage.removeItem(cacheKey);
          }
        } catch {
          await AsyncStorage.removeItem(cacheKey);
        }
      }
      const response = await apiService.getMealPlan(userId);
      if (request !== planLoadRequest.current) return;
      if (response.error) throw new Error(response.error);
      const latestPlan = response.data?.plan || null;
      const reusablePlan = latestPlan
        && latestPlan.weekStart === weekStart
        && isDateInsideRollingWeek(latestPlan.weekStart, latestPlan.weekEnd)
        && isUsableWeeklyPlan(latestPlan)
        ? latestPlan
        : null;
      if (latestPlan && !reusablePlan) replaceExistingOnCreate.current = true;
      setPlan(reusablePlan);
    } catch (loadError) {
      if (request !== planLoadRequest.current) return;
      setError(loadError instanceof Error ? loadError.message : t('planning.errors.load'));
    } finally {
      if (request === planLoadRequest.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [getUserId, subscriptionLoading, subscriptionStatus.isSubscribed, i18n.language, t]);

  useEffect(() => {
    if (!plan) return;
    void getUserId().then((userId) => {
      if (!userId) return;
      return AsyncStorage.setItem(`${PLAN_CACHE_PREFIX}:${userId}:${plan.weekStart}:${(plan.language || i18n.language).toLowerCase()}`, JSON.stringify(plan));
    }).catch(() => undefined);
  }, [getUserId, plan, i18n.language]);

  useFocusEffect(useCallback(() => {
    void loadPlan();
    return () => { ++planLoadRequest.current; };
  }, [loadPlan]));

  useEffect(() => {
    if (subscriptionLoading || subscriptionStatus.isSubscribed || paywallOpened.current) return;
    paywallOpened.current = true;
    analytics.track('meal_planner_paywall_opened', { source: 'planning_tab' });
    router.push({ pathname: '/paywall', params: { source: 'meal_planner' } });
  }, [subscriptionLoading, subscriptionStatus.isSubscribed]);

  const createPlan = useCallback(async () => {
    resetLoadingBar();
    const generationStartedAt = performance.now();
    setCreating(true);
    setError(null);
    try {
      const [userId, profile] = await Promise.all([getUserId(), loadFitnessProfile()]);
      if (!userId) throw new Error(t('planning.errors.user'));
      const profilePreferences = fitnessProfileToPlanningPreferences(profile);
      const cookingDays = normalizeCookingDays(setupCookingDays);
      const preferences = {
        ...profilePreferences,
        cookingDays,
        mealsByDay: dailyMealsForDays(cookingDays),
        includeSnack: false,
        duration: generationSettings.duration,
        cuisineStyle: generationSettings.cuisineIds.length ? generationSettings.cuisineIds : profilePreferences.cuisineStyle,
        diet: generationSettings.diet !== 'none' ? generationSettings.diet : profilePreferences.diet,
        excludedIngredients: generationSettings.excludedIngredients,
      };
      const response = await apiService.createMealPlan({
        userId,
        weekStart: startOfWeekMondayKey(),
        preferences,
        isSubscribed: subscriptionStatus.isSubscribed,
        replaceExisting: replaceExistingOnCreate.current,
      });
      if (!isCompleteWeeklyPlan(response.data?.plan)) throw new Error(response.error || t('planning.errors.create'));
      if (!await finishLoadingBar(generationStartedAt)) return;
      setPlan(response.data.plan);
      replaceExistingOnCreate.current = false;
      setView('meals');
      schedulePlanningReview(response.data.plan._id);
      await feedback.success();
      analytics.track('meal_plan_created', {
        plan_id: response.data.plan._id,
        meal_count: response.data.plan.meals.length,
        cooking_days: preferences.cookingDays.join(','),
        ready_count: response.data.plan.meals.filter((meal) => meal.status === 'ready').length,
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t('planning.errors.create'));
      await feedback.error();
    } finally {
      setCreating(false);
    }
  }, [generationSettings, getUserId, setupCookingDays, subscriptionStatus.isSubscribed, t, finishLoadingBar, resetLoadingBar]);

  const openRecipe = useCallback(async (meal: MealPlanMeal) => {
    if (!plan || activeAction) return;
    let recipeId = meal.recipeId;
    if (!recipeId || meal.status !== 'ready') {
      const userId = await getUserId();
      if (!userId) return;
      setActiveAction(`open:${meal.slotId}`);
      const response = await apiService.materializeMeal(plan._id, meal.slotId, userId);
      setActiveAction(null);
      if (!response.data?.plan || !response.data.recipeId) {
        setError(response.error || t('planning.errors.generateRecipe'));
        return;
      }
      setPlan(response.data.plan);
      recipeId = response.data.recipeId;
    }
    analytics.track('meal_plan_recipe_opened', { plan_id: plan._id, recipe_id: recipeId });
    router.push({
      pathname: '/recipe-detail',
      params: {
        recipeId,
        isHistory: 'true',
        source: 'meal_plan',
        mealPlanId: plan._id,
        mealSlotId: meal.slotId,
      },
    });
  }, [activeAction, getUserId, plan, t]);

  const createShoppingList = useCallback(async () => {
    if (!plan) return;
    const userId = await getUserId();
    if (!userId) return;
    setShoppingLoading(true);
    setError(null);
    const response = await apiService.generateShoppingList(plan._id, userId);
    if (response.data?.plan) {
      setPlan(response.data.plan);
      if (initialView === 'shopping') setView('shopping');
      else router.push('/(tabs)/shopping');
      await feedback.success();
      analytics.track('meal_plan_shopping_list_created', { plan_id: plan._id, item_count: response.data.plan.shoppingList.length });
    } else setError(response.error || t('planning.errors.shopping'));
    setShoppingLoading(false);
  }, [getUserId, initialView, plan, t]);

  const updateShoppingItem = useCallback(async (item: ShoppingListItem, patch: { checked?: boolean; excluded?: boolean }) => {
    if (!plan) return;
    const previous = plan;
    setPlan({
      ...plan,
      shoppingList: plan.shoppingList.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry),
    });
    await feedback.selection();
    const userId = await getUserId();
    if (!userId) return;
    const response = await apiService.updateShoppingItem(plan._id, item.id, userId, patch);
    if (response.data?.plan) setPlan(response.data.plan);
    else { setPlan(previous); setError(response.error || t('planning.errors.update')); }
  }, [getUserId, plan, t]);

  const groupedShopping = useMemo(() => {
    const groups = new Map<string, ShoppingListItem[]>();
    for (const item of plan?.shoppingList || []) {
      const list = groups.get(item.category) || [];
      list.push(item);
      groups.set(item.category, list);
    }
    return [...groups.entries()];
  }, [plan?.shoppingList]);

  const startNewPlan = useCallback(() => {
    Alert.alert(t('planning.newPlanConfirm.title'), t('planning.newPlanConfirm.description'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('planning.newPlanConfirm.action'),
        style: 'destructive',
        onPress: () => {
          replaceExistingOnCreate.current = true;
          setSetupCookingDays(generationSettings.cookingDays);
          setPlan(null);
        },
      },
    ]);
  }, [generationSettings.cookingDays, t]);

  const toggleSetupDay = useCallback((dayIndex: number) => {
    setSetupCookingDays((current) => {
      if (current.includes(dayIndex)) {
        if (current.length === 1) return current;
        return current.filter((day) => day !== dayIndex);
      }
      return [...current, dayIndex].sort((a, b) => a - b);
    });
  }, []);

  const toggleSettingsDay = useCallback((dayIndex: number) => {
    setSettingsDraft((current) => {
      const cookingDays = current.cookingDays.includes(dayIndex)
        ? current.cookingDays.length === 1
          ? current.cookingDays
          : current.cookingDays.filter((day) => day !== dayIndex)
        : [...current.cookingDays, dayIndex].sort((a, b) => a - b);
      return { ...current, cookingDays };
    });
  }, []);

  const openSettings = useCallback(() => {
    setSettingsDraft({
      ...generationSettings,
      cookingDays: [...generationSettings.cookingDays],
      mealsByDay: { ...generationSettings.mealsByDay },
      cuisineIds: [...generationSettings.cuisineIds],
      excludedIngredients: [...generationSettings.excludedIngredients],
    });
    setSettingsVisible(true);
  }, [generationSettings]);

  const persistSettings = useCallback(async () => {
    const normalized = { ...settingsDraft, cookingDays: normalizeCookingDays(settingsDraft.cookingDays) };
    await savePlanningGenerationSettings(normalized);
    setGenerationSettings(normalized);
    setSetupCookingDays(normalized.cookingDays);
    setSettingsVisible(false);
    await feedback.success();
  }, [settingsDraft]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, dayIndex) => {
    const dateKey = addDays(plan?.weekStart || startOfWeekMondayKey(), dayIndex);
    const date = new Date(`${dateKey}T12:00:00`);
    const label = new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'long' }).format(date);
    return {
      dateKey,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      short: new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'short' }).format(date),
      number: date.getDate(),
    };
  }), [i18n.resolvedLanguage, plan?.weekStart]);
  const allMeals = useMemo(() => [...(plan?.meals || [])]
    .sort((a, b) => ((a.dayIndex ?? 0) - (b.dayIndex ?? 0)) || a.position - b.position), [plan?.meals]);
  const tabBottomPadding = getTabBarHeight(width, height) + insets.bottom + 40;

  if (loading || subscriptionLoading || creating) {
    return <PlanningLoadingView ready={loadingReady} onComplete={completeLoadingBar} />;
  }

  return (
    <LinearGradient colors={['#FDF9E2', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} locations={[0, 0.7]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: gutter, paddingBottom: tabBottomPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadPlan(true)} tintColor={Colors.light.button} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={contentColumn()}>
          <Reanimated.View entering={reduceMotion ? undefined : FadeInDown.duration(350)}>
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER} style={[styles.title, { fontSize: font(32) }]}>{t(view === 'shopping' ? 'planning.shoppingTitle' : 'planning.title')}</Text>
                <Text maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER} style={[styles.subtitle, { fontSize: font(17) }]}>{t(view === 'shopping' ? 'planning.shoppingSubtitle' : 'planning.subtitle')}</Text>
              </View>
              <View style={styles.headerActions}>
                {plan && (
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('planning.newPlan')} style={styles.newPlanButton} onPress={startNewPlan}>
                    <Ionicons name="refresh" size={21} color={Colors.light.button} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('planning.settings.title')} style={styles.newPlanButton} onPress={openSettings}>
                  <Ionicons name="settings-outline" size={21} color={Colors.light.button} />
                </TouchableOpacity>
              </View>
            </View>
          </Reanimated.View>

          {error && (
            <Reanimated.View entering={reduceMotion ? undefined : FadeInDown.duration(220)} exiting={FadeOut.duration(150)} style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={20} color="#9B3B32" />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => setError(null)} hitSlop={10}><Ionicons name="close" size={19} color="#9B3B32" /></Pressable>
            </Reanimated.View>
          )}

          {!plan ? (
            <Reanimated.View entering={reduceMotion ? undefined : FadeInDown.duration(400).delay(80)} style={styles.setupCard}>
              <View style={styles.setupIcon}><Ionicons name="calendar" size={31} color={Colors.light.button} /></View>
              <Text style={[styles.setupTitle, { fontSize: font(25) }]}>{t('planning.generation.title')}</Text>
              <Text style={[styles.setupDescription, { fontSize: font(16) }]}>{t('planning.generation.subtitle')}</Text>
              <Text style={styles.daySelectionLabel}>{t('planning.generation.daysTitle')}</Text>
              <View style={styles.weekdayGrid}>
                {days.map((day, dayIndex) => {
                  const selected = setupCookingDays.includes(dayIndex);
                  return (
                    <TouchableOpacity
                      key={day.dateKey}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggleSetupDay(dayIndex)}
                      style={[styles.weekdayChoice, selected && styles.weekdayChoiceActive]}
                    >
                      <Text style={[styles.weekdayChoiceText, selected && styles.weekdayChoiceTextActive]}>{day.short.replace('.', '')}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={[styles.primaryButton, creating && styles.buttonDisabled]} onPress={() => void createPlan()} disabled={creating} activeOpacity={0.85}>
                {creating ? <ActivityIndicator color="white" /> : <>
                  <Text style={styles.primaryButtonText}>{t('planning.generation.cta')}</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>}
              </TouchableOpacity>
            </Reanimated.View>
          ) : (
            <>
              {view === 'meals' ? (
                <>
                  <View style={styles.planSummary}>
                    <Text style={styles.summaryTitle}>{t('planning.weekTitle')}</Text>
                  </View>

                  <PlanningCalorieNotice plan={plan} />
                  <View style={styles.mealList}>
                    {allMeals.map((meal, index) => {
                      const pending = meal.status === 'generating';
                      return (
                        <Reanimated.View
                          key={meal.slotId}
                          entering={reduceMotion ? undefined : FadeInDown.duration(320).delay(Math.min(index * 45, 220))}
                          layout={reduceMotion ? undefined : LinearTransition.duration(220)}
                          style={styles.mealCard}
                        >
                          <Pressable style={styles.mealMain} onPress={() => void openRecipe(meal)} disabled={activeAction === `open:${meal.slotId}`}>
                            <View style={styles.mealImageWrap}>
                              {meal.image ? <Image source={getRecipeImageSource(meal.image)} style={styles.mealImage} contentFit="cover" transition={reduceMotion ? 0 : 180} /> : (
                                <MealArtwork meal={meal} style={styles.mealPlaceholder} />
                              )}
                              {pending && <View style={styles.imageBusy}><ActivityIndicator size="small" color="white" /></View>}
                            </View>
                            <View style={styles.mealCopy}>
                              <View style={styles.mealBadges}>
                                <Text style={styles.dayNameBadge}>{days[meal.dayIndex ?? 0]?.label}</Text>
                                <Text style={styles.dateBadge}>{t(`search.categories.${({ breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' } as const)[meal.mealType || 'lunch']}`)}</Text>
                              </View>
                              <Text numberOfLines={2} style={styles.mealTitle}>{meal.title}</Text>
                              <Text numberOfLines={2} style={styles.mealMeta}>
                                {activeAction === `open:${meal.slotId}`
                                  ? t('planning.finishing')
                                  : `${roundNutritionValue(meal.calories)} kcal  ·  P ${roundNutritionValue(meal.proteins)}g  ·  G ${roundNutritionValue(meal.carbs)}g  ·  L ${roundNutritionValue(meal.fats)}g`}
                              </Text>
                            </View>
                            {activeAction === `open:${meal.slotId}`
                              ? <ActivityIndicator size="small" color={Colors.light.button} />
                              : <Ionicons name="chevron-forward" size={18} color="#AAA38F" />}
                          </Pressable>
                        </Reanimated.View>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, shoppingLoading && styles.buttonDisabled]}
                    onPress={() => void createShoppingList()}
                    disabled={shoppingLoading}
                    activeOpacity={0.85}
                  >
                    {shoppingLoading ? <ActivityIndicator color="white" /> : <>
                      <Ionicons name="cart" size={20} color="white" />
                      <Text style={styles.primaryButtonText}>{plan.shoppingList.length ? t('planning.shopping.refresh') : t('planning.shopping.create')}</Text>
                    </>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {plan.shoppingList.length === 0 ? (
                    <View style={styles.shoppingEmpty}>
                      <View style={styles.setupIcon}><Ionicons name="cart" size={31} color={Colors.light.button} /></View>
                      <Text style={styles.setupTitle}>{t('planning.shopping.emptyTitle')}</Text>
                      <Text style={styles.setupDescription}>{t('planning.shopping.emptyDescription')}</Text>
                      <TouchableOpacity style={[styles.primaryButton, shoppingLoading && styles.buttonDisabled]} disabled={shoppingLoading} onPress={() => void createShoppingList()}>
                        {shoppingLoading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>{t('planning.shopping.create')}</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={styles.shoppingProgress}>
                        <Text style={styles.summaryTitle}>{t('planning.shopping.progress', {
                          done: plan.shoppingList.filter((item) => item.checked || item.excluded).length,
                          total: plan.shoppingList.length,
                        })}</Text>
                        <TouchableOpacity onPress={() => void createShoppingList()}><Ionicons name="refresh" size={21} color={Colors.light.button} /></TouchableOpacity>
                      </View>
                      {groupedShopping.map(([category, items]) => (
                        <View key={category} style={styles.shoppingGroup}>
                          <Text style={styles.categoryTitle}>{t(`planning.categories.${category}`)}</Text>
                          <View style={styles.shoppingGroupRows}>
                            {items.map((item) => (
                              <Reanimated.View key={item.id} layout={reduceMotion ? undefined : LinearTransition.duration(180)} style={[styles.shoppingItem, (item.checked || item.excluded) && styles.shoppingItemDone]}>
                              <Pressable style={styles.checkButton} onPress={() => void updateShoppingItem(item, { checked: !item.checked })} accessibilityRole="checkbox" accessibilityState={{ checked: item.checked }}>
                                <Ionicons name={item.checked ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={item.checked ? Colors.light.button : '#B7B7B7'} />
                              </Pressable>
                              <Text style={styles.shoppingEmoji}>{getIngredientIcon(item.name, item.icon)}</Text>
                              <View style={styles.shoppingCopy}>
                                <Text style={[styles.shoppingName, (item.checked || item.excluded) && styles.struck]}>{item.name}</Text>
                                <Text style={styles.shoppingQuantity}>{quantityText(item)}</Text>
                              </View>
                              <TouchableOpacity
                                style={[styles.haveButton, item.excluded && styles.haveButtonActive]}
                                onPress={() => void updateShoppingItem(item, { excluded: !item.excluded })}
                                accessibilityLabel={t('planning.shopping.haveIt')}
                              >
                                <Ionicons name="home-outline" size={17} color={item.excluded ? 'white' : Colors.light.button} />
                              </TouchableOpacity>
                              </Reanimated.View>
                            ))}
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={settingsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSettingsVisible(false)}>
        <LinearGradient colors={['#FDF9E2', '#FFFFFF']} style={styles.settingsFill}>
          <ScrollView contentContainerStyle={[styles.settingsContent, { paddingTop: Math.max(insets.top, 24), paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
            <View style={styles.settingsHeader}>
              <View>
                <Text style={[styles.title, { fontSize: font(32) }]}>{t('planning.settings.title')}</Text>
                <Text style={[styles.subtitle, { fontSize: font(16) }]}>{t('planning.settings.subtitle')}</Text>
              </View>
              <NavigationIconButton kind="close" style={styles.closeSettingsButton} onPress={() => setSettingsVisible(false)} accessibilityLabel={t('common.close')} />
            </View>

            <View style={styles.settingsCard}>
              <Text style={styles.settingsSectionTitle}>{t('planning.generation.daysTitle')}</Text>
              <Text style={styles.settingsHelp}>{t('planning.settings.daysHelp')}</Text>
              <View style={styles.weekdayGrid}>
                {days.map((day, dayIndex) => {
                  const selected = settingsDraft.cookingDays.includes(dayIndex);
                  return (
                    <TouchableOpacity key={day.dateKey} onPress={() => toggleSettingsDay(dayIndex)} style={[styles.weekdayChoice, selected && styles.weekdayChoiceActive]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}>
                      <Text style={[styles.weekdayChoiceText, selected && styles.weekdayChoiceTextActive]}>{day.short.replace('.', '')}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.settingsCard}>
              <Text style={styles.settingsSectionTitle}>{t('planning.settings.durationTitle')}</Text>
              <Text style={styles.settingsHelp}>{t('planning.settings.durationHelp')}</Text>
              <View style={styles.durationChoices}>
                {(['all', 'fast', 'medium'] as const).map((duration) => {
                  const selected = settingsDraft.duration === duration;
                  return (
                    <TouchableOpacity key={duration} onPress={() => setSettingsDraft((current) => ({ ...current, duration }))} style={[styles.durationChoice, selected && styles.durationChoiceActive]}>
                      <Text style={[styles.durationChoiceText, selected && styles.durationChoiceTextActive]}>{t(`planning.settings.duration.${duration}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Text style={styles.settingsNotice}>{t('planning.settings.nextPlanNotice')}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => void persistSettings()} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>{t('planning.settings.save')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

export default function PlanningScreen() {
  return <WeeklyPlanner initialView="meals" />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerCopy: { flex: 1, paddingRight: 12 },
  title: { fontFamily: 'Degular', color: Colors.light.text, lineHeight: 38 },
  subtitle: { fontFamily: 'CronosPro', color: Colors.light.textSecondary, lineHeight: 22, marginTop: 3 },
  newPlanButton: {
    width: 44, height: 44, borderRadius: 16, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 2 } }),
  },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#FFF0ED', borderRadius: 16, padding: 13, marginBottom: 14, borderWidth: 1, borderColor: '#F1C7C2' },
  errorText: { flex: 1, fontFamily: 'CronosPro', fontSize: 15, color: '#82342D', lineHeight: 19 },
  setupCard: {
    backgroundColor: 'white', borderRadius: 24, padding: 22,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 15 }, android: { elevation: 2 } }),
  },
  setupIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  setupTitle: { fontFamily: 'Degular', color: Colors.light.text, lineHeight: 30 },
  setupDescription: { fontFamily: 'CronosPro', color: Colors.light.textSecondary, lineHeight: 22, marginTop: 5 },
  daySelectionLabel: { fontFamily: 'CronosProBold', fontSize: 16, color: Colors.light.text, marginTop: 22, marginBottom: 10 },
  weekdayGrid: { flexDirection: 'row', gap: 7 },
  weekdayChoice: { flex: 1, height: 46, minWidth: 36, borderRadius: 15, backgroundColor: '#F4F1E7', borderWidth: 1, borderColor: '#E8E1C9', alignItems: 'center', justifyContent: 'center' },
  weekdayChoiceActive: { backgroundColor: Colors.light.button, borderColor: Colors.light.button },
  weekdayChoiceText: { fontFamily: 'CronosProBold', fontSize: 13, color: Colors.light.textSecondary, textTransform: 'capitalize' },
  weekdayChoiceTextActive: { color: 'white' },
  countLabel: { fontFamily: 'CronosProBold', fontSize: 16, color: Colors.light.text, marginTop: 24, marginBottom: 11 },
  countGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  countButton: { flex: 1, height: 44, minWidth: 38, borderRadius: 14, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' },
  countButtonSelected: { backgroundColor: Colors.light.button, borderColor: Colors.light.button, transform: [{ scale: 1.04 }] },
  countText: { fontFamily: 'CronosProBold', fontSize: 17, color: Colors.light.textSecondary },
  countTextSelected: { color: 'white' },
  primaryButton: { minHeight: 56, borderRadius: 200, backgroundColor: Colors.light.button, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 20, paddingHorizontal: 20, shadowColor: Colors.light.button, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  primaryButtonText: { fontFamily: 'Degular', fontSize: 20, color: 'white' },
  buttonDisabled: { opacity: 0.52 },
  dayPicker: { gap: 8, paddingBottom: 16 },
  dayButton: { width: 54, height: 64, borderRadius: 18, backgroundColor: 'white', borderWidth: 1, borderColor: '#E9E9E9', alignItems: 'center', justifyContent: 'center' },
  dayButtonActive: { backgroundColor: Colors.light.button, borderColor: Colors.light.button },
  dayShort: { fontFamily: 'CronosProBold', fontSize: 12, color: Colors.light.textSecondary, textTransform: 'capitalize' },
  dayNumber: { fontFamily: 'Degular', fontSize: 20, color: Colors.light.text, marginTop: 1 },
  dayTextActive: { color: 'white' },
  dailyMacros: { flexDirection: 'row', gap: 6, backgroundColor: '#1E201D', borderRadius: 22, paddingVertical: 14, paddingHorizontal: 8, marginBottom: 18 },
  dailyMacro: { flex: 1, alignItems: 'center' },
  dailyMacroValue: { fontFamily: 'CronosProBold', fontSize: 16, color: 'white' },
  dailyMacroLabel: { fontFamily: 'CronosPro', fontSize: 10, color: '#BFC3BC', marginTop: 1 },
  planSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 },
  summaryTitle: { fontFamily: 'Degular', fontSize: 24, color: Colors.light.text },
  servingsPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', paddingHorizontal: 12, minHeight: 36, borderRadius: 18 },
  servingsText: { fontFamily: 'CronosProBold', fontSize: 15, color: Colors.light.button },
  mealList: { gap: 12 },
  mealCard: {
    backgroundColor: 'white', borderRadius: 22, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15 }, android: { elevation: 3 } }),
  },
  mealMain: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  mealImageWrap: { width: 96, height: 92, borderRadius: 18, overflow: 'hidden', backgroundColor: '#FFFBEB' },
  mealImage: { width: '100%', height: '100%' },
  mealPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageBusy: { position: 'absolute', inset: 0, backgroundColor: 'rgba(254,181,10,0.72)', alignItems: 'center', justifyContent: 'center' },
  mealCopy: { flex: 1, minWidth: 0 },
  mealBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  dayNameBadge: { fontFamily: 'CronosProBold', fontSize: 11, color: '#6A4B00', backgroundColor: '#FFF0BC', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, textTransform: 'capitalize' },
  lockBadge: { width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF4CF' },
  sourceBadge: { fontFamily: 'CronosProBold', fontSize: 11, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  dateBadge: { fontFamily: 'CronosProBold', fontSize: 11, color: Colors.light.textSecondary, textTransform: 'capitalize' },
  libraryBadge: { backgroundColor: '#EDEBFE', color: '#6C5CE7' },
  suggestionBadge: { backgroundColor: '#FFFBEB', color: Colors.light.button },
  mealTitle: { fontFamily: 'Degular', fontSize: 19, color: Colors.light.text, lineHeight: 21 },
  mealMeta: { fontFamily: 'CronosPro', fontSize: 13, color: Colors.light.textSecondary, marginTop: 3 },
  moreButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F7F3E5', alignItems: 'center', justifyContent: 'center' },
  pendingHint: { fontFamily: 'CronosPro', fontSize: 14, textAlign: 'center', color: Colors.light.textSecondary, marginTop: 9 },
  shoppingEmpty: {
    backgroundColor: 'white', borderRadius: 24, padding: 22,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 15 }, android: { elevation: 2 } }),
  },
  shoppingProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  shoppingGroup: { marginBottom: 18 },
  shoppingGroupRows: {
    borderRadius: 24, overflow: 'hidden', backgroundColor: '#F8F8FD',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15 }, android: { elevation: 3 } }),
  },
  categoryTitle: { fontFamily: 'CronosProBold', fontSize: 15, color: Colors.light.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 3 },
  shoppingItem: { minHeight: 64, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8FD', paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: '#EAEAEE' },
  shoppingItemDone: { backgroundColor: '#FFF8EA' },
  checkButton: { width: 38, height: 48, alignItems: 'flex-start', justifyContent: 'center' },
  shoppingEmoji: { fontSize: 24, width: 36 },
  shoppingCopy: { flex: 1, paddingVertical: 8 },
  shoppingName: { fontFamily: 'CronosProBold', fontSize: 16, color: Colors.light.text },
  shoppingQuantity: { fontFamily: 'CronosPro', fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  struck: { textDecorationLine: 'line-through', color: '#8A8A8A' },
  haveButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF4D6' },
  haveButtonActive: { backgroundColor: Colors.light.button },
  settingsFill: { flex: 1 },
  settingsContent: { paddingHorizontal: 22, gap: 14 },
  settingsHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  closeSettingsButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  settingsCard: { backgroundColor: 'white', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#EFE8CF' },
  settingsSectionTitle: { fontFamily: 'Degular', fontSize: 22, lineHeight: 25, color: Colors.light.text },
  settingsHelp: { fontFamily: 'CronosPro', fontSize: 14, lineHeight: 19, color: Colors.light.textSecondary, marginTop: 3, marginBottom: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  settingCopy: { flex: 1 },
  durationChoices: { flexDirection: 'row', gap: 8 },
  durationChoice: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: '#F4F1E7', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  durationChoiceActive: { backgroundColor: Colors.light.button },
  durationChoiceText: { fontFamily: 'CronosProBold', fontSize: 13, color: Colors.light.textSecondary, textAlign: 'center' },
  durationChoiceTextActive: { color: 'white' },
  settingsNotice: { fontFamily: 'CronosPro', fontSize: 14, lineHeight: 19, color: Colors.light.textSecondary, textAlign: 'center', paddingHorizontal: 12, marginTop: 2 },
});
