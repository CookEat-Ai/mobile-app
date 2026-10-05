import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService, CatalogCuisine, CatalogRecipe } from '../../services/api';
import { PlanMealCard } from '../../components/planning/PlanMealCard';
import { AppScreenHeading } from '../../components/AppScreenHeading';
import { NavigationIconButton } from '../../components/NavigationIconButton';
import { catalogMealCardData } from '../../services/catalogDisplay';
import { invalidatePlanning } from '../../services/planningUpdates';
import { replacedMealPlanningRoute } from '../../services/plannedMealNavigation';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { isPastPlanDay } from '../../services/planningDisplay';
import { feedback } from '../../services/haptics';

type Filter = 'all' | 'protein' | 'express' | 'favorites';
const FILTERS: Filter[] = ['all', 'protein', 'express', 'favorites'];

export default function ChooseRecipe() {
  const { planId, slotId, dayIndex, mealType } = useLocalSearchParams<{ planId: string; slotId?: string; dayIndex?: string; mealType?: string }>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gutter, font } = useResponsive();
  const [recipes, setRecipes] = useState<CatalogRecipe[]>([]);
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [cuisine, setCuisine] = useState('all');
  const [cuisines, setCuisines] = useState<CatalogCuisine[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const page = useRef(0);
  const pending = useRef(false);
  const ended = useRef(false);
  const requestId = useRef(0);
  const selecting = useRef(false);

  const load = useCallback(async (append = false) => {
    if (selecting.current || (append && (pending.current || ended.current))) return;
    const version = ++requestId.current;
    pending.current = true;
    setBusy(true);
    setError('');
    if (!append) { page.current = 0; ended.current = false; setRecipes([]); }
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error(t('planning.errors.user'));
      const planResponse = await apiService.getMealPlanById(planId, userId);
      if (version !== requestId.current) return;
      const plan = planResponse.data?.plan;
      const meal = plan?.meals.find(item => item.slotId === slotId);
      const targetType = meal?.mealType || mealType;
      if (!plan || isPastPlanDay(plan.weekStart, meal?.dayIndex ?? Number(dayIndex)) || !targetType) throw new Error(planResponse.error || t('planning.errors.load'));
      if (filter === 'favorites') {
        const response = await apiService.getFavorites(userId);
        if (version !== requestId.current) return;
        if (!response.data?.recipes) throw new Error(response.error || t('common.requestError'));
        // Only catalogue favorites expose replacement eligibility; imported recipes
        // are not accepted by the planning replacement endpoint.
        setRecipes(response.data.recipes.filter((item: CatalogRecipe) =>
          item.replacementMealTypes?.includes(targetType as any)));
        page.current = 1;
        ended.current = true;
        return;
      }
      const nextPage = append ? page.current + 1 : 1;
      const response = await apiService.getRecipeCatalog({
        page: nextPage, limit: 50, cuisineId: cuisine,
        mealType: targetType === 'breakfast' || targetType === 'snack' ? 'breakfast' : 'main',
        highProtein: filter === 'protein', express: filter === 'express',
        diet: typeof plan?.preferences?.diet === 'string' ? plan.preferences.diet : undefined,
        allergies: Array.isArray(plan?.preferences?.allergies) ? plan.preferences.allergies.filter((item): item is string => typeof item === 'string') : undefined,
        excludedIngredients: Array.isArray(plan?.preferences?.excludedIngredients) ? plan.preferences.excludedIngredients.filter((item): item is string => typeof item === 'string') : undefined,
      });
      if (version !== requestId.current) return;
      if (!response.data) throw new Error(response.error || t('common.requestError'));
      const compatible = response.data.recipes.filter(item => item.replacementMealTypes?.includes(targetType as any));
      setRecipes(current => append ? [...current, ...compatible] : compatible);
      page.current = nextPage;
      ended.current = nextPage * 50 >= response.data.total || response.data.recipes.length === 0;
    } catch (e) {
      if (version === requestId.current) setError(e instanceof Error ? e.message : t('common.requestError'));
    } finally {
      if (version === requestId.current) { pending.current = false; setBusy(false); }
    }
  }, [planId, slotId, dayIndex, mealType, cuisine, filter, t]);

  useEffect(() => {
    void load();
    return () => { requestId.current++; pending.current = false; };
  }, [load]);

  useEffect(() => {
    let active = true;
    void apiService.getCatalogCuisines().then(response => {
      if (active && response.data?.cuisines) setCuisines(response.data.cuisines.filter(item => item.coverage?.ready !== false));
    });
    return () => { active = false; };
  }, []);

  const language = (i18n.resolvedLanguage || 'fr').split(/[-_]/)[0];
  const cuisineChoices = [{ id: 'all', label: t('mealLibrary.cuisines.all') }, ...cuisines.map(item => ({
    id: item.id, label: item.names.find(name => name.language === language)?.value
      || item.names.find(name => name.language === 'fr')?.value || item.names[0]?.value || item.id,
  }))];

  const choose = async (recipeId: string) => {
    if (selecting.current) return;
    selecting.current = true; setChoosing(true); setError('');
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error(t('planning.errors.user'));
      const response = slotId ? await apiService.setPlannedMealRecipe(planId, slotId, userId, recipeId) : await apiService.addPlannedMeal(planId, userId, Number(dayIndex), mealType!, recipeId);
      if (!response.data?.plan) throw new Error(response.error || t('planning.errors.replace'));
      invalidatePlanning(); router.dismissTo(replacedMealPlanningRoute(response.data.plan, slotId || response.data.plan.meals.find(meal => meal.dayIndex === Number(dayIndex) && meal.mealType === mealType)!.slotId));
    } catch (e) { setError(e instanceof Error ? e.message : t('planning.errors.replace')); }
    finally { selecting.current = false; setChoosing(false); }
  };

  return <View style={appStyles.screen}>
    <View style={[appStyles.backHeader, { paddingTop: insets.top + 8, paddingHorizontal: gutter, marginBottom: 20 }]}>
      <NavigationIconButton onPress={() => router.back()} accessibilityLabel={t('common.back')} />
      <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}
        style={[appStyles.headerTitle, appStyles.backHeaderLeadingTitle, { fontSize: font(29) }]}>{t('recipeDetail.chooseReplacement')}</Text>
      {filter !== 'favorites' && <TouchableOpacity disabled={choosing} style={[appStyles.iconButton, cuisine !== 'all' && { backgroundColor: theme.yellow }]}
        accessibilityRole="button" accessibilityLabel={t('dailyApp.filters')} accessibilityState={{ selected: cuisine !== 'all', disabled: choosing }}
        onPress={() => { feedback.light(); setFiltersVisible(true); }}><Ionicons name="options-outline" size={24} color={theme.ink} /></TouchableOpacity>}
    </View>
    <FlatList style={{ flex: 1 }} contentContainerStyle={{ ...contentColumn(), paddingHorizontal: gutter, paddingBottom: insets.bottom + 30 }}
      data={recipes} keyExtractor={item => item.id} ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={<>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map(item => <TouchableOpacity key={item} disabled={choosing} accessibilityRole="button" accessibilityState={{ selected: item === filter, disabled: choosing }}
            onPress={() => { if (item !== filter) feedback.selection(); setFilter(item); }} style={[styles.filter, item === filter && styles.filterActive]}>
            <Text style={[styles.filterText, item === filter && styles.filterTextActive]}>{t(`mealLibrary.types.${item}`)}</Text>
          </TouchableOpacity>)}
        </ScrollView>
        {filter !== 'favorites' && cuisine !== 'all' && <TouchableOpacity disabled={choosing} style={styles.appliedFilter} accessibilityRole="button" accessibilityLabel={t('dailyApp.clearFilters')}
          onPress={() => { feedback.selection(); setCuisine('all'); }}><Text style={styles.filterText}>{cuisineChoices.find(item => item.id === cuisine)?.label}</Text><Ionicons name="close" size={16} color={theme.ink} /></TouchableOpacity>}
        {!!error && <View style={styles.state}><Text style={appStyles.error}>{error}</Text><TouchableOpacity style={appStyles.button} onPress={() => void load(recipes.length > 0)}><Text style={appStyles.buttonText}>{t('mealLibrary.retry')}</Text></TouchableOpacity></View>}
      </>}
      ListEmptyComponent={!busy && !error ? <View style={styles.state}><Text style={appStyles.subtitle}>{t('mealLibrary.empty')}</Text></View> : null}
      renderItem={({ item }) => <PlanMealCard meal={catalogMealCardData(item)} disabled={choosing} onPress={() => void choose(item.id)} />}
      onEndReached={() => { if (!error) void load(true); }} onEndReachedThreshold={0.5}
      ListFooterComponent={busy || choosing ? <ActivityIndicator style={{ paddingVertical: 20 }} color={theme.yellow} /> : null} />
    <Modal visible={filtersVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFiltersVisible(false)}>
      <View style={appStyles.screen}>
        <View style={{ ...contentColumn(), paddingHorizontal: gutter, paddingTop: 24 }}><AppScreenHeading title={t('dailyApp.cuisines')} action={<NavigationIconButton kind="close" onPress={() => setFiltersVisible(false)} />} /></View>
        <ScrollView contentContainerStyle={{ ...contentColumn(), paddingHorizontal: gutter, paddingBottom: insets.bottom + 32 }}>
          {cuisineChoices.map(item => <TouchableOpacity key={item.id} style={[styles.cuisineRow, cuisine === item.id && styles.cuisineSelected]} accessibilityRole="radio" accessibilityState={{ checked: cuisine === item.id }}
            onPress={() => { if (cuisine !== item.id) feedback.selection(); setCuisine(item.id); setFiltersVisible(false); }}><Text style={styles.cuisineText}>{item.label}</Text>{cuisine === item.id && <Ionicons name="checkmark-circle" size={23} color={theme.yellow} />}</TouchableOpacity>)}
        </ScrollView>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  filters: { gap: 8, paddingBottom: 20 },
  filter: { minHeight: 48, justifyContent: 'center', borderRadius: 17, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, paddingHorizontal: 17 },
  filterActive: { backgroundColor: theme.yellow, borderColor: theme.yellow },
  filterText: { fontFamily: 'Degular', fontSize: 17, color: theme.muted },
  filterTextActive: { color: 'white' },
  appliedFilter: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF6D9', paddingHorizontal: 14, minHeight: 44, borderRadius: 14, marginBottom: 18 },
  cuisineRow: { minHeight: 60, padding: 16, marginBottom: 10, borderRadius: 17, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cuisineSelected: { backgroundColor: '#FFF6D9', borderColor: theme.yellow },
  cuisineText: { fontFamily: 'Degular', fontSize: 19, color: theme.ink, flex: 1 },
  state: { ...appStyles.card, alignItems: 'center', gap: 16, marginBottom: 12 },
});
