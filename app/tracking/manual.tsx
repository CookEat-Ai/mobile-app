import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import uuid from 'react-native-uuid';
import { NavigationIconButton } from '../../components/NavigationIconButton';
import { PhotoMealReview } from '../../components/tracking/PhotoMealReview';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { getAnonymousUserId } from '../../services/anonymousSession';
import { mealNutrition, loadTrackedMeals, saveTrackedMeal, trackingDateKey, validTrackingDate, type FoodNutrition, type PhotoFood, type TrackedMeal } from '../../services/mealTracking';
import { feedback } from '../../services/haptics';
import analytics from '../../services/analytics';

export default function ManualTrackingScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ date?: string; entryId?: string }>();
  const [date, setDate] = useState(() => params.date && validTrackingDate(params.date) && params.date <= trackingDateKey() ? params.date : trackingDateKey());
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<PhotoFood[]>([]);
  const [nutritionOverride, setNutritionOverride] = useState<FoodNutrition | null>(null);
  const changeItems = (next: PhotoFood[]) => { setItems(next); setNutritionOverride(null); };
  const [mealType, setMealType] = useState<TrackedMeal['mealType'] | null>(null);
  const [existing, setExisting] = useState<TrackedMeal | null>(null);
  const [loading, setLoading] = useState(!!params.entryId);
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  const saveBusy = useRef(false), active = useRef(true);
  const id = useRef<string>(String(uuid.v4()));
  const createdAt = useRef(new Date().toISOString());
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!params.entryId) return;
    let current = true;
    void getAnonymousUserId().then(loadTrackedMeals).then(records => {
      const record = records.find(meal => meal.id === params.entryId);
      if (!record || record.photoUri) throw new Error('manual_meal_missing');
      if (!current) return;
      setNutritionOverride(record.nutritionOverride || null); setExisting(record); setDate(record.date); setTitle(record.title); setItems(record.items); setMealType(record.mealType);
    }).catch(() => { if (current) setError(t('tracking.loadError')); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [params.entryId, t]);
  const save = async () => {
    const nutrition = mealNutrition(items, nutritionOverride);
    if (saveBusy.current || !nutrition || !mealType || !title.trim() || (params.entryId && !existing)) return;
    saveBusy.current = true; setSaving(true); setError('');
    try {
      const user = await getAnonymousUserId();
      await saveTrackedMeal(user, {
        id: existing?.id || id.current, createdAt: existing?.createdAt || createdAt.current,
        date, title: title.trim(), mealType, items, nutrition, nutritionOverride, estimated: true, source: 'manual',
      });
      void analytics.track('meal_tracking_saved', { source: 'manual', editing: !!existing, item_count: items.length }).catch(() => undefined);
      void feedback.success();
      if (active.current) router.back();
    } catch { if (active.current) setError(t('tracking.saveError')); }
    finally { saveBusy.current = false; if (active.current) setSaving(false); }
  };
  return <View style={appStyles.screen}>
    <Stack.Screen options={{ headerShown: false, statusBarStyle: 'dark', gestureEnabled: !saving }}/>
    {loading || (params.entryId && !existing) ? <View style={[appStyles.screen, {padding: 20, justifyContent: 'center', alignItems: 'center', gap: 16}]}>
      <NavigationIconButton kind="close" onPress={() => router.back()}/>
      {loading ? <ActivityIndicator color={theme.yellow}/> : <View accessibilityRole="alert"><Text style={appStyles.error}>{error}</Text></View>}
    </View> : <PhotoMealReview manual analysis={null} title={title} items={items} mealType={mealType} onMealType={setMealType}
      dateLabel={new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
      onTitle={setTitle} onItems={changeItems} nutritionOverride={nutritionOverride} onNutritionOverride={setNutritionOverride} onSave={() => { void save(); }} onBack={() => router.back()}
      saving={saving} error={error} editing={!!existing}/>}
  </View>;
}
