import React, { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { PantryIngredientReview } from '../../components/planning/PantryIngredientReview';
import { createPantryScanHandoff, PANTRY_SCAN_HANDOFF_KEY } from '../../services/pantryScanHandoff';
import { readPantryReviewIngredients } from '../../services/pantryIngredientSearch';

export default function PlanningIngredientsScreen() {
  const { t } = useTranslation();
  const { ingredients } = useLocalSearchParams<{ ingredients?: string }>();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const confirm = async (names: string[]) => {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true);
    try {
      await AsyncStorage.setItem(PANTRY_SCAN_HANDOFF_KEY, createPantryScanHandoff(names));
      router.back();
    } catch { Alert.alert(t('camera.errorTitle'), t('planningPantry.saveError')); }
    finally { savingRef.current = false; setSaving(false); }
  };
  return <SafeAreaProvider>
    <Stack.Screen options={{ statusBarStyle: 'dark', gestureEnabled: !saving }} />
    <PantryIngredientReview ingredients={readPantryReviewIngredients(ingredients)} saving={saving} onBack={() => { if (!savingRef.current) router.back(); }} onConfirm={confirm} />
  </SafeAreaProvider>;
}
