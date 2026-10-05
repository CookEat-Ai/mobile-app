import { PantryIngredientsSection } from './PantryIngredientsSection';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { useMotionAllowed } from '../../contexts/MotionPreferences';
import { normalizePantryIngredients, pantryIngredientKey } from '../../services/planningPantry';
import { feedback } from '../../services/haptics';
import { PlanningPantryCategoryModal } from './PlanningPantryCategoryModal';

/** The grid is a scanning effect, never a claim about detected food locations. */
type PantryScanProps = {
  photoUris: string[]; ingredients: string[] | null; saving: boolean;
  onConfirm: (names: string[]) => void; onRetake: () => void;
};

export function PantryScanView(props: PantryScanProps) {
  // The camera is a native modal: measure its own safe area rather than
  // inheriting the screen inset already occupied by the modal's top offset.
  return <SafeAreaProvider><PantryScanContent {...props} /></SafeAreaProvider>;
}

function PantryScanContent({ photoUris, ingredients, saving, onConfirm, onRetake }: PantryScanProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const motion = useMotionAllowed();
  const sweep = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(0);
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [addCategory, setAddCategory] = useState<string | undefined>();
  const [addVisible, setAddVisible] = useState(false);
  const names = normalizePantryIngredients(ingredients || []);
  const key = names.join('\n');
  const done = ingredients !== null;
  const photoUri = photoUris[0];
  const stackDepth = photoUris.length > 1 ? 24 : 0;
  useEffect(() => {
    if (!motion || done) { sweep.stopAnimation(); sweep.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(sweep, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [done, motion, sweep]);
  useEffect(() => {
    setRemoved([]);
    setAdded([]);
    setAddVisible(false);
    setVisible(motion ? 0 : names.length);
    if (!done || !motion || !names.length) return;
    let count = 0;
    const timer = setInterval(() => {
      count += 1; setVisible(count); void feedback.selection();
      if (count >= names.length) clearInterval(timer);
    }, Math.min(180, 1800 / names.length));
    return () => clearInterval(timer);
  }, [done, key, motion]);
  const allNames = normalizePantryIngredients([...names, ...added]);
  const displayedNames = normalizePantryIngredients([...names.slice(0, visible), ...added]);
  const selected = allNames.filter(name => !removed.includes(name));
  return <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
    <Stack.Screen options={{ statusBarStyle: 'dark', gestureEnabled: !saving }} />
    <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={[styles.content, done && styles.resultContent]}>
      {!!photoUris.length && <View style={[styles.photoStack, done && styles.resultPhoto]} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {photoUris.slice(1).map((uri, index) => ({ uri, index, offset: stackDepth * (index + 1) / (photoUris.length - 1) })).reverse().map(({ uri, offset, index }) => (
          <View key={`${uri}-${offset}`} style={[styles.stackedPhoto, { left: offset, top: stackDepth - offset, right: stackDepth - offset, bottom: offset, transform: [{ rotate: `${(index + 1) * 5}deg` }] }]}>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
        ))}
        <View style={[styles.photo, { top: stackDepth, right: stackDepth }]}>
        {photoUri ? <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="scan-outline" size={100} color={theme.yellow} />}
        <View style={styles.grid}>{Array.from({ length: 64 }, (_, index) => <View key={index} style={[styles.cell, done && index < visible && styles.foundCell]} />)}</View>
        {!done && <Animated.View style={[styles.scanLine, { top: sweep.interpolate({ inputRange: [0, 1], outputRange: ['2%', '96%'] }) }]} />}
        {!done && <View style={styles.photoBadge}><Ionicons name="scan" size={20} color={theme.ink} /><Text style={styles.badgeText}>{t('pantryScan.scanning')}</Text></View>}
        <View style={[styles.corner, styles.topLeft]} /><View style={[styles.corner, styles.topRight]} /><View style={[styles.corner, styles.bottomLeft]} /><View style={[styles.corner, styles.bottomRight]} />
      </View>
      </View>}
      {done && <PantryIngredientsSection onAdd={() => { setAddCategory(undefined); setAddVisible(true); }} ingredients={displayedNames} onAddCategory={id => { setAddCategory(id); setAddVisible(true); }} removed={removed} disabled={saving} onToggle={name => { void feedback.selection(); setRemoved(items => items.includes(name) ? items.filter(item => item !== name) : [...items, name]); }} />}
      {done && !!photoUris.length && !allNames.length && <Text style={appStyles.subtitle}>{t('pantryScan.empty')}</Text>}
    </ScrollView>
    <PlanningPantryCategoryModal visible={addVisible} initialCategoryId={addCategory} ingredients={selected} onClose={() => setAddVisible(false)} onChange={next => {
      const nextKeys = new Set(next.map(pantryIngredientKey));
      const recognizedKeys = new Set(names.map(pantryIngredientKey));
      setAdded(next.filter(name => !recognizedKeys.has(pantryIngredientKey(name))));
      setRemoved(names.filter(name => !nextKeys.has(pantryIngredientKey(name))));
    }} />
    {done && <View style={styles.footer}><Pressable accessibilityRole="button" accessibilityState={{ disabled: saving || visible < names.length }} disabled={saving || visible < names.length} style={[appStyles.button, (saving || visible < names.length) && styles.disabled]} onPress={() => onConfirm(selected)}><Text style={appStyles.buttonText}>{t(saving ? 'pantryScan.saving' : 'planningOrganize.done')}</Text><Ionicons name="arrow-forward" size={22} color="white" /></Pressable><Pressable accessibilityRole="button" disabled={saving} style={styles.retake} onPress={onRetake}><Text style={styles.chipText}>{t('pantryScan.retake')}</Text></Pressable></View>}
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background }, content: { paddingHorizontal: 12, paddingVertical: 12, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  resultContent: { paddingTop: 12 }, resultPhoto: { marginTop: 0 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.yellow },
  photoStack: { width: '100%', aspectRatio: 0.78, marginVertical: 8 },
  stackedPhoto: { position: 'absolute', borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: theme.background, backgroundColor: theme.soft },
  photo: { position: 'absolute', left: 0, bottom: 0, borderRadius: 24, overflow: 'hidden', backgroundColor: theme.soft, alignItems: 'center', justifyContent: 'center' },
  grid: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', flexWrap: 'wrap' }, cell: { width: '12.5%', height: '12.5%', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.35)' }, foundCell: { backgroundColor: 'rgba(254,181,10,0.25)' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: theme.yellow, shadowColor: theme.yellow, shadowRadius: 16, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 } },
  photoBadge: { position: 'absolute', bottom: 18, backgroundColor: theme.yellowSoft, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }, badgeText: { fontFamily: 'CronosProBold', fontSize: 14, color: theme.ink },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: theme.yellow }, topLeft: { left: 12, top: 12, borderLeftWidth: 3, borderTopWidth: 3 }, topRight: { right: 12, top: 12, borderRightWidth: 3, borderTopWidth: 3 }, bottomLeft: { left: 12, bottom: 12, borderLeftWidth: 3, borderBottomWidth: 3 }, bottomRight: { right: 12, bottom: 12, borderRightWidth: 3, borderBottomWidth: 3 },
  ingredientsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, addButton: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: theme.yellowSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 44, padding: 12, borderRadius: 14, backgroundColor: theme.yellowSoft, maxWidth: '100%' }, chipText: { fontFamily: 'CronosProBold', fontSize: 16, color: theme.ink, flexShrink: 1 }, removed: { backgroundColor: theme.soft, opacity: 0.5 },
  preview: { flexDirection: 'row', gap: 6 }, day: { flex: 1, gap: 5 }, dayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.yellow, alignSelf: 'center', marginBottom: 3 }, slot: { height: 22, borderRadius: 5, backgroundColor: theme.yellowSoft, borderWidth: 1, borderColor: theme.line },
  help: { fontFamily: 'CronosPro', fontSize: 15, lineHeight: 21, color: theme.muted }, footer: { paddingHorizontal: 12, paddingTop: 12, width: '100%', maxWidth: 560, alignSelf: 'center' }, retake: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.45 },
});
