import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { CostEstimate } from '../../services/api';

export function MealCostEstimate({ cost, compact = false, total = false, budget, panel = false, style }: {
  cost?: CostEstimate; compact?: boolean; total?: boolean; budget?: number;
  panel?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { t, i18n } = useTranslation();
  if (!cost) return null;
  const money = (value: number) => new Intl.NumberFormat(i18n.language, { style: 'currency', currency: cost.currency }).format(value);
  const complete = cost.status === 'estimated' && cost.amount !== null && Number.isFinite(cost.amount);
  const amount = complete ? (total ? cost.amount! : cost.perServing ?? cost.amount!)
    : cost.status === 'partial' ? cost.knownAmount / (total ? 1 : Math.max(1, cost.servings)) : null;
  const cap = total && Number.isFinite(budget) && budget! > 0 ? budget! : null;
  const over = cap !== null && complete && cost.amount! > cap;
  const hasRange = complete && cost.low !== null && cost.high !== null && Number.isFinite(cost.low) && Number.isFinite(cost.high) && cost.high > cost.low;
  const progressAmount = complete ? cost.amount : cost.status === 'partial' ? cost.knownAmount : null;
  // Without a target, show the estimate within its actual price range. Do not
  // invent a budget or present a made-up percentage of an absent target.
  const progress = progressAmount === null ? null : cap !== null ? progressAmount / cap
    : hasRange ? (progressAmount - cost.low!) / (cost.high! - cost.low!) : null;
  const percent = progress === null ? 0 : Math.max(0, Math.min(100, progress * 100));
  const progressLabel = cap !== null && complete
    ? t(over ? 'planningBudget.over' : 'mealCost.remaining', { amount: money(over ? cap : Math.max(0, cap - cost.amount!)) })
    : cap !== null ? amount !== null ? t('mealCost.partial', { amount: money(amount) }) : t('mealCost.unavailable')
    : hasRange ? t('mealCost.range', { low: money(cost.low!), high: money(cost.high!), count: cost.servings })
    : t('mealCost.noTarget');
  const progressValue = progress === null ? { text: progressLabel } : {
    min: cap !== null ? 0 : cost.low!, max: cap ?? cost.high!,
    now: cap !== null ? Math.min(cap, Math.max(0, progressAmount!)) : Math.min(cost.high!, Math.max(cost.low!, progressAmount!)),
    text: progressLabel,
  };
  if (compact) return <View style={styles.badge}>
    <Ionicons name="wallet-outline" size={14} color={theme.ink} />
    <Text style={styles.badgeText}>{amount === null ? t('mealCost.unavailable') : t('mealCost.portion', { amount: money(amount) })}{!complete && amount !== null ? ' · ' + t('mealCost.incompleteLabel') : ''}</Text>
  </View>;
  const price = <Text style={styles.amount} adjustsFontSizeToFit minimumFontScale={.65} numberOfLines={1}>{amount !== null ? `≈ ${money(amount)}` : '—'}</Text>;
  return <View style={[styles.card, style]}>
    <View style={styles.row}>
      <View style={styles.icon}><Ionicons name="wallet-outline" size={20} color={theme.onPrimary} /></View>
      <View style={styles.heading}>
        <Text style={styles.title}>{t(total ? 'mealCost.weekTitle' : 'mealCost.dishTitle')}</Text>
        {(cap !== null || !total || !complete && amount !== null) && <Text style={styles.caption}>{cap !== null ? `${t('mealCost.budgetLabel')} ${money(cap)}` : !total ? t('mealCost.perPerson') : ''}{!complete && amount !== null ? (cap !== null || !total ? ' · ' : '') + t('mealCost.incompleteLabel') : ''}</Text>}
      </View>
      {!panel && price}
    </View>
    {panel && price}
    {total && <>
      <View testID="budget-progress" accessible accessibilityRole="progressbar" accessibilityLabel={t('mealCost.weekTitle')} accessibilityValue={progressValue} style={styles.track}>
        <View testID="budget-progress-fill" style={[styles.fill, { width: `${percent}%`, backgroundColor: over ? theme.danger : theme.yellow }]} />
      </View>
      <Text style={[styles.remaining, over && { color: theme.danger }]}>{progressLabel}</Text>
    </>}
    {!total && complete && cost.servings > 1 && <Text style={styles.caption}>{t('mealCost.household', { amount: money(cost.amount!), count: cost.servings })}</Text>}
    {amount === null && (!total || cap === null) && <Text style={styles.caption}>{t('mealCost.unavailable')}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  card: { ...appStyles.card, marginVertical: 10, padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { flex: 1, minWidth: 0, gap: 2 },
  icon: { width: 36, height: 36, borderRadius: AppRadii.control, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow },
  title: { fontFamily: 'Degular', fontSize: 18, lineHeight: 21, color: theme.ink },
  caption: { fontFamily: 'CronosPro', fontSize: 14, lineHeight: 19, color: theme.muted },
  amount: { fontFamily: 'Degular', fontSize: 27, lineHeight: 32, flexShrink: 1, color: theme.ink, fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 5, backgroundColor: theme.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  remaining: { fontFamily: 'CronosProBold', fontSize: 13, lineHeight: 17, color: theme.ink },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.yellowSoft, borderRadius: AppRadii.chip, paddingHorizontal: 8, paddingVertical: 5, marginTop: 3 },
  badgeText: { fontFamily: 'CronosProBold', fontSize: 13, color: theme.ink, flexShrink: 1 },
});
