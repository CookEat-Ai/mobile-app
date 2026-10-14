import { useEntranceReplay } from '../../hooks/useEntranceReplay';
import { EntranceView } from '../../components/motion/Entrance';
import { feedback } from '../../services/haptics';
import { AppScreenHeading } from '../../components/AppScreenHeading';
import { PlanMealCard } from '../../components/planning/PlanMealCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { catalogMealCardData, type MealCardRecipe } from '../../services/catalogDisplay';
import { NavigationIconButton } from '../../components/NavigationIconButton';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { apiService, CatalogCuisine } from '../../services/api';
import { calculateFitnessProjection, fitnessProfileToPlanningPreferences, loadFitnessProfile } from '../../services/fitnessProfile';

type Filter = 'all' | 'favorites' | 'light' | 'protein' | 'express' | 'breakfast' | 'main';
const FILTERS: Filter[] = ['all', 'breakfast', 'main', 'light', 'protein', 'express', 'favorites'];
const INITIAL_MEAL_COUNT = 6;
const recipeKey = (recipe: MealCardRecipe) => recipe.id;
const MealSeparator = () => <View style={styles.separator} />;

// Stable recipe props keep typing, modal updates and pagination from redrawing
// every thumbnail. Only the first screen of results needs an entrance.
const MealLibraryRow = React.memo(function MealLibraryRow({ recipe, index, type, disabled }: {
  recipe: MealCardRecipe; index: number; type: Filter; disabled: boolean;
}) {
  const meal = useMemo(() => catalogMealCardData(recipe,
    type === 'light' ? 'main' : type === 'breakfast' || type === 'main' ? type : undefined), [recipe, type]);
  const onPress = useCallback(() => router.push({ pathname: '/recipe-detail', params: {
    recipeId: recipe.id, isHistory: 'true', source: type === 'favorites' ? 'favorites' : 'meal_library',
    ...(type === 'favorites' ? { showGenerateButton: 'false' } : {}),
  } }), [recipe.id, type]);
  const card = <PlanMealCard meal={meal} disabled={disabled} imageTransition={0} onPress={onPress} />;
  return index < INITIAL_MEAL_COUNT
    ? <EntranceView entranceIndex={Math.min(index, 2)}>{card}</EntranceView>
    : card;
});

function cuisineName(cuisine: CatalogCuisine, language: string) {
  const short = language.toLowerCase().split(/[-_]/)[0];
  return cuisine.names.find((entry) => entry.language === short)?.value
    || cuisine.names.find((entry) => entry.language === 'fr')?.value
    || cuisine.names[0]?.value
    || cuisine.id;
}

export default function MealsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [recipes, setRecipes] = useState<MealCardRecipe[]>([]);
  const [cuisines, setCuisines] = useState<CatalogCuisine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState<Filter>('all');
  const [cuisine, setCuisine] = useState('all');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const requestIdRef = useRef(0);
  const requestPendingRef = useRef(false);
  const pageRef = useRef(0);
  const exhaustedRef = useRef(false);
  const cuisinesLoadedRef = useRef(false);
  const retryRef = useRef<(() => void) | null>(null);
  const shouldReplay = useEntranceReplay();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== search.trim()) {
        pageRef.current = 0;
        setQuery(search.trim());
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, query]);

  const load = useCallback(async (page = 1, append = false, preserve = false): Promise<void> => {
    if (append && (requestPendingRef.current || exhaustedRef.current)) return;
    const requestId = ++requestIdRef.current;
    requestPendingRef.current = true;
    if (append) setLoadingMore(true);
    else if (!preserve) {
      pageRef.current = 0;
      exhaustedRef.current = false;
      setLoading(true);
      setLoadingMore(false);
      // Keep mounted thumbnails until the replacement results are ready. Common
      // recipes retain their native views instead of replaying their entrance.
      setTotal(0);
    }
    setError(null);
    retryRef.current = null;
    try {
      if (type === 'favorites') {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) throw new Error(t('planning.errors.user'));
        const response = await apiService.getFavorites(userId);
        if (!response.data?.recipes) throw new Error(response.error || t('common.requestError'));
        if (requestId !== requestIdRef.current) return;
        const favorites: MealCardRecipe[] = response.data.recipes.map((recipe: any) => ({
          id: recipe.id, title: recipe.title, image: recipe.image || '', ingredients: recipe.ingredients || [],
          cooking_time: recipe.cooking_time || '', calories: String(recipe.calories || 0), proteins: String(recipe.proteins || 0),
          mealTypes: recipe.mealTypes,
        }));
        const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const tokens = normalize(query).split(/\s+/).filter(Boolean);
        const matching = favorites.filter(recipe => {
          const text = normalize([recipe.title, ...(recipe.ingredients || []).map(ingredient => ingredient.name)].join(' '));
          return tokens.every(token => text.includes(token));
        });
        setRecipes(matching); setTotal(matching.length); pageRef.current = 1; exhaustedRef.current = true;
        return;
      }
      const profile = await loadFitnessProfile();
      const preferences = fitnessProfileToPlanningPreferences(profile);
      const nutritionTargets = calculateFitnessProjection(profile);
      // Revalidate every loaded page in place. A tab return must not empty the
      // list, reset its scroll position, or discard already loaded pages.
      const pages = preserve ? Array.from({ length: Math.max(1, pageRef.current) }, (_, index) => index + 1) : [page];
      const [catalogResponses, cuisinesResponse] = await Promise.all([
        Promise.all(pages.map(catalogPage => apiService.getRecipeCatalog({
          page: catalogPage,
          limit: 50,
          cuisineId: cuisine,
          search: query,
          mealType: type === 'light' ? 'main' : type === 'breakfast' || type === 'main' ? type : undefined,
          express: type === 'express',
          highProtein: type === 'protein',
          light: type === 'light',
          goal: profile.goal,
          dailyCalories: nutritionTargets.dailyCalories,
          dailyProteinGrams: nutritionTargets.dailyProteinGrams,
          includeSnack: profile.includeSnack,
          diet: preferences.diet,
          allergies: preferences.allergies,
        }))),
        cuisinesLoadedRef.current ? Promise.resolve(null) : apiService.getCatalogCuisines(),
      ]);
      if (requestId !== requestIdRef.current) return;
      const failedResponse = catalogResponses.find(response => !response.data?.recipes);
      if (failedResponse) throw new Error(failedResponse.error || t('common.requestError'));
      const loadedRecipes = catalogResponses.flatMap(response => response.data!.recipes);
      setRecipes((current) => append ? [...current, ...loadedRecipes] : loadedRecipes);
      setTotal(catalogResponses[0].data!.total);
      pageRef.current = pages[pages.length - 1];
      exhaustedRef.current = catalogResponses[catalogResponses.length - 1].data!.recipes.length === 0;
      if (cuisinesResponse?.data?.cuisines) {
        cuisinesLoadedRef.current = true;
        setCuisines(cuisinesResponse.data.cuisines.filter((item) => item.coverage?.ready !== false));
      }
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setError(loadError instanceof Error ? loadError.message : t('common.requestError'));
      retryRef.current = () => { void load(page, append, preserve); };
      if (!append && !preserve) setRecipes([]);
    } finally {
      if (requestId === requestIdRef.current) {
        requestPendingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [cuisine, query, t, type]);

  useFocusEffect(useCallback(() => {
    const replay = shouldReplay();
    // Keep the list mounted, its scroll position and pagination when drilling back.
    if (replay || pageRef.current === 0) void load(1, false, pageRef.current > 0);
    else if (type === 'favorites') void load(1, false, true);
    return () => {
      requestIdRef.current += 1;
      requestPendingRef.current = false;
    };
  }, [load, shouldReplay, type]));

  const loadMore = useCallback(() => {
    if (query !== search.trim() || type === 'favorites' || loading || loadingMore || error || recipes.length >= total) return;
    void load(pageRef.current + 1, true);
  }, [error, load, loading, loadingMore, recipes.length, total, type, query, search]);

  const cuisineChoices = useMemo(() => [
    { id: 'all', label: t('mealLibrary.cuisines.all') },
    ...cuisines.map((item) => ({ id: item.id, label: cuisineName(item, i18n.resolvedLanguage || 'fr') })),
  ], [cuisines, i18n.resolvedLanguage, t]);

  const renderMeal = useCallback(({ item, index }: { item: MealCardRecipe; index: number }) =>
    <MealLibraryRow recipe={item} index={index} type={type} disabled={loading} />, [type, loading]);

  const selectCuisine = useCallback((id: string) => {
    setFiltersVisible(false);
    if (id === cuisine) return;
    feedback.selection();
    pageRef.current = 0;
    setCuisine(id);
  }, [cuisine]);

  return (
    <View style={appStyles.screen}>
      <FlatList
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={styles.fill}
        data={recipes}
        keyExtractor={recipeKey}
        ItemSeparatorComponent={MealSeparator}
        initialNumToRender={INITIAL_MEAL_COUNT}
        maxToRenderPerBatch={4}
        windowSize={5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ ...contentColumn(), paddingTop: insets.top + 8, paddingHorizontal: gutter, paddingBottom: theme.bottomSpace }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={<>
          <AppScreenHeading title={t('tabs.meals')} subtitle={t('dailyApp.recipeSubtitle')} action={type !== 'favorites' &&
            <TouchableOpacity style={[appStyles.iconButton, cuisine !== 'all' && { backgroundColor: theme.yellow }]} accessibilityRole="button" accessibilityLabel={t('dailyApp.filters')} accessibilityState={{ selected: cuisine !== 'all', busy: loading }} onPress={() => { feedback.light(); setFiltersVisible(true); }}>{loading ? <ActivityIndicator color={theme.ink} /> : <Ionicons name="options-outline" size={24} color={theme.ink} />}</TouchableOpacity>
          } />
          <View style={styles.search}>
            <Ionicons name="search" size={20} color={theme.muted} />
            <TextInput value={search} onChangeText={setSearch} placeholder={t('common.searchPlaceholder')}
              accessibilityLabel={t('common.searchPlaceholder')} style={styles.searchInput} returnKeyType="search" autoCorrect={false}
              onSubmitEditing={() => { if (query !== search.trim()) { pageRef.current = 0; setQuery(search.trim()); } }} />
            {!!search && <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('dailyApp.clearFilters')}
              style={styles.clearSearch} onPress={() => setSearch('')}><Ionicons name="close-circle" size={22} color={theme.muted} /></TouchableOpacity>}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FILTERS.map((item) => <TouchableOpacity key={item} accessibilityRole="button" accessibilityState={{ selected: item === type }} onPress={() => { if (item === type) return; feedback.selection(); pageRef.current = 0; setType(item); }} style={[styles.filter, item === type && styles.filterActive]}><Text style={[styles.filterText, item === type && styles.filterTextActive]}>{t(`mealLibrary.types.${item}`)}</Text></TouchableOpacity>)}
          </ScrollView>
          {type === 'light' && <Text style={[styles.filterText, { marginBottom: 16 }]}>{t('mealLibrary.lightDescription')}</Text>}
          {type !== 'favorites' && cuisine !== 'all' && <TouchableOpacity accessibilityRole="button" style={styles.appliedFilter} onPress={() => { feedback.selection(); pageRef.current = 0; setCuisine('all'); }} accessibilityLabel={t('dailyApp.clearFilters')}><Text style={styles.filterText}>{cuisineChoices.find(item => item.id === cuisine)?.label}</Text><Ionicons name="close" size={16} color={theme.ink} /></TouchableOpacity>}
        </>}
        ListEmptyComponent={loading
          ? <ActivityIndicator style={styles.loader} size="large" color={Colors.light.button} />
          : error
            ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={34} color="#9B3B32" /><Text style={styles.stateText}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => retryRef.current?.()}><Text style={styles.retryText}>{t('mealLibrary.retry')}</Text></TouchableOpacity></View>
            : <View style={styles.state}><Ionicons name="restaurant-outline" size={36} color={Colors.light.button} /><Text style={styles.stateText}>{t(type === 'favorites' && !query ? 'favorites.noFavorites' : 'mealLibrary.empty')}</Text></View>}
        renderItem={renderMeal}
        ListFooterComponent={loadingMore || loading && recipes.length > 0
          ? <ActivityIndicator style={styles.footerLoader} color={Colors.light.button} />
          : !loading && error && recipes.length > 0
            ? <View style={styles.state}><Text style={styles.stateText}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => retryRef.current?.()}><Text style={styles.retryText}>{t('mealLibrary.retry')}</Text></TouchableOpacity></View>
            : null}
      />
      <Modal visible={filtersVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFiltersVisible(false)}>
        <View style={appStyles.screen}>
          <View style={{ ...contentColumn(), paddingHorizontal: gutter, paddingTop: 24 }}><AppScreenHeading title={t('dailyApp.cuisines')} action={<NavigationIconButton kind="close" onPress={() => setFiltersVisible(false)} />} /></View>
          <ScrollView contentContainerStyle={{ ...contentColumn(), paddingHorizontal: gutter, paddingBottom: insets.bottom + 32 }}>
            {cuisineChoices.map(item => <TouchableOpacity key={item.id} style={[styles.cuisineRow, cuisine === item.id && styles.cuisineSelected]} accessibilityRole="radio" accessibilityState={{ checked: cuisine === item.id }} onPress={() => selectCuisine(item.id)}><Text style={styles.cuisineText}>{item.label}</Text>{cuisine === item.id && <Ionicons name="checkmark-circle" size={23} color={theme.yellow} />}</TouchableOpacity>)}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  separator: { height: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 16, marginBottom: 16, borderRadius: 18, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
  searchInput: { flex: 1, minHeight: 52, fontFamily: 'CronosPro', fontSize: 17, color: theme.ink },
  clearSearch: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { gap: 8, paddingBottom: 20 },
  filter: { minHeight: 48, justifyContent: 'center', borderRadius: 17, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, paddingHorizontal: 17 },
  filterActive: { backgroundColor: theme.yellow, borderColor: theme.yellow },
  filterText: { fontFamily: 'Degular', fontSize: 17, color: theme.muted },
  filterTextActive: { color: 'white' },
  appliedFilter: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF6D9', paddingHorizontal: 14, minHeight: 44, borderRadius: 14, marginBottom: 18 },
  cuisineRow: { minHeight: 60, padding: 16, marginBottom: 10, borderRadius: 17, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cuisineSelected: { backgroundColor: '#FFF6D9', borderColor: theme.yellow },
  cuisineText: { fontFamily: 'Degular', fontSize: 19, color: theme.ink, flex: 1 },
  loader: { marginTop: 60 },
  state: { ...appStyles.card, alignItems: 'center', gap: 16, paddingVertical: 32 },
  stateText: { fontFamily: 'CronosPro', fontSize: 16, lineHeight: 22, textAlign: 'center', color: theme.muted },
  retry: { ...appStyles.button, paddingHorizontal: 28 },
  retryText: { ...appStyles.buttonText },
  footerLoader: { paddingVertical: 20 },
});
