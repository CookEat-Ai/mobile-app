import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePreventRemove } from 'expo-router/react-navigation';
import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationIconButton } from '../../components/NavigationIconButton';
import { PlanningOrganizer } from '../../components/planning/PlanningOrganizer';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { apiService, type MealPlan, type MealPlanMeal } from '../../services/api';
import { isPastPlan } from '../../services/planningDisplay';
import { planningPlacements } from '../../services/planningOrganization';
import { invalidatePlanning } from '../../services/planningUpdates';
import { feedback } from '../../services/haptics';

export default function OrganizePlanScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const navigation = useNavigation();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [meals, setMeals] = useState<MealPlanMeal[]>([]);
  const [history, setHistory] = useState<MealPlanMeal[][]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savingRef = useRef(false);
  const [leaveAction, setLeaveAction] = useState<Parameters<typeof navigation.dispatch>[0] | null>(null);
  const dirty = !!plan && JSON.stringify(planningPlacements(meals)) !== JSON.stringify(planningPlacements(plan.meals));
  usePreventRemove((dirty || saving) && !saved, ({ data }) => { if (!saving) setLeaveAction(data.action); });
  useEffect(() => { if (saved) router.back(); }, [saved]);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error(t('planning.errors.user'));
      const response = await apiService.getMealPlanById(planId, userId);
      if (!response.data?.plan) throw new Error(response.error || t('planning.errors.load'));
      if (isPastPlan(response.data.plan)) throw new Error(t('planningOrganize.ended'));
      setPlan(response.data.plan); setMeals(response.data.plan.meals); setHistory([]);
    } catch (caught) { setError(caught instanceof Error ? caught.message : t('planning.errors.load')); }
    finally { setLoading(false); }
  }, [planId, t]);
  useEffect(() => { void load(); }, [load]);
  const save = async () => {
    if (!plan || savingRef.current) return;
    if (!dirty) { router.back(); return; }
    savingRef.current = true; setSaving(true); setError('');
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error(t('planning.errors.user'));
      const response = await apiService.movePlannedMeals(plan._id, userId, planningPlacements(meals), plan.updatedAt, plan.meals.filter(meal => !meals.some(item => item.slotId === meal.slotId)).map(meal => meal.slotId));
      if (!response.data?.plan) throw new Error(response.error || t('planningOrganize.saveError'));
      invalidatePlanning();
      // Remove every localized cache of this plan so returning screens never restore its old schedule.
      try {
        const keys = await AsyncStorage.getAllKeys();
        const prefix = `meal_plan_cache_v1:${userId}:${plan.weekStart}:`;
        await AsyncStorage.multiRemove(keys.filter(key => key.startsWith(prefix)));
      } catch { /* The server save succeeded; cache cleanup must not report a failed move. */ }
      void feedback.success(); setSaved(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : t('planningOrganize.saveError')); void feedback.error(); }
    finally { savingRef.current = false; setSaving(false); }
  };
  return <View style={appStyles.screen}>
    <Stack.Screen options={{ gestureEnabled: false }} />
    <View style={[styles.header, { paddingTop: insets.top + 8, paddingHorizontal: gutter }]}>
      <NavigationIconButton style={appStyles.iconButton} disabled={saving} accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
      <Text style={[appStyles.headerTitle, styles.heading]}>{t('planningOrganize.title')}</Text>
    </View>
    <View style={[styles.body, contentColumn()]}>
      <Text style={[appStyles.subtitle, styles.hint]}>{t('planningOrganize.hint')}</Text>
      {loading ? <ActivityIndicator style={styles.loader} color={theme.ink} /> : plan ? <PlanningOrganizer plan={plan} meals={meals} disabled={saving}
        onChange={(next, swapped) => { setHistory(previous => [...previous, meals]); setMeals(next); setNotice(t(next.length < meals.length ? 'planningOrganize.removed' : swapped ? 'planningOrganize.swapped' : 'planningOrganize.moved')); setError(''); }} /> : null}
      {!!error && <Text accessibilityRole="alert" style={[appStyles.error, styles.hint]}>{error}</Text>}
      {!!notice && <View style={styles.notice} accessibilityLiveRegion="polite"><Text style={appStyles.subtitle}>{notice}</Text>
        <Pressable disabled={saving || !history.length} accessibilityRole="button" onPress={() => {
          const previous = history[history.length - 1]; if (!previous) return;
          setMeals(previous); setHistory(history.slice(0, -1)); setNotice(''); void feedback.selection();
        }}><Text style={appStyles.textAction}>{t('planningOrganize.undo')}</Text></Pressable></View>}
    </View>
    <View style={[styles.footer, { paddingHorizontal: gutter, paddingBottom: insets.bottom + 12 }]}>
      <Pressable style={[appStyles.button, saving && styles.disabled]} accessibilityRole="button" accessibilityState={{ busy: saving, disabled: saving || loading }}
        disabled={saving || loading} onPress={() => plan ? void save() : void load()}>
        {saving ? <ActivityIndicator color={theme.ink} /> : <Text style={appStyles.buttonText}>{t(plan ? 'planningOrganize.done' : 'mealLibrary.retry')}</Text>}
      </Pressable>
    </View>
    <Modal visible={!!leaveAction} transparent animationType="fade" onRequestClose={() => setLeaveAction(null)}>
      <View style={styles.backdrop}><View style={styles.dialog}>
        <Text style={appStyles.section}>{t('planningOrganize.discardTitle')}</Text><Text style={appStyles.subtitle}>{t('planningOrganize.discardBody')}</Text>
        <Pressable style={appStyles.button} accessibilityRole="button" onPress={() => setLeaveAction(null)}><Text style={appStyles.buttonText}>{t('planningOrganize.keepEditing')}</Text></Pressable>
        <Pressable style={styles.discard} accessibilityRole="button" onPress={() => { const action = leaveAction; setLeaveAction(null); if (action) navigation.dispatch(action); }}><Text style={appStyles.textAction}>{t('planningOrganize.discard')}</Text></Pressable>
      </View></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingBottom: 14 }, heading: { flex: 1 },
  body: { flex: 1, width: '100%' }, hint: { paddingHorizontal: 20 }, loader: { marginVertical: 40 },
  footer: { paddingTop: 12, borderTopWidth: 1, borderColor: theme.line }, disabled: { opacity: 0.6 },
  notice: { padding: 16, gap: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.yellowSoft },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(8,26,16,0.35)' },
  dialog: { width: '100%', maxWidth: 480, backgroundColor: theme.background, borderRadius: theme.radius, padding: 24, gap: 18 },
  discard: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
