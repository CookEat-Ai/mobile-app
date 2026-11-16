import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_WEEKLY_PLAN_ID_KEY, ONBOARDING_WEEKLY_FREE_SWAP_PLAN_KEY } from './weeklyPlanning';

/** Remove references to this plan only; retain profile, settings and history. */
export async function clearDeletedPlanReferences(plan: { _id: string; weekStart: string }, userId: string) {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter(key => key.startsWith(`meal_plan_cache_v1:${userId}:${plan.weekStart}:`));
  const references = await AsyncStorage.multiGet([ONBOARDING_WEEKLY_PLAN_ID_KEY, ONBOARDING_WEEKLY_FREE_SWAP_PLAN_KEY]);
  const matching = references.filter(([, value]) => value === plan._id).map(([key]) => key);
  if (cacheKeys.length || matching.length) await AsyncStorage.multiRemove([...cacheKeys, ...matching]);
}
