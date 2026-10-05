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
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { apiService, CatalogCuisine } from '../../services/api';
import { fitnessProfileToPlanningPreferences, loadFitnessProfile } from '../../services/fitnessProfile';

type Filter = 'all' | 'favorites' | 'protein' | 'express' | 'breakfast' | 'main';
const FILTERS: Filter[] = ['all', 'breakfast', 'main', 'protein', 'express', 'favorites'];

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
  const shouldReplay = useEntranceReplay();

  const load = useCallback(async (page = 1, append = false, preserve = false) => {
    if (append && (requestPendingRef.current || exhaustedRef.current)) return;
    const requestId = ++requestIdRef.current;
    requestPendingRef.current = true;
    if (append) setLoadingMore(true);
    else if (!preserve) {
      pageRef.current = 0;
      exhaustedRef.current = false;
      setLoading(true);
      setLoadingMore(false);
      setRecipes([]);
      setTotal(0);
    }
    setError(null);
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
        setRecipes(favorites); setTotal(favorites.length); pageRef.current = 1; exhaustedRef.current = true;
        return;
      }
      const profile = await loadFitnessProfile();
      const preferences = fitnessProfileToPlanningPreferences(profile);
      const [catalogResponse, cuisinesResponse] = await Promise.all([
        apiService.getRecipeCatalog({
          page,
          limit: 50,
          cuisineId: cuisine,
          mealType: type === 'breakfast' || type === 'main' ? type : undefined,
          express: type === 'express',
          highProtein: type === 'protein',
          diet: preferences.diet,
          allergies: preferences.allergies,
        }),
        cuisinesLoadedRef.current ? Promise.resolve(null) : apiService.getCatalogCuisines(),
      ]);
      if (requestId !== requestIdRef.current) return;
      if (!catalogResponse.data?.recipes) throw new Error(catalogResponse.error || t('common.requestError'));
      setRecipes((current) => append ? [...current, ...catalogResponse.data!.recipes] : catalogResponse.data!.recipes);
      setTotal(catalogResponse.data.total);
      pageRef.current = page;
      exhaustedRef.current = catalogResponse.data.recipes.length === 0;
      if (cuisinesResponse?.data?.cuisines) {
        cuisinesLoadedRef.current = true;
        setCuisines(cuisinesResponse.data.cuisines.filter((item) => item.coverage?.ready !== false));
      }
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setError(loadError instanceof Error ? loadError.message : t('common.requestError'));
      if (!append && !preserve) setRecipes([]);
    } finally {
      if (requestId === requestIdRef.current) {
        requestPendingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [cuisine, t, type]);

  useFocusEffect(useCallback(() => {
    const replay = shouldReplay();
    // Keep the list mounted, its scroll position and pagination when drilling back.
    if (replay || pageRef.current === 0) void load(1, false);
    else if (type === 'favorites') void load(1, false, true);
    return () => {
      requestIdRef.current += 1;
      requestPendingRef.current = false;
    };
  }, [load, shouldReplay, type]));

  const loadMore = useCallback(() => {
    if (type === 'favorites' || loading || loadingMore || error || recipes.length >= total) return;
    void load(pageRef.current + 1, true);
  }, [error, load, loading, loadingMore, recipes.length, total, type]);

  const cuisineChoices = useMemo(() => [
    { id: 'all', label: t('mealLibrary.cuisines.all') },
    ...cuisines.map((item) => ({ id: item.id, label: cuisineName(item, i18n.resolvedLanguage || 'fr') })),
  ], [cuisines, i18n.resolvedLanguage, t]);

  return (
    <View style={appStyles.screen}>
      <FlatList
        style={styles.fill}
        data={loading ? [] : recipes}
        keyExtractor={(recipe) => recipe.id}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ ...contentColumn(), paddingTop: insets.top + 8, paddingHorizontal: gutter, paddingBottom: theme.bottomSpace }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={<>
          <AppScreenHeading title={t('tabs.meals')} subtitle={t('dailyApp.recipeSubtitle')} action={type !== 'favorites' &&
            <TouchableOpacity style={[appStyles.iconButton, cuisine !== 'all' && { backgroundColor: theme.yellow }]} accessibilityRole="button" accessibilityLabel={t('dailyApp.filters')} accessibilityState={{ selected: cuisine !== 'all' }} onPress={() => { feedback.light(); setFiltersVisible(true); }}><Ionicons name="options-outline" size={24} color={theme.ink} /></TouchableOpacity>
          } />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FILTERS.map((item) => <TouchableOpacity key={item} accessibilityRole="button" accessibilityState={{ selected: item === type }} onPress={() => { if (item !== type) feedback.selection(); pageRef.current = 0; setType(item); }} style={[styles.filter, item === type && styles.filterActive]}><Text style={[styles.filterText, item === type && styles.filterTextActive]}>{t(`mealLibrary.types.${item}`)}</Text></TouchableOpacity>)}
          </ScrollView>
          {type !== 'favorites' && cuisine !== 'all' && <TouchableOpacity accessibilityRole="button" style={styles.appliedFilter} onPress={() => { feedback.selection(); pageRef.current = 0; setCuisine('all'); }} accessibilityLabel={t('dailyApp.clearFilters')}><Text style={styles.filterText}>{cuisineChoices.find(item => item.id === cuisine)?.label}</Text><Ionicons name="close" size={16} color={theme.ink} /></TouchableOpacity>}
        </>}
        ListEmptyComponent={loading
          ? <ActivityIndicator style={styles.loader} size="large" color={Colors.light.button} />
          : error
            ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={34} color="#9B3B32" /><Text style={styles.stateText}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => void load(1, false)}><Text style={styles.retryText}>{t('mealLibrary.retry')}</Text></TouchableOpacity></View>
            : <View style={styles.state}><Ionicons name="restaurant-outline" size={36} color={Colors.light.button} /><Text style={styles.stateText}>{t(type === 'favorites' ? 'favorites.noFavorites' : 'mealLibrary.empty')}</Text></View>}
        renderItem={({ item: recipe, index }) => <EntranceView entranceIndex={index}><PlanMealCard
          meal={catalogMealCardData(recipe, type === 'breakfast' || type === 'main' ? type : undefined)}
          onPress={() => router.push({ pathname: '/recipe-detail', params: { recipeId: recipe.id, isHistory: 'true', source: type === 'favorites' ? 'favorites' : 'meal_library', ...(type === 'favorites' ? { showGenerateButton: 'false' } : {}) } })}
        /></EntranceView>}
        ListFooterComponent={loadingMore
          ? <ActivityIndicator style={styles.footerLoader} color={Colors.light.button} />
          : !loading && error && recipes.length > 0
            ? <View style={styles.state}><Text style={styles.stateText}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => void load(pageRef.current + 1, true)}><Text style={styles.retryText}>{t('mealLibrary.retry')}</Text></TouchableOpacity></View>
            : null}
      />
      <Modal visible={filtersVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFiltersVisible(false)}>
        <View style={appStyles.screen}>
          <View style={{ ...contentColumn(), paddingHorizontal: gutter, paddingTop: 24 }}><AppScreenHeading title={t('dailyApp.cuisines')} action={<NavigationIconButton kind="close" onPress={() => setFiltersVisible(false)} />} /></View>
          <ScrollView contentContainerStyle={{ ...contentColumn(), paddingHorizontal: gutter, paddingBottom: insets.bottom + 32 }}>
            {cuisineChoices.map(item => <TouchableOpacity key={item.id} style={[styles.cuisineRow, cuisine === item.id && styles.cuisineSelected]} accessibilityRole="radio" accessibilityState={{ checked: cuisine === item.id }} onPress={() => { if (cuisine !== item.id) feedback.selection(); pageRef.current = 0; setCuisine(item.id); setFiltersVisible(false); }}><Text style={styles.cuisineText}>{item.label}</Text>{cuisine === item.id && <Ionicons name="checkmark-circle" size={23} color={theme.yellow} />}</TouchableOpacity>)}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
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
