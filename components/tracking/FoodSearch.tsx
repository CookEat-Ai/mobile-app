import { AppSpinner as ActivityIndicator } from '../ui/AppSpinner';
import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export type FoodSearchOption = { foodKey: string; name: string; description: string; per100g: { calories: number } };

/** Picks the reference a food's nutrition is computed from, or starts a hand-made one. */
export function FoodSearch({ query, onQuery, foods, loading, error, gutter, bottomInset, onRetry, onChoose, onCreate }: {
    query: string;
    onQuery: (value: string) => void;
    foods: FoodSearchOption[];
    loading: boolean;
    error: boolean;
    gutter: number;
    bottomInset: number;
    onRetry: () => void;
    onChoose: (food: FoodSearchOption) => void;
    onCreate: () => void;
}) {
    const { t } = useTranslation();
    return <View style={{ flex: 1 }}>
        <View style={[styles.top, { paddingHorizontal: gutter }]}>
            <View style={styles.search}>
                <Ionicons name="search" size={20} color={theme.muted}/>
                <TextInput accessibilityLabel={t('tracking.searchFood')} placeholder={t('tracking.searchFood')} placeholderTextColor={theme.muted} value={query} onChangeText={onQuery} autoFocus autoCorrect={false} returnKeyType="search" style={styles.searchInput}/>
                {!!query && <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.clear')} onPress={() => onQuery('')} hitSlop={10}><Ionicons name="close-circle" size={20} color={theme.muted}/></TouchableOpacity>}
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={onCreate} style={styles.create}>
                <View style={styles.createIcon}><Ionicons name="add" size={20} color={theme.onPrimary}/></View>
                <Text style={styles.createText}>{t('tracking.createFood')}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.muted}/>
            </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.results, { paddingHorizontal: gutter, paddingBottom: bottomInset + 20 }]}>
            {loading && <ActivityIndicator color={theme.yellow}/>}
            {error ? <View style={styles.empty}>
                <View style={styles.emptyIcon}><Ionicons name="cloud-offline-outline" size={26} color={theme.ink}/></View>
                <Text style={styles.emptyText}>{t('tracking.searchError')}</Text>
                <TouchableOpacity accessibilityRole="button" style={[appStyles.button, styles.retry]} onPress={onRetry}><Text style={appStyles.buttonText}>{t('common.retry')}</Text></TouchableOpacity>
            </View> : foods.map(food => <TouchableOpacity key={food.foodKey} accessibilityRole="button" onPress={() => onChoose(food)} style={styles.result}>
                <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.resultName} numberOfLines={2}>{food.name}</Text>
                    {!!food.description && <Text style={styles.resultNote} numberOfLines={2}>{food.description}</Text>}
                </View>
                <View style={styles.kcal}>
                    <Text style={styles.kcalValue}>{Math.round(food.per100g.calories)}</Text>
                    <Text style={styles.kcalUnit}>kcal / 100 g</Text>
                </View>
            </TouchableOpacity>)}
            {!loading && !error && !foods.length && <View style={styles.empty}>
                <View style={styles.emptyIcon}><Ionicons name="search" size={24} color={theme.ink}/></View>
                <Text style={styles.emptyText}>{t('tracking.noReference')}</Text>
            </View>}
        </ScrollView>
    </View>;
}

const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 };
const styles = StyleSheet.create({
    top: { gap: 12, paddingTop: 4, paddingBottom: 8 },
    search: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, borderRadius: AppRadii.pill, backgroundColor: theme.surface, borderWidth: 2, borderColor: theme.yellow, ...shadow },
    searchInput: { flex: 1, paddingVertical: 12, fontFamily: 'CronosPro', fontSize: 18, color: theme.ink },
    create: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: AppRadii.pill, backgroundColor: theme.surface, ...shadow },
    createIcon: { width: 34, height: 34, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow },
    createText: { ...appStyles.textAction, flex: 1 },
    results: { gap: 10, paddingTop: 8 },
    result: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingLeft: 20, paddingRight: 14, borderRadius: AppRadii.card, backgroundColor: theme.surface, ...shadow },
    resultName: { fontFamily: 'Degular', fontSize: 19, lineHeight: 23, color: theme.ink },
    resultNote: { fontFamily: 'CronosPro', fontSize: 13, lineHeight: 17, color: theme.muted },
    kcal: { minWidth: 72, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: AppRadii.control, backgroundColor: theme.yellowSoft },
    kcalValue: { fontFamily: 'Degular', fontSize: 20, lineHeight: 23, color: theme.ink },
    kcalUnit: { fontFamily: 'CronosPro', fontSize: 11, color: theme.muted },
    empty: { alignItems: 'center', gap: 12, paddingVertical: 28 },
    emptyIcon: { width: 56, height: 56, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellowSoft },
    emptyText: { ...appStyles.subtitle, textAlign: 'center' },
    retry: { alignSelf: 'stretch' },
});
