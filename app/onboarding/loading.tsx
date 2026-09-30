import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ClassicLoadingView } from '../../components/loading/ClassicLoadingView';
import analytics from '../../services/analytics';

const PROGRESS_DURATION = 7000;
const FINAL_HOLD_DURATION = 800;

export default function LoadingScreen() {
  useEffect(() => {
    const trackingTimer = setTimeout(() => {
      void analytics.requestTrackingPermission();
    }, 2500);
    const finalTimer = setTimeout(() => {
      analytics.track('fitness_profile_prepared');
      analytics.track('onboarding_personalization_transition_completed', { transition_id: 'nutrition_profile', actual_duration_ms: PROGRESS_DURATION + FINAL_HOLD_DURATION, stages_seen: 5 });
      router.replace('/onboarding/onboardingProfileReady');
    }, PROGRESS_DURATION + FINAL_HOLD_DURATION);
    analytics.track('onboarding_personalization_transition_viewed', { transition_id: 'nutrition_profile', stages: 5 });
    return () => {
      clearTimeout(trackingTimer);
      clearTimeout(finalTimer);
    };
  }, []);

  return <ClassicLoadingView messageKey="onboarding_loading.messages" durationMs={PROGRESS_DURATION} mode="timed" />;
}
