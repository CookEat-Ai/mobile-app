import { usePresentationMode } from '../../services/presentationMode';
import { PantryModeChoice } from './PantryModeChoice';
import { PANTRY_SCAN_HANDOFF_KEY, readPantryScanHandoff } from '../../services/pantryScanHandoff';
import { PlanningPantryCategoryModal } from './PlanningPantryCategoryModal';
import { normalizePantryIngredients as normalize } from '../../services/planningPantry';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';

export type PlanningPantryValue = { pantryIngredients: string[]; pantryMode: 'priority' | 'strict' };
const STORAGE = 'cookeat_planning_pantry_v1';
const SCAN = PANTRY_SCAN_HANDOFF_KEY;

export function PlanningPantry({ onChange, onBusy, onUseIngredients, presentationConfig, presentationReplace, useDisabled = false }: { onChange: (value: PlanningPantryValue) => void; onBusy: (busy: boolean) => void; onUseIngredients?: (value: PlanningPantryValue) => void; useDisabled?: boolean; presentationConfig?: string; presentationReplace?: string }) {
  const { t } = useTranslation();
  const presentationMode = usePresentationMode();
  const [value, setValue] = useState<PlanningPantryValue>({ pantryIngredients: [], pantryMode: 'priority' });
  const [ready, setReady] = useState(false);
  const busy = !ready;
  const [browse, setBrowse] = useState(false);
  const [error, setError] = useState('');
  const valueRef = useRef(value);
  valueRef.current = value;
  const changeRef = useRef(onChange); changeRef.current = onChange;
  const busyRef = useRef(onBusy); busyRef.current = onBusy;
  const useIngredientsRef = useRef(onUseIngredients); useIngredientsRef.current = onUseIngredients;
  const storageWrites = useRef(Promise.resolve());
  useEffect(() => {
    changeRef.current(value);
  }, [value]);
  const update = useCallback((next: PlanningPantryValue) => {
    valueRef.current = next;
    setValue(next); changeRef.current(next);
    storageWrites.current = storageWrites.current.catch(() => undefined).then(() => AsyncStorage.setItem(STORAGE, JSON.stringify(next))).catch(() => setError(t('planningPantry.saveError')));
  }, [t]);
  useEffect(() => {
    let active = true;
    busyRef.current(true);
    void AsyncStorage.getItem(STORAGE).then(raw => {
      if (!active) return;
      if (raw) {
        const parsed = JSON.parse(raw);
        const next: PlanningPantryValue = { pantryIngredients: normalize(Array.isArray(parsed.pantryIngredients) ? parsed.pantryIngredients.filter((item: unknown) => typeof item === 'string') : []), pantryMode: parsed.pantryMode === 'strict' ? 'strict' : 'priority' };
        valueRef.current = next; setValue(next); changeRef.current(next);
      } else changeRef.current(valueRef.current);
    }).catch(() => { if (active) setError(t('planningPantry.saveError')); }).finally(() => { if (active) { setReady(true); busyRef.current(false); } });
    return () => { active = false; };
  }, [t]);
  useFocusEffect(useCallback(() => {
    if (!ready || useDisabled) return;
    let active = true;
    void AsyncStorage.getItem(SCAN).then(async raw => {
      if (!raw || !active) return;
      const handoff = readPantryScanHandoff(raw);
      const next: PlanningPantryValue = { ...valueRef.current, pantryIngredients: handoff.replace ? handoff.ingredients : normalize([...valueRef.current.pantryIngredients, ...handoff.ingredients]), pantryMode: handoff.pantryMode || valueRef.current.pantryMode };
      await AsyncStorage.removeItem(SCAN);
      if (!active) return;
      update(next);
      if (presentationMode && handoff.generate && next.pantryIngredients.length) useIngredientsRef.current?.(next);
    }).catch(() => { if (active) setError(t('planningPantry.scanError')); });
    return () => { active = false; };
  }, [ready, useDisabled, presentationMode, t, update]));
  return <View style={styles.card}>
    <Text style={appStyles.section}>{t('planningPantry.title')}</Text>
    <Text style={styles.help}>{t('planningPantry.help')}</Text>
    <View style={styles.methods}>
      <Pressable accessibilityRole="button" disabled={!ready} style={[styles.method, !ready && styles.disabled]} onPress={() => router.push({ pathname: '/camera', params: { planningPantry: 'true', initialMode: 'photo', mode: 'append', pantryMode: value.pantryMode, ...(presentationMode && presentationConfig ? { presentationConfig, presentationReplace: presentationReplace || 'false' } : {}) } })}>
        <View style={styles.methodIcon}><Ionicons name="camera-outline" size={24} color={theme.ink} /></View>
        <View style={styles.methodCopy}><Text style={styles.text}>{t('planningPantry.photo')}</Text></View>
        <Ionicons name="chevron-forward" size={20} color={theme.muted} />
      </Pressable>
      <Pressable accessibilityRole="button" disabled={!ready} style={[styles.method, !ready && styles.disabled]} onPress={() => setBrowse(true)}>
        <View style={styles.methodIcon}><Ionicons name="basket-outline" size={24} color={theme.ink} /></View>
        <Text style={[styles.text, styles.methodCopy]}>{t('pantry.title')}</Text>
        <Ionicons name="chevron-forward" size={20} color={theme.muted} />
      </Pressable>
    </View>
    {!presentationMode && <PantryModeChoice value={value.pantryMode} disabled={busy} onChange={pantryMode => update({ ...valueRef.current, pantryMode })} />}
    {!!error && <Text accessibilityRole="alert" style={appStyles.error}>{error}</Text>}
    <PlanningPantryCategoryModal visible={browse} showPantry ingredients={value.pantryIngredients} onClose={() => setBrowse(false)} onChange={pantryIngredients => update({ ...valueRef.current, pantryIngredients })} />

  </View>;
}
const styles = StyleSheet.create({
  card: { width: '100%', padding: 18, borderRadius: 20, backgroundColor: theme.surface, marginTop: 24, gap: 12 },
  help: { fontFamily: 'CronosPro', fontSize: 14, lineHeight: 20, color: theme.muted },
  text: { fontFamily: 'CronosProBold', fontSize: 15, color: theme.ink, flexShrink: 1 },
  label: { fontFamily: 'CronosProBold', fontSize: 16, color: theme.ink, marginTop: 8 },
  methods: { gap: 12, marginVertical: 8 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 72, borderWidth: 1, borderColor: theme.line, borderRadius: 16 },
  methodIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.soft, alignItems: 'center', justifyContent: 'center' },
  methodCopy: { flex: 1, gap: 4 }, disabled: { opacity: 0.45 },
  sheet: { flex: 1, backgroundColor: theme.background },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 20 },
  browseContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, minHeight: 68, borderWidth: 1, borderColor: theme.line, borderRadius: 16, backgroundColor: theme.surface },
  emoji: { fontSize: 28, width: 36, textAlign: 'center' },
  sheetFooter: { paddingTop: 16, paddingHorizontal: 20, gap: 12, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.line },
  inputRow: { flexDirection: 'row', gap: 8 }, input: { flex: 1, minHeight: 52, borderWidth: 1, borderColor: theme.line, borderRadius: 14, padding: 12, fontFamily: 'CronosPro', fontSize: 16, color: theme.ink }, add: { width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: theme.yellowSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%', gap: 8, padding: 10, minHeight: 44, backgroundColor: theme.yellowSoft, borderRadius: 12 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 52, borderWidth: 1, borderColor: theme.line, borderRadius: 14 }, selected: { borderColor: theme.yellow, backgroundColor: theme.yellowSoft },
});
