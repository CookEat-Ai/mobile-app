import { useEntranceReplay } from '../../hooks/useEntranceReplay';
import { planningRevision } from '../../services/planningUpdates';
import { NavigationIconButton } from '../../components/NavigationIconButton';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { apiService, type MealPlan } from '../../services/api';
import { formatPlanRange, isPastPlan } from '../../services/planningDisplay';
import { PlanWeekContent } from '../../components/planning/PlanWeekContent';

export default function PlanDetailScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gutter, font } = useResponsive();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef<{ planId: string; revision: number } | null>(null);
  const shouldReplay = useEntranceReplay();
  const loadPlan = useCallback(async () => {
    setError(null);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId || !planId) throw new Error(t('planning.errors.user'));
      const response = await apiService.getMealPlanById(planId, userId);
      if (!response.data?.plan) throw new Error(response.error || t('planning.errors.load'));
      loaded.current = { planId, revision: planningRevision() };
      setPlan(response.data.plan);
    } catch (caught) { setError(caught instanceof Error ? caught.message : t('planning.errors.load')); }
    finally { setLoading(false); }
  }, [planId, t]);
  useFocusEffect(useCallback(() => {
    const replay = shouldReplay();
    if (replay || loaded.current?.planId !== planId || loaded.current?.revision !== planningRevision()) void loadPlan();
  }, [loadPlan, planId, shouldReplay]));
  return <View style={appStyles.screen}>
    <View style={[styles.topBar, { paddingTop: insets.top + 8, paddingHorizontal: gutter }]}>
      <NavigationIconButton style={appStyles.iconButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} />
      <Text style={[appStyles.headerTitle, { fontSize: font(29) }]}>{t('tabs.planning')}</Text><View style={{ width: 44 }} />
    </View>
    <ScrollView contentContainerStyle={{ ...contentColumn(), paddingHorizontal: gutter, paddingBottom: 32 + insets.bottom }} showsVerticalScrollIndicator={false}>
      {loading && <ActivityIndicator style={styles.loader} color={theme.ink} />}
      {error && <View><Text style={appStyles.error}>{error}</Text><TouchableOpacity style={appStyles.button} onPress={() => void loadPlan()}><Text style={appStyles.buttonText}>{t('mealLibrary.retry')}</Text></TouchableOpacity></View>}
      {plan && <><Text style={styles.week}>{formatPlanRange(plan, i18n.resolvedLanguage || 'fr')}</Text>
        <PlanWeekContent key={plan._id} plan={plan} onPlanChange={setPlan} />
        {!isPastPlan(plan) && <TouchableOpacity accessibilityRole="button" style={styles.regenerate} onPress={() => {
          if (isPastPlan(plan)) return;
          router.push({ pathname: '/planning/configure', params: { replace: 'true' } });
        }}><Ionicons name="refresh-outline" size={20} color={theme.ink} /><Text style={appStyles.textAction}>{t('planningDetail.regenerate')}</Text></TouchableOpacity>}
      </>}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 24 },
  week: { fontFamily: 'Degular', fontSize: 32, lineHeight: 37, color: theme.ink },
  loader: { marginVertical: 60 },
  regenerate: { marginTop: 28, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
