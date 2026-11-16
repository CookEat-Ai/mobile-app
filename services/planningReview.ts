import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import * as StoreReview from 'expo-store-review';
import analytics from './analytics';

let pendingReview: ReturnType<typeof setTimeout> | null = null;

function cancelReview() {
  if (pendingReview) clearTimeout(pendingReview);
  pendingReview = null;
}

// A module-level timer outlives the screen that scheduled it, so navigation does not cancel it.
function scheduleReview(event: string, properties: Record<string, string | boolean>, delay: number) {
  cancelReview();
  if (__DEV__) return;

  pendingReview = setTimeout(async () => {
    pendingReview = null;
    try {
      // Also guard callers without an explicit onboarding flag.
      if (await AsyncStorage.getItem('onboarding_completed') !== 'true') return;
      if (AppState.currentState !== 'active' || !await StoreReview.hasAction()) return;
      analytics.track(event, properties);
      await StoreReview.requestReview();
    } catch (error) {
      console.warn('Store review request skipped:', error);
    }
  }, delay);
}

export function schedulePlanningReview(planId: string, duringOnboarding = false) {
  if (duringOnboarding) return cancelReview();
  scheduleReview('meal_plan_review_requested', { plan_id: planId, during_onboarding: false }, 5000);
}

// Asked once the scanned meal's details have finished appearing in the modal.
export function scheduleMealScanReview(scanId: string) {
  scheduleReview('meal_scan_review_requested', { scan_id: scanId }, 3000);
}
