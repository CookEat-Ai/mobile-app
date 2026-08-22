import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import analytics from '../../services/analytics';

const QUESTION_KEYS = new Set([
  'sex', 'age', 'useCase', 'cookingLevel', 'cookingFrequency', 'eatOutFrequency',
  'cookingForWho', 'cookingTime', 'equipments', 'mealBudget', 'favoriteDishType',
  'favoriteCuisineStyle', 'diet', 'avoidIngredients', 'importSources', 'importVolume',
  'importPain', 'howDidHeKnowCookEatAI', 'commitmentLevel', 'entryFeature',
  'entry_feature', 'first_action', 'used_features', 'questions_answered',
  'pending_promo_code', 'pending_promo_discount',
  // Les préférences sont initialisées par l'onboarding : sans leur remise à
  // zéro, un nouveau test DEV réutilise silencieusement le précédent profil.
  'recipe_preferences',
]);

export function DevOnboardingResetButton() {
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ isOnboarding?: string; source?: string }>();
  const insets = useSafeAreaInsets();
  const [resetting, setResetting] = useState(false);

  if (!__DEV__) return null;

  const isOnboardingRoute = pathname.startsWith('/onboarding')
    || params.isOnboarding === 'true'
    || (pathname === '/paywall' && params.source?.includes('onboarding'));
  if (!isOnboardingRoute) return null;

  const reset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      analytics.track('onboarding_dev_reset', { from_path: pathname });
      const keys = await AsyncStorage.getAllKeys();
      const onboardingKeys = keys.filter((key) =>
        QUESTION_KEYS.has(key)
        || key.startsWith('question_')
        || key.startsWith('intro_')
        || key.startsWith('proof_')
        || key.startsWith('onboarding_')
        || key.startsWith('@cookeat_onboarding')
        || key.startsWith('@cookeat_trial_reminder'),
      );
      if (onboardingKeys.length > 0) await AsyncStorage.multiRemove(onboardingKeys);
      router.replace('/onboarding/welcome');
    } finally {
      setResetting(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { top: Math.max(insets.top - 2, 8) }]}
      onPress={reset}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Recommencer l’onboarding"
    >
      {resetting ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <>
          <Ionicons name="refresh" size={12} color="white" />
          <Text style={styles.label}>DEV</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 10,
    zIndex: 10_000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 100,
    backgroundColor: Colors.light.text,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  label: {
    color: 'white',
    fontFamily: 'CronosProBold',
    fontSize: 10,
  },
});
