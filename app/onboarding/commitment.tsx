import { NavigationIconButton } from '../../components/NavigationIconButton';
import { OnboardingScrollView } from '../../components/onboarding/OnboardingScrollView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { feedback } from '../../services/haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { ClassicLoadingView } from '../../components/loading/ClassicLoadingView';
import analytics from '../../services/analytics';
import { calculateFitnessProjection, FitnessProfile, loadFitnessProfile } from '../../services/fitnessProfile';

const OPTIONS = [
  { value: 'commit_all_in', emoji: '🔥' },
  { value: 'commit_serious', emoji: '💪' },
  { value: 'commit_try', emoji: '🙂' },
  { value: 'commit_unsure', emoji: '🤔' },
] as const;

export default function CommitmentScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    void loadFitnessProfile().then(setProfile);
    analytics.track('onboarding_commitment_viewed');
  }, []);

  const projection = useMemo(() => profile ? calculateFitnessProjection(profile) : null, [profile]);
  if (!profile || !projection) return <ClassicLoadingView messageKey="onboarding_loading.messages" durationMs={1800} />;

  const choose = async (value: string) => {
    if (selected) return;
    setSelected(value);
    await Promise.all([
      AsyncStorage.setItem('commitmentLevel', value),
      feedback.confirm(),
    ]);
    analytics.track('onboarding_commitment_confirmed', { commitment_level: value, fitness_goal: profile.goal });
    analytics.track('onboarding_weekly_plan_requested', {
      commitment_level: value,
      fitness_goal: profile.goal,
      full_day: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 260));
    router.replace('/onboarding/weeklyPlanPreview');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <NavigationIconButton accessibilityLabel={t('common.back')} onPress={() => router.back()} style={[styles.backButton, { top: insets.top + 8 }]} />
      <OnboardingScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 34 + insets.bottom }]}>
        <View style={styles.icon}><Text style={styles.iconEmoji}>🎯</Text></View>
        <Text style={styles.title}>{t('fitnessOnboarding.commitment.title')}</Text>
        <Text style={styles.subtitle}>{t(`fitnessOnboarding.commitment.subtitle.${profile.goal}`, { weight: projection.targetWeightKg })}</Text>
        <View style={styles.cards}>
          {OPTIONS.map((option) => {
            const active = selected === option.value;
            return (
              <TouchableOpacity key={option.value} activeOpacity={0.82} disabled={Boolean(selected)} onPress={() => void choose(option.value)} style={[styles.card, active && styles.cardActive]} accessibilityRole="radio" accessibilityState={{ checked: active }}>
                <Text style={styles.emoji}>{option.emoji}</Text>
                <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>{t(`onboarding.formQuestions.${option.value}`)}</Text>
                <View style={[styles.radio, active && styles.radioActive]}>{active && <View style={styles.radioDot} />}</View>
              </TouchableOpacity>
            );
          })}
        </View>
      </OnboardingScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF9E2' },
  backButton: { position: 'absolute', zIndex: 2, left: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F2F5', alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 76 },
  icon: { alignSelf: 'center', width: 68, height: 68, borderRadius: 24, backgroundColor: '#FFF1C5', alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 30 },
  title: { marginTop: 22, textAlign: 'center', fontFamily: 'Degular', fontSize: 34, lineHeight: 39, color: Colors.light.text },
  subtitle: { marginTop: 10, marginBottom: 30, paddingHorizontal: 10, textAlign: 'center', fontFamily: 'CronosPro', fontSize: 17, lineHeight: 23, color: Colors.light.textSecondary },
  cards: { gap: 15 },
  card: { minHeight: 68, borderRadius: 200, borderWidth: 2, borderColor: 'transparent', backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardActive: { borderColor: Colors.light.button },
  emoji: { width: 34, marginRight: 12, fontSize: 21, textAlign: 'center' },
  cardLabel: { flex: 1, fontFamily: 'Degular', fontSize: 20, lineHeight: 23, color: Colors.light.text },
  cardLabelActive: { color: Colors.light.button },
  radio: { width: 24, height: 24, marginLeft: 14, borderRadius: 12, borderWidth: 2, borderColor: Colors.light.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.light.button },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.light.button },
});
