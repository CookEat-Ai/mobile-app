import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { apiService } from '../../services/api';
type Options = {
    country: string;
    currency: string;
    minimum: number;
    maximum: number;
    step: number;
    defaultAmount: number;
};
export function PlanningBudgetPicker({ people, value, onChange }: {
    people: number;
    value?: number;
    onChange: (amount: number | undefined, region: Options) => void;
}) {
    const { t, i18n } = useTranslation();
    const [options, setOptions] = useState<Options | null>(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [text, setText] = useState(value ? String(value) : '');
    const change = useRef(onChange);
    change.current = onChange;
    useEffect(() => {
        let active = true;
        setError(false);
        setOptions(null);
        void apiService.getPlanningBudgetOptions(people).then(response => {
            if (!active)
                return;
            if (!response.data)
                throw new Error('budget_unavailable');
            const next = response.data;
            setOptions(next);
            const amount = value && value >= next.minimum && value <= next.maximum ? value : next.defaultAmount;
            setText(String(amount));
            change.current(amount, next);
        }).catch(() => { if (active)
            setError(true); });
        return () => { active = false; };
        // Value changes are edits, not new option requests.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [people, attempt]);
    if (error)
        return <View><Text style={appStyles.error}>{t('planningBudget.loadError')}</Text><TouchableOpacity style={appStyles.button} onPress={() => setAttempt(n => n + 1)}><Text style={appStyles.buttonText}>{t('common.retry')}</Text></TouchableOpacity></View>;
    if (!options)
        return <ActivityIndicator color={theme.yellow} style={{ margin: 40 }}/>;
    const money = (amount: number) => new Intl.NumberFormat(i18n.language, { style: 'currency', currency: options.currency, maximumFractionDigits: 0 }).format(amount);
    const select = (amount: number) => { const n = Math.min(options.maximum, Math.max(options.minimum, amount)); setText(String(n)); change.current(n, options); };
    return <View style={{ gap: 20 }}>
    <Text style={appStyles.subtitle}>{t('planningBudget.totalForPeople', { count: people })}</Text>
    <View style={[appStyles.card, { alignItems: 'center', gap: 18, paddingVertical: 26 }]}>
      <Text style={appStyles.eyebrow}>{t('planningBudget.totalWeek')}</Text>
      <View style={styles.amountRow}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('planningBudget.less')} onPress={() => select((value || options.minimum) - options.step)} style={styles.step}><Ionicons name="remove" size={24} color={theme.ink}/></TouchableOpacity>
        <TextInput accessibilityLabel={t('planningBudget.amount')} keyboardType="number-pad" selectTextOnFocus value={text} onChangeText={raw => { const clean = raw.replace(/[^0-9]/g, ''); setText(clean); const n = Number(clean); change.current(n >= options.minimum && n <= options.maximum ? n : undefined, options); }} style={styles.amount}/>
        <Text style={styles.currency}>{options.currency}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('planningBudget.more')} onPress={() => select((value || options.minimum) + options.step)} style={styles.step}><Ionicons name="add" size={24} color={theme.ink}/></TouchableOpacity>
      </View>
      <Text style={appStyles.subtitle}>{t('planningBudget.perPerson', { amount: money((value || options.minimum) / people) })}</Text>
    </View>
    <View style={styles.presets}>{[1, 1.5, 2.5, 4, 5].map(factor => Math.min(options.maximum, Math.round(options.minimum * factor / options.step) * options.step)).filter((n, i, arr) => arr.indexOf(n) === i).map(amount => <TouchableOpacity key={amount} accessibilityRole="radio" accessibilityState={{ checked: value === amount }} style={[styles.preset, value === amount && { backgroundColor: theme.yellowSoft, borderColor: theme.yellow }]} onPress={() => select(amount)}><Text style={styles.presetText}>{money(amount)}</Text></TouchableOpacity>)}</View>
    <Text style={appStyles.subtitle}>{t('planningBudget.range', { minimum: money(options.minimum), maximum: money(options.maximum) })}</Text>
    <Text style={appStyles.subtitle}>{t('planningBudget.estimateNote')}</Text>
  </View>;
}
const styles = StyleSheet.create({ amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, step: { height: 44, width: 44, borderRadius: AppRadii.control, backgroundColor: theme.yellowSoft, alignItems: 'center', justifyContent: 'center' }, amount: { fontFamily: 'Degular', fontSize: 44, minWidth: 70, maxWidth: 150, textAlign: 'center', color: theme.ink, padding: 0 }, currency: { fontFamily: 'CronosProBold', fontSize: 16, color: theme.muted }, presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, preset: { padding: 14, borderRadius: AppRadii.control, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, minHeight: 52 }, presetText: { fontFamily: 'Degular', fontSize: 20, color: theme.ink } });
