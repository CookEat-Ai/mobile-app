import { AppRadii, AppTheme as theme, appStyles, NutritionColors } from '../../constants/AppTheme';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { feedback } from '../../services/haptics';
import { foodNutrition, type PhotoFood } from '../../services/mealTracking';
import { FoodPhotoThumbnail } from './FoodPhotoThumbnail';

const STEP = 10, MAX_GRAMS = 2000;

/** One food of a meal: its live estimate, its portion and the ways to correct it. */
export function FoodDetail({ photo, item, saving, gutter, bottomInset, onGrams, onChangeReference, onEditNutrition, onRemove, onDone }: {
    photo?: { uri: string; width: number; height: number };
    item: PhotoFood;
    saving: boolean;
    gutter: number;
    bottomInset: number;
    onGrams: (grams: number) => void;
    onChangeReference: () => void;
    onEditNutrition: () => void;
    onRemove: () => void;
    onDone: () => void;
}) {
    const { t } = useTranslation();
    const nutrition = foodNutrition([item]);
    const valid = item.grams >= 1 && item.grams <= MAX_GRAMS;
    const nudge = (delta: number) => {
        const next = Math.min(MAX_GRAMS, Math.max(1, (item.grams || 0) + delta));
        if (next === item.grams) return;
        void feedback.light();
        onGrams(next);
    };
    return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingHorizontal: gutter, paddingBottom: bottomInset + 24 }]}>
        <View style={styles.hero}>
            <FoodPhotoThumbnail photo={photo} item={item} size={88}/>
            <Text accessibilityRole="header" style={styles.name} numberOfLines={2}>{item.name}</Text>
        </View>
        {nutrition ? <View style={styles.nutrition}>
            <View style={styles.energy}>
                <Text accessibilityLiveRegion="polite" style={styles.calories}>{Math.round(nutrition.calories)}</Text>
                <Text style={styles.caloriesUnit}>kcal</Text>
            </View>
            <View style={styles.macros}>{(['proteins', 'carbs', 'fats'] as const).map(key => <View key={key} style={styles.macro}>
                <View style={[styles.dot, { backgroundColor: NutritionColors[key] }]}/>
                <Text style={styles.macroValue}>{Math.round(nutrition[key])} g</Text>
                <Text style={styles.macroLabel} numberOfLines={1}>{t(`tracking.${key}`)}</Text>
            </View>)}</View>
        </View> : <Text style={styles.missing}>{t('tracking.chooseReference')}</Text>}
        <View style={styles.card}>
            <Text style={styles.label}>{t('tracking.portionGrams')}</Text>
            <View style={styles.stepper}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('tracking.lessGrams', { step: STEP })} disabled={saving || item.grams <= 1} onPress={() => nudge(-STEP)} style={[styles.stepButton, (saving || item.grams <= 1) && styles.disabled]}><Ionicons name="remove" size={24} color={theme.ink}/></TouchableOpacity>
                <View style={styles.gramsField}>
                    <TextInput accessibilityLabel={t('tracking.foodGrams', { name: item.name })} editable={!saving} keyboardType="number-pad" selectTextOnFocus maxLength={4} value={item.grams ? String(item.grams) : ''} onChangeText={raw => onGrams(Number(raw.replace(/[^0-9]/g, '')))} style={styles.gramsInput} placeholder="0" placeholderTextColor={theme.muted}/>
                    <Text style={styles.gramsUnit}>g</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('tracking.moreGrams', { step: STEP })} disabled={saving || item.grams >= MAX_GRAMS} onPress={() => nudge(STEP)} style={[styles.stepButton, (saving || item.grams >= MAX_GRAMS) && styles.disabled]}><Ionicons name="add" size={24} color={theme.ink}/></TouchableOpacity>
            </View>
        </View>
        <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={onChangeReference} style={styles.action}>
            <View style={styles.actionIcon}><Ionicons name="swap-horizontal" size={18} color={theme.onPrimary}/></View>
            <Text style={styles.actionText}>{t('tracking.changeReference')}</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.muted}/>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('tracking.editFoodNutrition', { name: item.name })} disabled={saving} onPress={onEditNutrition} style={styles.action}>
            <View style={styles.actionIcon}><Ionicons name="create-outline" size={18} color={theme.onPrimary}/></View>
            <Text style={styles.actionText}>{t('tracking.editNutrition')}</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.muted}/>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('tracking.removeFood', { name: item.name })} disabled={saving} onPress={onRemove} style={styles.remove}>
            <Ionicons name="trash-outline" size={18} color={theme.danger}/>
            <Text style={styles.removeText}>{t('tracking.removeFood', { name: item.name })}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" disabled={!valid} onPress={onDone} style={[appStyles.button, !valid && styles.disabled]}><Text style={appStyles.buttonText}>{t('common.ok')}</Text></TouchableOpacity>
    </ScrollView>;
}

const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 };
const styles = StyleSheet.create({
    content: { paddingTop: 4, gap: 14 },
    hero: { alignItems: 'center', gap: 10, marginBottom: 4 },
    name: { fontFamily: 'Degular', fontSize: 30, lineHeight: 34, color: theme.ink, textAlign: 'center' },
    nutrition: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: AppRadii.card, backgroundColor: theme.surface, ...shadow },
    energy: { minWidth: 76 },
    calories: { fontFamily: 'Degular', fontSize: 38, lineHeight: 40, color: theme.ink },
    caloriesUnit: { fontFamily: 'CronosPro', fontSize: 14, color: theme.muted },
    macros: { flex: 1, flexDirection: 'row', gap: 6 },
    macro: { flex: 1, padding: 8, borderRadius: AppRadii.control, backgroundColor: theme.cream, gap: 2 },
    dot: { width: 18, height: 4, borderRadius: 2, marginBottom: 2 },
    macroValue: { fontFamily: 'Degular', fontSize: 18, color: theme.ink },
    macroLabel: { fontFamily: 'CronosPro', fontSize: 12, color: theme.muted },
    missing: { fontFamily: 'CronosProBold', fontSize: 15, color: theme.danger, textAlign: 'center' },
    card: { padding: 16, gap: 12, borderRadius: AppRadii.card, backgroundColor: theme.surface, ...shadow },
    label: { fontFamily: 'Degular', fontSize: 17, color: theme.ink, textAlign: 'center' },
    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    stepButton: { width: 52, height: 52, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellowSoft },
    gramsField: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
    gramsInput: { minWidth: 90, padding: 0, borderBottomWidth: 3, borderBottomColor: theme.yellow, fontFamily: 'Degular', fontSize: 44, color: theme.ink, textAlign: 'center' },
    gramsUnit: { fontFamily: 'CronosPro', fontSize: 20, color: theme.muted },
    action: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: AppRadii.pill, backgroundColor: theme.surface, ...shadow },
    actionIcon: { width: 34, height: 34, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow },
    actionText: { ...appStyles.textAction, flex: 1 },
    remove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
    removeText: { fontFamily: 'CronosProBold', fontSize: 15, color: theme.danger },
    disabled: { opacity: 0.45 },
});
