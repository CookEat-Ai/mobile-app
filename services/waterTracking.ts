import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityLevel, FitnessProfile } from './fitnessProfile';

export const WATER_BOTTLE_ML = 500;
export const WATER_GLASS_ML = 250;
const MAX_DAILY_ML = 10000;

/** Water drunk per day, in ml, keyed by tracking date (YYYY-MM-DD). */
export type WaterLog = Record<string, number>;

export const waterStorageKey = (userId: string) => `@cookeat_water_log_v1:${encodeURIComponent(userId)}`;

const ACTIVITY_EXTRA_ML: Record<ActivityLevel, number> = { sedentary: 0, light: 250, moderate: 500, active: 750, very_active: 1000 };

/**
 * Daily drinking target from the onboarding answers: ~33 ml per kg of body weight,
 * plus extra for daily activity and the weekly training load (~500 ml per training hour),
 * rounded to a glass and kept within a sensible 1.5–4 L range.
 */
export function calculateDailyWaterGoalMl(profile: Pick<FitnessProfile, 'currentWeightKg' | 'activityLevel' | 'trainingDays' | 'trainingDurationMinutes' | 'age'>): number {
    const base = profile.currentWeightKg * 33;
    const training = profile.trainingDays * (profile.trainingDurationMinutes ?? 45) / 60 * 500 / 7;
    const ageAdjustment = profile.age >= 65 ? -250 : 0;
    const total = base + ACTIVITY_EXTRA_ML[profile.activityLevel] + training + ageAdjustment;
    return Math.min(4000, Math.max(1500, Math.round(total / WATER_GLASS_ML) * WATER_GLASS_ML));
}

export async function loadWaterLog(userId: string): Promise<WaterLog> {
    try {
        const parsed = JSON.parse(await AsyncStorage.getItem(waterStorageKey(userId)) || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return Object.fromEntries(Object.entries(parsed).filter(([, ml]) => typeof ml === 'number' && Number.isFinite(ml) && ml > 0)) as WaterLog;
    }
    catch {
        return {};
    }
}

let writes: Promise<unknown> = Promise.resolve();

/** Adds (or removes, with a negative amount) water for a day and returns the new day total. Writes are serialized so quick taps never overwrite each other. */
export function addWater(userId: string, date: string, deltaMl: number): Promise<number> {
    const write = writes.catch(() => undefined).then(async () => {
        const log = await loadWaterLog(userId);
        const next = Math.min(MAX_DAILY_ML, Math.max(0, (log[date] || 0) + deltaMl));
        if (next) log[date] = next;
        else delete log[date];
        await AsyncStorage.setItem(waterStorageKey(userId), JSON.stringify(log));
        return next;
    });
    writes = write;
    return write;
}
