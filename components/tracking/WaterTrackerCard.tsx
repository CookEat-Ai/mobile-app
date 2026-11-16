import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { WATER_BOTTLE_ML, WATER_GLASS_ML } from '../../services/waterTracking';

const WATER = '#4FA8E8', WATER_SOFT = '#EAF5FD';
// Bottle drawn in a 40×90 box: cap, neck, shoulders, then a rounded body.
const BOTTLE_PATH = 'M15 10 H25 V17 C25 21 33 23 33 31 V82 C33 86 30 88 26 88 H14 C10 88 7 86 7 82 V31 C7 23 15 21 15 17 Z';
const BODY_TOP = 10, BODY_BOTTOM = 88;

function Bottle({ id, fill, width }: { id: string; fill: number; width: number }) {
    const level = BODY_BOTTOM - (BODY_BOTTOM - BODY_TOP) * fill;
    return <Svg width={width} height={width * 2.25} viewBox="0 0 40 90">
      <Defs><ClipPath id={id}><Path d={BOTTLE_PATH}/></ClipPath></Defs>
      <Path d={BOTTLE_PATH} fill={WATER_SOFT}/>
      {fill > 0 && <Rect x={0} y={level} width={40} height={BODY_BOTTOM - level} fill={WATER} clipPath={`url(#${id})`}/>}
      <Path d={BOTTLE_PATH} fill="none" stroke={fill > 0 ? WATER : theme.line} strokeWidth={2}/>
      <Rect x={13} y={2} width={14} height={8} rx={2.5} fill={fill >= 1 ? WATER : theme.line}/>
      <Path d="M11 36 V74" stroke={theme.onPrimary} strokeOpacity={.55} strokeWidth={2.5} strokeLinecap="round"/>
    </Svg>;
}

export function WaterTrackerCard({ consumedMl, goalMl, onChange, disabled }: { consumedMl: number; goalMl: number; onChange: (deltaMl: number) => void; disabled?: boolean }) {
    const { t, i18n } = useTranslation();
    const bottles = Math.max(1, Math.ceil(goalMl / WATER_BOTTLE_ML));
    const liters = (ml: number) => (ml / 1000).toLocaleString(i18n.language, { maximumFractionDigits: 2 });
    const reached = goalMl > 0 && consumedMl >= goalMl;
    const action = (label: string, icon: keyof typeof Ionicons.glyphMap, delta: number, primary = false) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} disabled={disabled || (delta < 0 && consumedMl <= 0)} onPress={() => onChange(delta)} style={[styles.action, primary && styles.primaryAction, (disabled || (delta < 0 && consumedMl <= 0)) && { opacity: .45 }]}>
      <Ionicons name={icon} size={20} color={primary ? theme.onPrimary : theme.ink}/>
      {delta > 0 && <Text style={[styles.actionText, primary && { color: theme.onPrimary }]}>{label}</Text>}
    </TouchableOpacity>;
    return <View style={[appStyles.card, { padding: 20, gap: 16 }]}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={appStyles.section}>{t('water.title')}</Text>
          <Text style={appStyles.subtitle}>{reached ? t('water.reached') : t('water.remaining', { liters: liters(Math.max(0, goalMl - consumedMl)) })}</Text>
        </View>
        <Text accessibilityLabel={t('water.progressLabel', { current: liters(consumedMl), goal: liters(goalMl) })} style={styles.amount}>{liters(consumedMl)}<Text style={styles.goal}> / {liters(goalMl)} L</Text></Text>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.bottles}>
        {Array.from({ length: bottles }, (_, i) => <Bottle key={i} id={`water-bottle-${i}`} width={36} fill={Math.min(1, Math.max(0, (consumedMl - i * WATER_BOTTLE_ML) / WATER_BOTTLE_ML))}/>)}
      </View>
      <Text style={[appStyles.subtitle, { fontSize: 13 }]}>{t('water.bottleHint', { count: bottles, ml: WATER_BOTTLE_ML })}</Text>
      <View style={styles.actions}>
        {action(t('water.remove'), 'remove', -WATER_GLASS_ML)}
        {action(t('water.addGlass', { ml: WATER_GLASS_ML }), 'water-outline', WATER_GLASS_ML)}
        {action(t('water.addBottle', { ml: WATER_BOTTLE_ML }), 'add', WATER_BOTTLE_ML, true)}
      </View>
    </View>;
}

const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, amount: { fontFamily: 'Degular', fontSize: 30, color: WATER }, goal: { fontFamily: 'CronosPro', fontSize: 15, color: theme.muted }, bottles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }, actions: { flexDirection: 'row', gap: 8 }, action: { minHeight: 48, minWidth: 48, paddingHorizontal: 12, borderRadius: AppRadii.control, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, primaryAction: { flex: 1, backgroundColor: WATER, borderColor: WATER }, actionText: { fontFamily: 'Degular', fontSize: 16, color: theme.ink } });
