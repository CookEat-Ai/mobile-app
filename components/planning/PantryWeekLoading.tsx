import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { useMotionAllowed } from '../../contexts/MotionPreferences';

/** Pending slots remain placeholders until the actual plan has been validated. */
export function PantryWeekLoading({ ingredients, days, ready, onComplete }: {
  ingredients: string[]; days: number[]; ready: boolean; onComplete?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const motion = useMotionAllowed();
  const sweep = useRef(new Animated.Value(0)).current;
  const completeRef = useRef(onComplete); completeRef.current = onComplete;
  useEffect(() => {
    if (ready) {
      const timer = setTimeout(() => completeRef.current?.(), motion ? 650 : 0);
      return () => clearTimeout(timer);
    }
  }, [ready, motion]);
  useEffect(() => {
    if (!motion || ready) { sweep.setValue(0); return; }
    const animation = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: false }));
    animation.start(); return () => animation.stop();
  }, [motion, ready, sweep]);
  return <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}><ScrollView contentContainerStyle={styles.content}>
    <Text style={appStyles.eyebrow}>{t('pantryScan.weekEyebrow')}</Text>
    <Text style={appStyles.title}>{t(ready ? 'pantryScan.weekReady' : 'pantryScan.weekTitle')}</Text>
    <Text style={appStyles.subtitle}>{t('pantryScan.weekSubtitle')}</Text>
    <View style={styles.ingredients}>{ingredients.map((name, index) => <View key={`${index}:${name}`} style={styles.chip}><Text style={styles.name}>{name}</Text></View>)}</View>
    <View style={styles.connector}><Ionicons name="arrow-down" size={30} color={theme.yellow} /></View>
    <View style={styles.board} accessible accessibilityRole="progressbar" accessibilityLabel={t(ready ? 'pantryScan.weekReady' : 'pantryScan.weekTitle')} accessibilityState={{ busy: !ready }}>
      <View style={styles.columns}>{Array.from({ length: 7 }, (_, day) => {
        const selected = days.includes(day);
        const label = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(new Date(2026, 0, 5 + day));
        return <View key={day} style={styles.day}><Text style={[styles.dayLabel, !selected && styles.muted]}>{label}</Text>{Array.from({ length: 4 }, (_, slot) => <View key={slot} style={[styles.slot, selected && styles.activeSlot, selected && ready && styles.readySlot]}>{selected && <Ionicons name={ready ? 'checkmark' : 'restaurant-outline'} size={18} color={ready ? theme.ink : theme.muted} />}</View>)}</View>;
      })}</View>
      {!ready && motion && <Animated.View style={[styles.scanLine, { top: sweep.interpolate({ inputRange: [0, 1], outputRange: ['15%', '98%'] }) }]} />}
    </View>
    <View style={styles.caption}><Ionicons name={ready ? 'checkmark-circle' : 'sparkles-outline'} size={22} color={theme.ink} /><Text style={styles.captionText}>{t(ready ? 'pantryScan.weekReady' : 'pantryScan.weekWorking')}</Text></View>
    <Text style={styles.help}>{t('pantryScan.weekHelp')}</Text>
  </ScrollView></View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background }, content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  ingredients: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: theme.yellowSoft }, name: { fontFamily: 'CronosProBold', fontSize: 15, color: theme.ink }, connector: { alignItems: 'center' },
  board: { padding: 12, borderRadius: 23, backgroundColor: theme.surface, overflow: 'hidden', borderWidth: 1, borderColor: theme.line }, columns: { flexDirection: 'row', gap: 5 }, day: { flex: 1, gap: 6 }, dayLabel: { fontFamily: 'CronosProBold', fontSize: 11, color: theme.ink, textAlign: 'center', marginBottom: 6 }, muted: { color: theme.muted }, slot: { aspectRatio: 0.85, borderRadius: 8, backgroundColor: theme.soft, alignItems: 'center', justifyContent: 'center', opacity: 0.45 }, activeSlot: { opacity: 1, backgroundColor: theme.yellowSoft }, readySlot: { backgroundColor: theme.yellow },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: theme.yellow, shadowColor: theme.yellow, shadowRadius: 12, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 } }, caption: { flexDirection: 'row', gap: 10, alignItems: 'center' }, captionText: { fontFamily: 'Degular', fontSize: 22, color: theme.ink, flex: 1 }, help: { fontFamily: 'CronosPro', fontSize: 16, lineHeight: 22, color: theme.muted },
});
