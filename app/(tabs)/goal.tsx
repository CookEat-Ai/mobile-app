import { EntranceView } from '../../components/motion/Entrance';
import { AppScreenHeading } from '../../components/AppScreenHeading';
import { NutritionMacros } from '../../components/planning/PlanningNutritionSummary';
import { planningStyles } from '../../components/planning/PlanningStyles';
import { NavigationIconButton } from '../../components/NavigationIconButton';
import { feedback } from '../../services/haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { NutritionExplanation } from '../../components/NutritionExplanation';
import { WeightProgressCard } from '../../components/WeightProgressCard';
import { calculateFitnessProjection, FitnessProfile, loadFitnessProfile } from '../../services/fitnessProfile';
import { decideWeightAdjustment, evaluateWeightTrend, loadWeightTracking, recordWeight, WeightLog, WeightReview } from '../../services/weightTracking';
import analytics from '../../services/analytics';

export default function GoalScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [review, setReview] = useState<WeightReview | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [weight, setWeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [inputError, setInputError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const nextProfile = await loadFitnessProfile();
      const tracking = await loadWeightTracking(nextProfile);
      setProfile(nextProfile); setLogs(tracking.logs); setReview(tracking.review);
      setWeight(String(nextProfile.currentWeightKg)); setError('');
    } catch { setError('weightTracking.loadError'); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const projection = useMemo(() => profile ? calculateFitnessProjection(profile) : null, [profile]);
  const trend = useMemo(() => profile && review ? evaluateWeightTrend(profile, logs, review) : null, [profile, logs, review]);
  const displayWeight = (value: number) => value.toLocaleString(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const saveWeight = async () => {
    if (busy) return;
    const parsed = Number(weight.trim().replace(',', '.'));
    if (!weight.trim() || !Number.isFinite(parsed) || parsed < 35 || parsed > 300) { feedback.warning(); setInputError('weightTracking.invalid'); return; }
    setBusy(true); setInputError('');
    try {
      await recordWeight(parsed);
      await load(); setModalVisible(false); setMessage('weightTracking.saved');
      analytics.track('weight_logged');
      void feedback.success();
    } catch { feedback.error(); setInputError('weightTracking.saveError'); }
    finally { setBusy(false); }
  };
  const decide = async (accept: boolean) => {
    if (busy || trend?.suggestedCalories === undefined) return;
    setBusy(true);
    try {
      await decideWeightAdjustment(trend.suggestedCalories, accept);
      analytics.track(accept ? 'nutrition_adjustment_accepted' : 'nutrition_adjustment_declined');
      await load(); feedback.success(); setMessage(accept ? 'weightTracking.applied' : 'weightTracking.kept');
    } catch { feedback.error(); await load(); setError('weightTracking.decisionError'); }
    finally { setBusy(false); }
  };

  if (!profile || !projection) return <View style={[appStyles.screen, { padding: gutter, paddingTop: insets.top + 8 }]}>
    <AppScreenHeading title={t('tabs.goal')} />
    {error ? <View style={appStyles.card}><Text style={styles.error}>{t(error)}</Text><TouchableOpacity accessibilityRole="button" style={styles.logButton} onPress={() => void load()}><Text style={styles.logButtonText}>{t('weightTracking.retry')}</Text></TouchableOpacity></View> : <ActivityIndicator color={theme.yellow} />}
  </View>;
  const hasTarget = ['gain_muscle', 'lose_weight'].includes(profile.goal);
  return <View style={appStyles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ ...contentColumn(), paddingTop: insets.top + 8, paddingHorizontal: gutter, paddingBottom: theme.bottomSpace }}>
      <AppScreenHeading title={t('tabs.goal')} />
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text>}
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.note}>{t(message)}</Text>}
      <WeightProgressCard logs={logs} initialWeight={logs[0]?.weight ?? profile.nutritionWeightKg ?? profile.currentWeightKg}
        initialDate={logs[0]?.date}
        targetWeight={hasTarget ? projection.targetWeightKg : undefined}
        onLogWeight={() => { setInputError(''); setWeight(String(profile.currentWeightKg)); setModalVisible(true); }} />
      <EntranceView entranceIndex={0} style={styles.nutritionCard}>
        <Text style={appStyles.section}>{t('goal.nutrition')}</Text>
        <Text style={planningStyles.summaryCalories}>≈ {projection.dailyCalories} <Text style={planningStyles.summaryUnit}>kcal / {t('goal.day')}</Text></Text>
        <NutritionMacros proteins={projection.dailyProteinGrams} carbs={projection.dailyCarbsGrams} fats={projection.dailyFatGrams} />
        <Text style={planningStyles.nutritionNote}>{t('nutritionEstimate.adjustable')}</Text>
        <NutritionExplanation profile={profile} />
      </EntranceView>
      {trend && <EntranceView entranceIndex={1} style={styles.weightCard}>
        <Text style={styles.sectionTitle}>{t('weightTracking.trendTitle')}</Text>
        {trend.recentAverage !== undefined && trend.previousAverage !== undefined && <View style={[styles.weightHeader, { marginVertical: 16 }]}>
          <View style={{ flex: 1 }}><Text style={styles.smallLabel}>{t('weightTracking.previousAverage')}</Text><Text style={styles.weightValue}>{displayWeight(trend.previousAverage)} kg</Text></View>
          <View style={[styles.right, { flex: 1 }]}><Text style={styles.smallLabel}>{t('weightTracking.recentAverage')}</Text><Text style={styles.weightValue}>{displayWeight(trend.recentAverage)} kg</Text></View>
        </View>}
        <Text style={styles.note}>{t(`weightTracking.states.${trend.status}`)}</Text>
        {trend.status === 'adjust' && <>
          <Text style={styles.proposal}>{projection.dailyCalories} → {trend.suggestedCalories} {t('nutritionEstimate.caloriesPerDay')}</Text>
          <Text style={styles.note}>{t('weightTracking.proposalHint')}</Text>
          <TouchableOpacity accessibilityRole="button" disabled={busy} style={[styles.saveButton, busy && { opacity: 0.5 }]} onPress={() => Alert.alert(t('weightTracking.confirmTitle'), t('weightTracking.confirmBody', { calories: trend.suggestedCalories }), [
            { text: t('weightTracking.cancel'), style: 'cancel' }, { text: t('weightTracking.apply'), onPress: () => void decide(true) },
          ])}><Text style={styles.saveText}>{t('weightTracking.apply')}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.secondaryButton} onPress={() => void decide(false)}><Text style={appStyles.textAction}>{t('weightTracking.keep')}</Text></TouchableOpacity>
        </>}
        <Text style={styles.note}>{t('weightTracking.localOnly')}</Text>
      </EntranceView>}
    </ScrollView>
    <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => { if (!busy) setModalVisible(false); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalOverlay, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <ScrollView style={{ width: '100%', maxWidth: 420 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 16 }}>
          <View style={styles.modalCard}>
            <AppScreenHeading title={t('goal.modalTitle')} action={<NavigationIconButton kind="close" accessibilityLabel={t('weightTracking.cancel')} disabled={busy} onPress={() => setModalVisible(false)} />} />
            <Text style={styles.note}>{t('weightTracking.todayHint')}</Text>
            <View style={styles.inputRow}><TextInput accessibilityLabel={t('goal.modalTitle')} editable={!busy} value={weight} onChangeText={value => { setWeight(value); setInputError(''); }} keyboardType="decimal-pad" selectTextOnFocus maxLength={6} style={styles.input} /><Text style={styles.kg}>kg</Text></View>
            {!!inputError && <Text accessibilityRole="alert" style={styles.error}>{t(inputError)}</Text>}
            <TouchableOpacity accessibilityRole="button" disabled={busy} style={[styles.saveButton, busy && { opacity: 0.5 }]} onPress={() => void saveWeight()}>{busy ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>{t('goal.save')}</Text>}</TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  sectionTitle: { ...appStyles.section },
  note: { marginTop: 12, fontFamily: 'CronosPro', fontSize: 15, lineHeight: 21, color: theme.muted },
  error: { ...appStyles.error },
  proposal: { marginTop: 16, fontFamily: 'Degular', fontSize: 25, color: theme.ink },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  nutritionCard: { ...planningStyles.summary, marginBottom: 16, padding: 18 },
  weightCard: { ...appStyles.card, marginBottom: 16 },
  weightHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  right: { alignItems: 'flex-end' },
  smallLabel: { fontFamily: 'CronosPro', fontSize: 14, lineHeight: 19, color: theme.muted },
  weightValue: { marginTop: 4, fontFamily: 'Degular', fontSize: 32, color: theme.ink, flexShrink: 1 },
  logButton: { ...appStyles.button },
  logButtonText: { ...appStyles.buttonText },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(8,26,16,0.38)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: theme.radius, padding: 20, backgroundColor: theme.background },
  inputRow: { marginTop: 20, minHeight: 70, borderRadius: 17, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
  input: { flex: 1, fontFamily: 'Degular', fontSize: 32, color: theme.ink, textAlign: 'center', paddingVertical: 12 },
  kg: { fontFamily: 'CronosPro', fontSize: 17, color: theme.muted },
  saveButton: { ...appStyles.button, marginTop: 16 },
  saveText: { ...appStyles.buttonText },
});
