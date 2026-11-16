import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppScreenHeading } from '../../components/AppScreenHeading';
import { NavigationIconButton } from '../../components/NavigationIconButton';
import { PlanMealCard } from '../../components/planning/PlanMealCard';
import { AppBackground } from '../../components/ui/AppBackground';
import { AppSpinner } from '../../components/ui/AppSpinner';
import { AppTheme, appStyles } from '../../constants/AppTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { apiService, type CatalogRecipe } from '../../services/api';
import { catalogMealCardData } from '../../services/catalogDisplay';
import { loadFitnessProfile } from '../../services/fitnessProfile';
import { loadRecipePreferences } from '../../services/recipePreferences';
import { readPantryRecipeIngredients } from '../../services/pantryRecipeIngredients';

export default function PantryRecipesScreen() {
  const { ingredients: rawIngredients } = useLocalSearchParams<{ ingredients?: string }>();
  const { t, i18n } = useTranslation();
  const { gutter } = useResponsive();
  const ingredients = useMemo(() => readPantryRecipeIngredients(rawIngredients), [rawIngredients]);
  const [recipes, setRecipes] = useState<CatalogRecipe[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>(ingredients.length ? 'loading' : 'ready');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ingredients.length) {
      setRecipes([]);
      setPhase('ready');
      return;
    }
    let active = true;
    setPhase('loading');
    setRecipes([]);
    void (async () => {
      const [preferences, profile] = await Promise.all([loadRecipePreferences(), loadFitnessProfile()]);
      if (!active) return;
      const result = await apiService.getRecipeCatalog({
        pantryIngredients: ingredients, limit: 12, diet: preferences.diet === 'none' ? profile.diet : preferences.diet,
        allergies: preferences.allergies, excludedIngredients: profile.avoidIngredients,
      });
      if (!active) return;
      if (!result.data?.pantryMatched) throw new Error('pantry_search_unavailable');
      setRecipes(result.data.recipes);
      setPhase('ready');
    })().catch(() => { if (active) setPhase('error'); });
    return () => { active = false; };
  }, [ingredients, attempt, i18n.language]);

  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/tracking'); };
  const addPhotos = () => router.push({ pathname: '/camera', params: { recipePantry: 'true', recipeIngredients: JSON.stringify(ingredients) } });

  return <SafeAreaView style={appStyles.screen}>
    <Stack.Screen options={{ headerShown: false }} />
    <AppBackground />
    <FlatList
      data={recipes}
      keyExtractor={(recipe) => recipe.id}
      contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
      ListHeaderComponent={<View style={styles.heading}>
        <NavigationIconButton onPress={goBack} />
        <AppScreenHeading title={t('tracking.pantryRecipes.title')} subtitle={ingredients.length ? t('tracking.pantryRecipes.detected', { count: ingredients.length }) : undefined} compact />
        {!!ingredients.length && <Text style={appStyles.subtitle}>{ingredients.join(' · ')}</Text>}
        <TouchableOpacity accessibilityRole="button" style={appStyles.secondaryButton} onPress={addPhotos}>
          <Text style={appStyles.secondaryButtonText}>{t('tracking.pantryRecipes.addPhotos')}</Text>
        </TouchableOpacity>
      </View>}
      renderItem={({ item }) => <PlanMealCard meal={catalogMealCardData(item)} imageTransition={0}
        onPress={() => router.push({ pathname: '/recipe-detail', params: { recipeId: item.id, isHistory: 'true', source: 'pantry_photo' } })} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={phase === 'loading' ? <View accessibilityRole="progressbar" accessibilityLabel={t('tracking.pantryRecipes.loading')} style={styles.empty}>
        <AppSpinner color={AppTheme.yellow} /><Text style={appStyles.subtitle}>{t('tracking.pantryRecipes.loading')}</Text>
      </View> : <View style={styles.empty}>
        <Text accessibilityRole={phase === 'error' ? 'alert' : undefined} style={appStyles.subtitle}>
          {t(phase === 'error' ? 'tracking.pantryRecipes.error' : ingredients.length ? 'tracking.pantryRecipes.noMatch' : 'tracking.pantryRecipes.unreadable')}
        </Text>
        {phase === 'error' && <TouchableOpacity accessibilityRole="button" style={appStyles.button} onPress={() => setAttempt((n) => n + 1)}>
          <Text style={appStyles.buttonText}>{t('common.retry')}</Text>
        </TouchableOpacity>}
      </View>}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 24 },
  heading: { gap: 12, paddingTop: 12, paddingBottom: 20 },
  empty: { gap: 16, paddingVertical: 20 },
  separator: { height: 12 },
});
