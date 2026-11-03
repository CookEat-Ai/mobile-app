import { AppModal as Modal } from './ui/AppModal';
import { AppSpinner as ActivityIndicator } from './ui/AppSpinner';
import { AppScreenHeading } from './AppScreenHeading';
import { NavigationIconButton } from './NavigationIconButton';
import { AppRadii, AppTheme as theme, appStyles } from '../constants/AppTheme';
import { feedback } from '../services/haptics';
import { notificationService } from '../services/notificationService';
import api, { type MealReminderTimes } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const MEALS = ['breakfast', 'lunch', 'dinner'] as const;
const STEP_MINUTES = 15;
// Mirrors the API so the sheet works before the first response; the server stays authoritative.
const DEFAULT_TIMES: MealReminderTimes = { breakfast: 7 * 60 + 45, lunch: 11 * 60 + 45, dinner: 18 * 60 + 45 };
const DEFAULT_RANGES: Record<keyof MealReminderTimes, [number, number]> = { breakfast: [300, 645], lunch: [660, 945], dinner: [960, 1425] };

export function formatReminderTime(minutes: number, language: string) {
  return new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
}

/** Lets the user move each pre-meal photo reminder by quarter hours within its meal range. */
export function MealRemindersModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [times, setTimes] = useState<MealReminderTimes | null>(null);
  const [saved, setSaved] = useState<MealReminderTimes | null>(null);
  const [defaults, setDefaults] = useState(DEFAULT_TIMES);
  const [ranges, setRanges] = useState(DEFAULT_RANGES);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setError(null); setTimes(null);
    void notificationService.areNotificationsEnabled().then(value => { if (active) setEnabled(value); }).catch(() => undefined);
    void api.getMealReminders().then(response => {
      if (!active) return;
      if (!response.data?.times) { setError(t('mealReminders.loadError')); return; }
      setTimes(response.data.times); setSaved(response.data.times);
      if (response.data.defaults) setDefaults(response.data.defaults);
      if (response.data.ranges) setRanges(response.data.ranges);
    }).catch(() => { if (active) setError(t('mealReminders.loadError')); });
    return () => { active = false; };
  }, [visible, t]);

  const shift = (meal: keyof MealReminderTimes, delta: number) => {
    feedback.light();
    setTimes(current => {
      if (!current) return current;
      const [min, max] = ranges[meal];
      return { ...current, [meal]: Math.min(max, Math.max(min, current[meal] + delta)) };
    });
  };
  const changed = !!times && !!saved && MEALS.some(meal => times[meal] !== saved[meal]);
  const isDefault = !!times && MEALS.every(meal => times[meal] === defaults[meal]);
  const save = async () => {
    if (!times || saving) return;
    setSaving(true); setError(null);
    try {
      const response = await api.updateMealReminders(times);
      if (!response.data?.times) throw new Error('save_failed');
      setSaved(response.data.times);
      feedback.success();
      onClose();
    } catch { setError(t('mealReminders.saveError')); }
    finally { setSaving(false); }
  };
  const enable = async () => {
    const granted = await notificationService.requestNotificationsWithContext().catch(() => false);
    if (granted) setEnabled(true);
    else notificationService.showManualNotificationInstructions();
  };

  return <Modal visible={visible} transparent presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 16, maxHeight: height - insets.top - 24 }]}>
            <AppScreenHeading title={t('mealReminders.title')} action={<NavigationIconButton kind="close" onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              <Text style={appStyles.subtitle}>{t('mealReminders.subtitle')}</Text>
              {!enabled && <TouchableOpacity accessibilityRole="button" onPress={() => { void enable(); }} style={styles.notice}>
                <Ionicons name="notifications-off-outline" size={20} color={theme.ink} />
                <Text style={[appStyles.textAction, { flex: 1 }]}>{t('mealReminders.enableNotifications')}</Text>
              </TouchableOpacity>}
              {!times && !error && <View style={styles.loading}><ActivityIndicator color={theme.ink} /></View>}
              {times && MEALS.map(meal => {
                const [min, max] = ranges[meal];
                const label = t(`mealReminders.${meal}`), time = formatReminderTime(times[meal], i18n.language);
                return <View key={meal} style={styles.row}>
                  <Text style={styles.meal}>{label}</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('mealReminders.earlier', { meal: label })} disabled={saving || times[meal] <= min} onPress={() => shift(meal, -STEP_MINUTES)} style={[styles.stepButton, times[meal] <= min && styles.disabled]}>
                      <Ionicons name="remove" size={20} color={theme.ink} />
                    </TouchableOpacity>
                    <Text accessibilityLabel={t('mealReminders.timeLabel', { meal: label, time })} style={styles.time}>{time}</Text>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('mealReminders.later', { meal: label })} disabled={saving || times[meal] >= max} onPress={() => shift(meal, STEP_MINUTES)} style={[styles.stepButton, times[meal] >= max && styles.disabled]}>
                      <Ionicons name="add" size={20} color={theme.ink} />
                    </TouchableOpacity>
                  </View>
                </View>;
              })}
              {error && <Text accessibilityRole="alert" style={appStyles.error}>{error}</Text>}
              {times && <>
                <TouchableOpacity accessibilityRole="button" disabled={!changed || saving} onPress={() => { void save(); }} style={[appStyles.button, styles.save, (!changed || saving) && styles.disabled]}>
                  {saving ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={appStyles.buttonText}>{t('mealReminders.save')}</Text>}
                </TouchableOpacity>
                {!isDefault && <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={() => setTimes(defaults)} style={styles.reset}>
                  <Text style={styles.resetText}>{t('mealReminders.reset')}</Text>
                </TouchableOpacity>}
              </>}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { backgroundColor: theme.background, width: '100%', maxWidth: 560, alignSelf: 'center', borderTopLeftRadius: AppRadii.sheet, borderTopRightRadius: AppRadii.sheet, padding: 20, overflow: 'hidden' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: AppRadii.control, backgroundColor: theme.yellowSoft },
  loading: { paddingVertical: 32, alignItems: 'center' },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: AppRadii.control, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
  meal: { flex: 1, fontFamily: 'Degular', fontSize: 19, color: theme.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: { width: 44, height: 44, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.soft },
  time: { minWidth: 64, textAlign: 'center', fontFamily: 'Degular', fontSize: 21, color: theme.ink, fontVariant: ['tabular-nums'] },
  disabled: { opacity: .45 },
  save: { marginTop: 8 },
  reset: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  resetText: { ...appStyles.textAction, textDecorationLine: 'underline' },
});
