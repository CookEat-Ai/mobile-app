import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import * as StoreReview from 'expo-store-review';
import analytics from './analytics';

let pendingReview: ReturnType<typeof setTimeout> | null = null;

// Keep the delay alive when the generation screen navigates to the finished plan.
export function schedulePlanningReview(planId: string, duringOnboarding = false) {
  if (pendingReview) clearTimeout(pendingReview);
  pendingReview = null;
  if (duringOnboarding) return;

  pendingReview = setTimeout(async () => {
    pendingReview = null;
    try {
      // Also guard callers without an explicit onboarding flag.
      if (await AsyncStorage.getItem('onboarding_completed') !== 'true') return;
      if (AppState.currentState !== 'active' || !await StoreReview.hasAction()) return;
      if (AppState.currentState !== 'active') return;
      analytics.track('meal_plan_review_requested', {
        plan_id: planId,
        during_onboarding: false,
      });
      await StoreReview.requestReview();
    } catch (error) {
      console.warn('Store review request skipped:', error);
    }
  }, 5000);
}
