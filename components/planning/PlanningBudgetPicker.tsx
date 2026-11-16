import { AppSpinner as ActivityIndicator } from '../ui/AppSpinner';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppSlider } from '../ui/AppSlider';
import { useTranslation } from 'react-i18next';

import { budgetOptionsForDays } from '../../services/planningBudget';
import { apiService } from '../../services/api';
type Options = {
    country: string;
    currency: string;
    minimum: number;
    maximum: number;
    step: number;
    defaultAmount: number;
    horizonDays: number;
};
export function PlanningBudgetPicker({ people, days, value, onChange }: {
    people: number;
    days: number;
    value?: number;
    onChange: (amount: number | undefined, region: Options) => void;
}) {
    const { t, i18n } = useTranslation();
    const [options, setOptions] = useState<Options | null>(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const change = useRef(onChange);
    change.current = onChange;
    useEffect(() => {
        let active = true;
        setError(false);
        setOptions(null);
        void apiService.getPlanningBudgetOptions(people, days).then(response => {
            if (!active)
                return;
            if (!response.data)
                throw new Error('budget_unavailable');
            const next = budgetOptionsForDays(response.data, days);
            setOptions(next);
            const amount = value && value >= next.minimum && value <= next.maximum ? value : next.defaultAmount;
            change.current(amount, next);
        }).catch(() => { if (active)
            setError(true); });
        return () => { active = false; };
        // Value changes are edits, not new option requests.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [people, days, attempt]);
    if (error)
        return <View><Text style={appStyles.error}>{t('planningBudget.loadError')}</Text><TouchableOpacity style={appStyles.button} onPress={() => setAttempt(n => n + 1)}><Text style={appStyles.buttonText}>{t('common.retry')}</Text></TouchableOpacity></View>;
    if (!options)
        return <ActivityIndicator color={theme.yellow} style={{ margin: 40 }}/>;
    const money = (amount: number) => new Intl.NumberFormat(i18n.language, { style: 'currency', currency: options.currency, maximumFractionDigits: 0 }).format(amount);
    const select = (amount: number) => { const n = Math.min(options.maximum, Math.max(options.minimum, amount)); change.current(n, options); };
    return <View style={{ gap: 20 }}>
    <Text style={appStyles.subtitle}>{t('planningBudget.totalForPeople', { count: people })}</Text>
    <View style={[appStyles.card, { alignItems: 'center', gap: 18, paddingVertical: 26 }]}>
      <Text style={appStyles.eyebrow}>{t('planningBudget.totalDays', {count: days})}</Text>
      <Text style={styles.amount}>{money(value ?? options.defaultAmount)}</Text>
      <AppSlider minimum={options.minimum} maximum={options.maximum} step={options.step}
        value={value ?? options.defaultAmount} onChange={select} label={t('planningBudget.amount')} valueText={money(value ?? options.defaultAmount)} />
    </View>
  </View>;
}
const styles = StyleSheet.create({ amount: { fontFamily: 'Degular', fontSize: 44, textAlign: 'center', color: theme.ink } });
