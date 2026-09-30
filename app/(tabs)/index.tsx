import { useEntranceReplay } from '../../hooks/useEntranceReplay';
import { planningRevision } from '../../services/planningUpdates';
import { EntranceView } from '../../components/motion/Entrance';
import { AppScreenHeading } from '../../components/AppScreenHeading';
import { NavigationIconButton } from '../../components/NavigationIconButton';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { apiService, type MealPlan } from '../../services/api';
import { startOfWeekMondayKey } from '../../services/weeklyPlanning';
import { formatPlanRange } from '../../services/planningDisplay';
import { getRecipeImageSource } from '../../constants/RecipeImages';
import { PlanWeekContent } from '../../components/planning/PlanWeekContent';
import { planningStyles } from '../../components/planning/PlanningStyles';

export default function PlanningScreen() {
  const { selectedPlanId, selectedDay, selectionKey } = useLocalSearchParams<{ selectedPlanId?: string; selectedDay?: string; selectionKey?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRequest = useRef(0);
  const loadedRevision = useRef<number | null>(null);
  const shouldReplay = useEntranceReplay();
  useEffect(() => {
    if (selectionKey) {
      setHistory(false);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [selectionKey]);
  const loadPlans = useCallback(async (refresh = false) => {
    const request = ++loadRequest.current;
    const revision = planningRevision();
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error(t('planning.errors.user'));
      const response = await apiService.listMealPlans(userId);
      if (!response.data?.plans) throw new Error(response.error || t('planning.errors.load'));
      let nextPlans = response.data.plans;
      const currentSummary = nextPlans.find(plan => plan.weekStart === startOfWeekMondayKey());
      if (currentSummary) {
        // The history endpoint omits preferences and nutrition targets.
        const detail = await apiService.getMealPlanById(currentSummary._id, userId);
        if (!detail.data?.plan) throw new Error(detail.error || t('planning.errors.load'));
        const fullPlan = detail.data.plan;
        nextPlans = nextPlans.map(plan => plan._id === fullPlan._id ? fullPlan : plan);
      }
      if (request === loadRequest.current) { loadedRevision.current = revision; setPlans(nextPlans); }
    } catch (caught) { if (request === loadRequest.current) setError(caught instanceof Error ? caught.message : t('planning.errors.load')); }
    finally { if (request === loadRequest.current) { setLoading(false); setRefreshing(false); } }
  }, [t]);
  useFocusEffect(useCallback(() => {
    const replay = shouldReplay();
    if (replay || loadedRevision.current !== planningRevision()) void loadPlans();
    return () => { loadRequest.current += 1; };
  }, [loadPlans, shouldReplay]));
  const ordered = useMemo(() => [...plans].sort((a, b) => b.weekStart.localeCompare(a.weekStart)), [plans]);
  const current = ordered.find(plan => plan.weekStart === startOfWeekMondayKey());
  const locale = i18n.resolvedLanguage || 'fr';
  const configure = () => router.push({ pathname: '/planning/configure', params: { replace: current ? 'true' : 'false' } });
  const updatePlan = (next: MealPlan) => setPlans(previous => previous.map(plan => plan._id === next._id ? next : plan));

  return <View style={appStyles.screen}>
    <ScrollView ref={scrollRef} style={styles.fill} contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadPlans(true)} tintColor={theme.ink} />}
      contentContainerStyle={{ ...contentColumn(), paddingTop: insets.top + 8, paddingHorizontal: gutter, paddingBottom: theme.bottomSpace }}>
      <AppScreenHeading title="CookEat" action={
        <TouchableOpacity style={appStyles.iconButton} accessibilityRole="button" accessibilityLabel={t('dailyApp.history')} onPress={() => setHistory(true)}><Ionicons name="time-outline" size={24} color={theme.ink} /></TouchableOpacity>
      } />
      <Text style={appStyles.title}>{t('dailyApp.weekTitle')}</Text>
      {current && <Text style={styles.range}>{formatPlanRange(current, locale)}</Text>}
      {loading && <ActivityIndicator style={styles.loader} color={theme.ink} />}
      {error && <View><Text accessibilityRole="alert" style={appStyles.error}>{error}</Text><TouchableOpacity accessibilityRole="button" style={styles.historyButton} onPress={() => void loadPlans(true)}><Text style={styles.historyText}>{t('mealLibrary.retry')}</Text></TouchableOpacity></View>}
      {current ? <>
        <PlanWeekContent key={`${current._id}:${selectionKey || ''}`} plan={current} onPlanChange={updatePlan}
          initialDay={selectedPlanId === current._id && selectedDay !== undefined ? Number(selectedDay) : undefined} />
        <TouchableOpacity accessibilityRole="button" style={styles.editWeek} onPress={configure}><Ionicons name="refresh-outline" size={20} color={theme.ink} /><Text style={appStyles.textAction}>{t('planningDetail.regenerate')}</Text></TouchableOpacity>
      </> : !loading && !error ? <EntranceView entranceIndex={0} style={styles.empty}>
        <EntranceView entranceIndex={1} style={styles.emptyMark}><Ionicons name="calendar-outline" size={44} color={theme.ink} /></EntranceView>
        <Text style={styles.emptyTitle}>{t('dailyApp.emptyTitle')}</Text>
        <Text style={[appStyles.subtitle, styles.emptyCopy]}>{t('dailyApp.emptyBody')}</Text>
        <TouchableOpacity accessibilityRole="button" style={appStyles.button} onPress={configure}><Text style={appStyles.buttonText}>{t('dailyApp.createWeek')}</Text><Ionicons name="arrow-forward" size={20} color={theme.ink} /></TouchableOpacity>
      </EntranceView> : null}
    </ScrollView>
    <Modal visible={history} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setHistory(false)}>
      <View style={appStyles.screen}>
        <View style={[styles.modalHeader, { paddingHorizontal: gutter, paddingTop: 24 }]}><Text style={appStyles.section}>{t('dailyApp.history')}</Text><NavigationIconButton kind="close" accessibilityRole="button" accessibilityLabel={t('common.close')} style={appStyles.iconButton} onPress={() => setHistory(false)} /></View>
        <ScrollView contentContainerStyle={{ ...contentColumn(), paddingHorizontal: gutter, paddingTop: 4, paddingBottom: insets.bottom + 32, gap: 12 }}>
          {!ordered.length && <Text style={[appStyles.subtitle, { marginTop: 30 }]}>{t('planningHistory.empty')}</Text>}
          {ordered.map(plan => {
            const photo = plan.meals.find(meal => meal.image)?.image;
            return <EntranceView entranceIndex={2} key={plan._id} style={planningStyles.mealCard}>
              <TouchableOpacity style={planningStyles.mealMain} accessibilityRole="button" activeOpacity={0.88} onPress={() => { setHistory(false); router.push({ pathname: '/planning/[planId]', params: { planId: plan._id } }); }}>
                <View style={[planningStyles.imageWrap, styles.thumbnailContent]}>{photo ? <Image source={getRecipeImageSource(photo)} style={planningStyles.mealImage} contentFit="cover" /> : <Ionicons name="restaurant-outline" size={28} color={theme.muted} />}</View>
                <View style={planningStyles.mealBody}>
                  <Text style={planningStyles.mealTitle}>{formatPlanRange(plan, locale)}</Text>
                  <Text style={[planningStyles.mealMeta, styles.historyMeta]}>{t('dailyApp.mealCount', { count: plan.meals.length })}</Text>
                  {plan._id === current?._id && <Text style={[planningStyles.mealType, styles.historyMeta]}>{t('planningHistory.current')}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#B7AE96" />
              </TouchableOpacity>
            </EntranceView>;
          })}
        </ScrollView>
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  historyButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyText: { fontFamily: 'CronosPro', fontSize: 15, lineHeight: 20, color: theme.muted },
  range: { marginTop: 6, fontFamily: 'CronosPro', fontSize: 17, color: theme.muted },
  loader: { marginVertical: 60 },
  editWeek: { minHeight: 48, marginTop: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  empty: { paddingVertical: 48, gap: 20 },
  emptyMark: { width: 88, height: 88, borderRadius: 28, backgroundColor: '#F8EAC0', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'Degular', fontSize: 32, lineHeight: 36, color: theme.ink, maxWidth: 290 },
  emptyCopy: { marginBottom: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20 },
  thumbnailContent: { alignItems: 'center', justifyContent: 'center' },
  historyMeta: { marginTop: 7 },
});
