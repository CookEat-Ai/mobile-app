import { FORM_CONTENT_MAX_WIDTH } from '../../constants/Layout';
import { AppTheme as designTheme, appStyles } from '../../constants/AppTheme';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '../../hooks/useResponsive';
import { normalizePantryIngredients } from '../../services/planningPantry';
import { PlanningFlowHeader } from './PlanningFlowHeader';
import { PantryReviewSection } from './PantryReviewSection';

/** Capture and manual entry use the same editable inventory and confirmation. */
export function PantryIngredientReview({ ingredients, saving, recognized = false, onConfirm, onBack, onRetake }: {
  ingredients: string[]; saving: boolean; recognized?: boolean; onConfirm: (names: string[]) => void; onBack: () => void; onRetake?: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const [selected, setSelected] = useState(() => normalizePantryIngredients(ingredients));
  return <View style={appStyles.screen}>
    <PlanningFlowHeader onClose={onBack} closeDisabled={saving} />
    <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={[styles.content, { paddingLeft: gutter + insets.left, paddingRight: gutter + insets.right }]}>
      <PantryReviewSection recognized={recognized} ingredients={selected} onChange={setSelected} disabled={saving} />
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24), paddingLeft: gutter + insets.left, paddingRight: gutter + insets.right }]}>
      {onRetake && <Pressable accessibilityRole="button" disabled={saving} style={styles.retake} onPress={onRetake}><Text style={appStyles.textAction}>{t('pantryScan.retake')}</Text></Pressable>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} style={[appStyles.button, styles.button, saving && styles.disabled]} onPress={() => onConfirm(selected)}>
        {saving ? <ActivityIndicator color={designTheme.onPrimary} /> : <><Text style={appStyles.buttonText}>{t(selected.length ? 'pantryScan.confirm' : 'pantryReview.continueEmpty')}</Text><Ionicons name="arrow-forward" size={22} color={designTheme.onPrimary} /></>}
      </Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  content: { paddingTop: 14, paddingBottom: 24, width: '100%', maxWidth: FORM_CONTENT_MAX_WIDTH, alignSelf: 'center' },
  button: { width: '100%', maxWidth: FORM_CONTENT_MAX_WIDTH, alignSelf: 'center' }, footer: { paddingTop: 12, gap: 8 }, retake: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.45 },
});
