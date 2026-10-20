import { AppSpinner as ActivityIndicator } from '../../components/ui/AppSpinner';
import { AppModal as Modal } from '../../components/ui/AppModal';
import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService, CatalogCuisine, CatalogRecipe } from '../../services/api';
import { catalogCuisineQuery, toggleCatalogCuisine } from '../../services/catalogCuisineFilters';
import { PlanMealCard } from '../../components/planning/PlanMealCard';
import { AppScreenHeading } from '../../components/AppScreenHeading';
import { NavigationIconButton } from '../../components/NavigationIconButton';
import { catalogMealCardData } from '../../services/catalogDisplay';
import { plannedMealChoicePreviewRoute } from '../../services/plannedMealNavigation';

import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { isPastPlanDay } from '../../services/planningDisplay';
import { feedback } from '../../services/haptics';

type Filter = 'all' | 'protein' | 'express' | 'favorites';
const FILTERS: Filter[] = ['all', 'protein', 'express', 'favorites'];

export default function ChooseRecipe() {
  const { planId, slotId, dayIndex, mealType, returnTo, source } = useLocalSearchParams<{ planId: string; slotId?: string; dayIndex?: string; mealType?: string; returnTo?: string; source?: string }>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gutter, font } = useResponsive();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [recipes, setRecipes] = useState<CatalogRecipe[]>([]);
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [cuisineIds, setCuisineIds] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<CatalogCuisine[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const page = useRef(0);
  const pending = useRef(false);
  const ended = useRef(false);
  const requestId = useRef(0);
  const selecting = useRef(false);
  useFocusEffect(useCallback(() => {
    selecting.current = false;
    setChoosing(false);
  }, []));

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
          item.replacementMealTypes?.includes(targetType as any) && (!query ||
            [item.title, ...(item.ingredients || []).map(ingredient => ingredient.name)].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()))));
        page.current = 1;
        ended.current = true;
        return;
      }
      const nextPage = append ? page.current + 1 : 1;
      const response = await apiService.getRecipeCatalog({
        page: nextPage, limit: 50, cuisineId: catalogCuisineQuery(cuisineIds), search: query,
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
  }, [planId, slotId, dayIndex, mealType, cuisineIds, filter, query, t]);

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
  const hasCuisineFilters = cuisineIds.length > 0;
  const selectCuisine = (id: string) => {
    if (choosing || (id === 'all' && !hasCuisineFilters)) return;
    feedback.selection();
    setCuisineIds(current => toggleCatalogCuisine(current, id));
  };

  const choose = (recipeId: string) => {
    if (selecting.current) return;
    selecting.current = true; setChoosing(true);
    feedback.light();
    router.push(plannedMealChoicePreviewRoute(recipeId, { planId, slotId, dayIndex, mealType, returnTo, source }));
  };

  return <View style={appStyles.screen}>
    <View style={[appStyles.backHeader, { paddingTop: insets.top + 8, paddingHorizontal: gutter, marginBottom: 20 }]}>
      <NavigationIconButton onPress={() => router.back()} accessibilityLabel={t('common.back')} />
      <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}
        style={[appStyles.headerTitle, appStyles.backHeaderLeadingTitle, { fontSize: font(29) }]}>{t('recipeDetail.chooseReplacement')}</Text>
      {filter !== 'favorites' && <TouchableOpacity disabled={choosing} style={[appStyles.iconButton, hasCuisineFilters && { backgroundColor: theme.yellow }]}
        accessibilityRole="button" accessibilityLabel={t('dailyApp.filters')} accessibilityState={{ selected: hasCuisineFilters, disabled: choosing }}
        onPress={() => { feedback.light(); setFiltersVisible(true); }}><Ionicons name="options-outline" size={24} color={hasCuisineFilters ? theme.surface : theme.ink} /></TouchableOpacity>}
    </View>
    <View style={[styles.search, { marginHorizontal: gutter }]}><Ionicons name="search" size={20} color={theme.muted} /><TextInput value={search} onChangeText={setSearch} editable={!choosing} placeholder={t('common.searchPlaceholder')} accessibilityLabel={t('common.searchPlaceholder')} style={styles.searchInput} returnKeyType="search" autoCorrect={false} onSubmitEditing={() => setQuery(search.trim())} />{!!search && <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('dailyApp.clearFilters')} disabled={choosing} onPress={() => setSearch('')}><Ionicons name="close-circle" size={22} color={theme.muted} /></TouchableOpacity>}</View>
    <FlatList keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ flex: 1 }} contentContainerStyle={{ ...contentColumn(), paddingHorizontal: gutter, paddingBottom: insets.bottom + 30 }}
      data={recipes} keyExtractor={item => item.id} ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={<>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map(item => <TouchableOpacity key={item} disabled={choosing} accessibilityRole="button" accessibilityState={{ selected: item === filter, disabled: choosing }}
            onPress={() => { if (item !== filter) feedback.selection(); setFilter(item); }} style={[styles.filter, item === filter && styles.filterActive]}>
            <Text style={[styles.filterText, item === filter && styles.filterTextActive]}>{t(`mealLibrary.types.${item}`)}</Text>
          </TouchableOpacity>)}
        </ScrollView>
        {filter !== 'favorites' && hasCuisineFilters && <View style={styles.appliedFilters}>{cuisineChoices.filter(item => cuisineIds.includes(item.id)).map(item =>
          <TouchableOpacity key={item.id} disabled={choosing} style={styles.appliedFilter} accessibilityRole="button" accessibilityLabel={`${t('dailyApp.clearFilters')}: ${item.label}`}
            onPress={() => selectCuisine(item.id)}><Text style={styles.filterText}>{item.label}</Text><Ionicons name="close" size={16} color={theme.ink} /></TouchableOpacity>
        )}</View>}
        {!!error && <View style={styles.state}><Text style={appStyles.error}>{error}</Text><TouchableOpacity style={appStyles.button} onPress={() => void load(recipes.length > 0)}><Text style={appStyles.buttonText}>{t('mealLibrary.retry')}</Text></TouchableOpacity></View>}
      </>}
      ListEmptyComponent={!busy && !error ? <View style={styles.state}><Text style={appStyles.subtitle}>{t('mealLibrary.empty')}</Text></View> : null}
      renderItem={({ item }) => <PlanMealCard meal={catalogMealCardData(item)} disabled={choosing} onPress={() => void choose(item.id)} />}
      onEndReached={() => { if (!error && query === search.trim()) void load(true); }} onEndReachedThreshold={0.5}
      ListFooterComponent={busy || choosing ? <ActivityIndicator style={{ paddingVertical: 20 }} color={theme.yellow} /> : null} />
    <Modal visible={filtersVisible} presentationStyle="pageSheet" onRequestClose={() => setFiltersVisible(false)}>
      <View style={appStyles.screen}>
        <View style={{ ...contentColumn(), paddingHorizontal: gutter, paddingTop: 24 }}><AppScreenHeading title={t('dailyApp.cuisines')} action={<NavigationIconButton kind="close" onPress={() => setFiltersVisible(false)} />} /></View>
        <ScrollView contentContainerStyle={{ ...contentColumn(), paddingHorizontal: gutter, paddingBottom: insets.bottom + 32 }}>
          {cuisineChoices.map(item => {
            const selected = item.id === 'all' ? !hasCuisineFilters : cuisineIds.includes(item.id);
            return <TouchableOpacity key={item.id} disabled={choosing} style={[styles.cuisineRow, selected && styles.cuisineSelected]} accessibilityRole="checkbox" accessibilityState={{ checked: selected, disabled: choosing }}
              onPress={() => selectCuisine(item.id)}><Text style={styles.cuisineText}>{item.label}</Text>{selected && <Ionicons name="checkmark-circle" size={23} color={theme.yellow} />}</TouchableOpacity>;
          })}
        </ScrollView>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 16, marginBottom: 16, borderRadius: AppRadii.control, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
  searchInput: { flex: 1, minHeight: 52, fontFamily: 'CronosPro', fontSize: 17, color: theme.ink },
  filters: { gap: 8, paddingBottom: 20 },
  filter: { minHeight: 48, justifyContent: 'center', borderRadius: AppRadii.control, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, paddingHorizontal: 17 },
  filterActive: { backgroundColor: theme.yellow, borderColor: theme.yellow },
  filterText: { fontFamily: 'Degular', fontSize: 17, color: theme.muted },
  filterTextActive: { color: theme.onPrimary },
  appliedFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  appliedFilter: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.yellowSoft, paddingHorizontal: 14, minHeight: 44, borderRadius: AppRadii.control },
  cuisineRow: { minHeight: 60, padding: 16, marginBottom: 10, borderRadius: AppRadii.control, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cuisineSelected: { backgroundColor: theme.yellowSoft, borderColor: theme.yellow },
  cuisineText: { fontFamily: 'Degular', fontSize: 19, color: theme.ink, flex: 1 },
  state: { ...appStyles.card, alignItems: 'center', gap: 16, marginBottom: 12 },
});
