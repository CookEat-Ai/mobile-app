import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { getRecipeImageSource } from '../../constants/RecipeImages';
import type { MealPlan, MealPlanMeal } from '../../services/api';
import { planDays, isPastPlanDay } from '../../services/planningDisplay';
import { compatiblePlanningTypes, locationKey, movePlanningMeal, ORGANIZE_MEAL_TYPES, type MealLocation } from '../../services/planningOrganization';
import { feedback } from '../../services/haptics';

const labels = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' } as const;
type Drag = { slotId: string; x: number; y: number };

function DragHandle({ disabled, label, onStart, onMove, onEnd, onCancel, onTap }: {
  disabled: boolean; label: string; onStart: (x: number, y: number) => void;
  onMove: (x: number, y: number) => void; onEnd: () => void; onCancel: () => void; onTap: () => void;
}) {
  const current = useRef({ disabled, onStart, onMove, onEnd, onCancel, onTap });
  current.current = { disabled, onStart, onMove, onEnd, onCancel, onTap };
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const point = useRef({ x: 0, y: 0 });
  const start = () => { if (active.current) return; active.current = true; current.current.onStart(point.current.x, point.current.y); };
  const clear = () => { if (hold.current) clearTimeout(hold.current); hold.current = null; };
  useEffect(() => clear, []);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !current.current.disabled,
    onPanResponderGrant: event => {
      active.current = false; point.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
      clear(); hold.current = setTimeout(start, 250);
    },
    onPanResponderMove: (event, gesture) => {
      point.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
      if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8) { clear(); start(); }
      if (active.current) current.current.onMove(point.current.x, point.current.y);
    },
    onPanResponderRelease: () => { clear(); if (active.current) current.current.onEnd(); else current.current.onTap(); active.current = false; },
    onPanResponderTerminate: () => { clear(); current.current.onCancel(); active.current = false; },
    onPanResponderTerminationRequest: () => !active.current,
  }), []);
  return <View {...responder.panHandlers} style={styles.handle} accessible accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled }} accessibilityActions={[{ name: 'activate', label }]}
    onAccessibilityAction={() => { if (!disabled) current.current.onTap(); }}>
    <Ionicons name="reorder-three-outline" size={26} color={disabled ? theme.muted : theme.ink} />
  </View>;
}

/** All drop zones are measured in the same scrolling coordinate space. */
export function PlanningOrganizer({ plan, meals, disabled, onChange }: {
  plan: MealPlan; meals: MealPlanMeal[]; disabled: boolean; onChange: (meals: MealPlanMeal[], swapped: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [choosing, setChoosing] = useState<string | null>(null);
  const root = useRef<View>(null);
  const viewport = useRef<View>(null);
  const scroll = useRef<ScrollView>(null);
  const bounds = useRef({ x: 0, y: 0, width: 0, height: 0, rootX: 0, rootY: 0 });
  const offset = useRef(0);
  const contentHeight = useRef(0);
  const zones = useRef<Record<string, { y: number; height: number; location: MealLocation }>>({});
  const dragRef = useRef<Drag | null>(null);
  const targetRef = useRef<string | null>(null);
  const frame = useRef<number | null>(null);
  const latest = useRef({ meals, disabled, onChange });
  latest.current = { meals, disabled, onChange };
  const days = planDays(plan.weekStart);
  const types = ORGANIZE_MEAL_TYPES;
  const locale = i18n.resolvedLanguage || 'fr';
  const dayLabel = (index: number) => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' }).format(days[index].date);
  const mealLabel = (type: MealLocation['mealType']) => t(`search.categories.${labels[type]}`);
  const measure = () => {
    root.current?.measureInWindow((x, y) => { bounds.current.rootX = x; bounds.current.rootY = y; });
    viewport.current?.measureInWindow((x, y, width, height) => { Object.assign(bounds.current, { x, y, width, height }); });
  };
  const pickTarget = (point: Drag) => {
    const b = bounds.current;
    const y = point.y - b.y + offset.current;
    const zone = point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height
      ? Object.entries(zones.current).find(([, zone]) => y >= zone.y && y <= zone.y + zone.height) : undefined;
    const source = latest.current.meals.find(meal => meal.slotId === point.slotId);
    const next = zone && source && !isPastPlanDay(plan.weekStart, zone[1].location.dayIndex) && compatiblePlanningTypes(source.mealType, zone[1].location.mealType) ? zone[0] : null;
    if (next !== targetRef.current) { targetRef.current = next; setTarget(next); if (next) void feedback.selection(); }
  };
  const cancel = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null; dragRef.current = null; targetRef.current = null; setDrag(null); setTarget(null);
  };
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const move = (slotId: string, location: MealLocation) => {
    if (latest.current.disabled) return;
    const before = latest.current.meals;
    const after = movePlanningMeal(before, slotId, location, plan.weekStart);
    if (after === before) return;
    latest.current.onChange(after, before.some(meal => meal.dayIndex === location.dayIndex && meal.mealType === location.mealType));
    void feedback.confirm();
  };
  const tick = () => {
    const point = dragRef.current;
    if (!point) return;
    const b = bounds.current;
    const relative = point.y - b.y;
    const speed = relative < 64 ? -Math.min(12, (64 - relative) / 4) : relative > b.height - 64 ? Math.min(12, (relative - b.height + 64) / 4) : 0;
    if (speed && point.x >= b.x && point.x <= b.x + b.width) {
      const next = Math.max(0, Math.min(contentHeight.current - b.height, offset.current + speed));
      offset.current = next; scroll.current?.scrollTo({ y: next, animated: false });
    }
    pickTarget(point); frame.current = requestAnimationFrame(tick);
  };
  const start = (slotId: string, x: number, y: number) => {
    measure(); const point = { slotId, x, y }; dragRef.current = point; setDrag(point); void feedback.light();
    frame.current = requestAnimationFrame(tick);
  };
  const end = () => {
    const point = dragRef.current;
    if (point) pickTarget(point);
    const zone = targetRef.current ? zones.current[targetRef.current] : null;
    if (point && zone) move(point.slotId, zone.location);
    cancel();
  };
  const finishRef = useRef(end);
  finishRef.current = end;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') cancel(); });
    if (Platform.OS !== 'web') return () => subscription.remove();
    // Browser mouse releases outside the handle must still complete the drop.
    const finish = () => { if (dragRef.current) finishRef.current(); };
    document.addEventListener('mouseup', finish);
    document.addEventListener('pointerup', finish);
    window.addEventListener('blur', cancel);
    return () => {
      subscription.remove(); document.removeEventListener('mouseup', finish);
      document.removeEventListener('pointerup', finish); window.removeEventListener('blur', cancel);
    };
  }, []);
  useEffect(() => { if (disabled) cancel(); }, [disabled]);
  const movingMeal = meals.find(meal => meal.slotId === drag?.slotId);
  const remove = (meal: MealPlanMeal) => {
    if (disabled || drag || isPastPlanDay(plan.weekStart, meal.dayIndex ?? 0)) return;
    Alert.alert(t('planning.delete.title'), t('planning.delete.description', { title: meal.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => {
        const current = latest.current;
        if (current.disabled || current.meals.length <= 1) return;
        current.onChange(current.meals.filter(item => item.slotId !== meal.slotId), false);
      } },
    ]);
  };
  const chosenMeal = meals.find(meal => meal.slotId === choosing);
  const destinationTypes = (dayIndex: number) => types.filter(mealType => {
    const occupant = meals.find(meal => meal.dayIndex === dayIndex && meal.mealType === mealType);
    return !isPastPlanDay(plan.weekStart, dayIndex) && !!chosenMeal && compatiblePlanningTypes(chosenMeal.mealType, mealType)
      && occupant?.slotId !== choosing && occupant?.status !== 'generating';
  });
  return <View ref={root} style={styles.fill} onLayout={measure}>
    <View ref={viewport} style={styles.fill} onLayout={measure}>
      <ScrollView ref={scroll} scrollEnabled={!drag} showsVerticalScrollIndicator={false} scrollEventThrottle={16}
        onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; }} onContentSizeChange={(_, height) => { contentHeight.current = height; }}
        contentContainerStyle={styles.content}>
        {days.map(day => <React.Fragment key={day.key}>
          <View style={styles.dayHeading}><Text style={appStyles.section}>{dayLabel(day.dayIndex)}</Text>
            <Text style={appStyles.subtitle}>{Math.round(meals.filter(meal => meal.dayIndex === day.dayIndex).reduce((total, meal) => total + (meal.calories || 0), 0))} kcal</Text></View>
          {types.map(mealType => {
            const location = { dayIndex: day.dayIndex, mealType };
            const key = locationKey(location);
            const meal = meals.find(meal => meal.dayIndex === day.dayIndex && meal.mealType === mealType);
            const busy = disabled || isPastPlanDay(plan.weekStart, day.dayIndex) || meal?.status === 'generating';
            const incompatible = !!movingMeal && (!compatiblePlanningTypes(movingMeal.mealType, mealType) || meal?.status === 'generating');
            return <View key={key} onLayout={event => { zones.current[key] = { ...event.nativeEvent.layout, location }; }}
              style={[styles.slot, incompatible && styles.incompatible, target === key && styles.target, drag?.slotId === meal?.slotId && !!drag && styles.source]}>
              {meal?.image ? <Image source={getRecipeImageSource(meal.image)} style={styles.image} contentFit="cover" /> : <View style={[styles.image, styles.emptyImage]}><Ionicons name="restaurant-outline" size={22} color={theme.muted} /></View>}
              <Pressable style={styles.copy} disabled={!meal || busy || !!drag} accessibilityRole="button"
                accessibilityLabel={meal ? `${meal.title}. ${t('planningOrganize.moveTo')}` : `${dayLabel(day.dayIndex)}, ${mealLabel(mealType)}`}
                onLongPress={() => { if (meal) remove(meal); }} onPress={() => setChoosing(meal!.slotId)}>
                <Text style={styles.label}>{mealLabel(mealType)}</Text>
                <Text style={styles.recipe}>{meal?.title || t('planningOrganize.empty')}</Text>
                {meal && <Text style={styles.meta}>{Math.round(meal.calories || 0)} kcal · {t('planningOrganize.portions', { count: meal.servings })}</Text>}
              </Pressable>
              {meal && meals.length > 1 && <Pressable disabled={!!busy || !!drag} accessibilityRole="button" accessibilityLabel={`${t('common.delete')}: ${meal.title}`} style={styles.handle} onPress={() => remove(meal)}><Ionicons name="trash-outline" size={21} color={theme.muted} /></Pressable>}
              {meal && <DragHandle disabled={!!busy} label={`${t('planningOrganize.moveTo')}: ${meal.title}`} onStart={(x, y) => start(meal.slotId, x, y)}
                onMove={(x, y) => { const point = { slotId: meal.slotId, x, y }; dragRef.current = point; setDrag(point); pickTarget(point); }}
                onEnd={end} onCancel={cancel} onTap={() => setChoosing(meal.slotId)} />}
            </View>;
          })}
        </React.Fragment>)}
      </ScrollView>
    </View>
    {movingMeal && drag && <View pointerEvents="none" style={[styles.ghost, { top: drag.y - bounds.current.rootY - 36, left: 12, right: 12 }]}>
      <Ionicons name="swap-vertical-outline" size={22} color={theme.ink} /><Text style={styles.recipe}>{movingMeal.title}</Text>
    </View>}
    <Modal visible={!!choosing} transparent animationType="fade" onRequestClose={() => setChoosing(null)}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHeader}><Text style={appStyles.section}>{t('planningOrganize.moveTo')}</Text>
            <Pressable style={appStyles.iconButton} accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => setChoosing(null)}><Ionicons name="close" size={24} color={theme.ink} /></Pressable></View>
          <ScrollView showsVerticalScrollIndicator={false}>{days.filter(day => destinationTypes(day.dayIndex).length > 0).map(day => <View key={day.key}><Text style={[appStyles.section, styles.destinationDay]}>{dayLabel(day.dayIndex)}</Text>
            {destinationTypes(day.dayIndex).map(mealType => {
              const meal = meals.find(meal => meal.dayIndex === day.dayIndex && meal.mealType === mealType);
              const source = meals.find(entry => entry.slotId === choosing);
              if (!source || !compatiblePlanningTypes(source.mealType, mealType) || meal?.slotId === choosing || meal?.status === 'generating') return null;
              const unavailable = disabled;
              return <Pressable key={mealType} disabled={unavailable} style={[styles.destination, unavailable && styles.source]} accessibilityRole="button"
                accessibilityState={{ disabled: unavailable }} onPress={() => { if (choosing) move(choosing, { dayIndex: day.dayIndex, mealType }); setChoosing(null); }}>
                {meal?.image ? <Image source={getRecipeImageSource(meal.image)} style={styles.destinationImage} contentFit="cover" /> : <View style={[styles.destinationImage, styles.emptyImage]}><Ionicons name="restaurant-outline" size={20} color={theme.muted} /></View>}
                <View style={styles.copy}><Text numberOfLines={2} style={styles.destinationTitle}>{meal?.title || t('planningOrganize.empty')}</Text><Text style={styles.destinationType}>{mealLabel(mealType)}</Text></View>
                <Ionicons name={meal ? 'swap-horizontal-outline' : 'arrow-forward'} size={22} color={theme.ink} />
              </Pressable>;
            })}
          </View>)}</ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 }, content: { paddingHorizontal: 20, paddingBottom: 24 },
  dayHeading: { paddingTop: 24, paddingBottom: 12, gap: 3 },
  slot: { flexDirection: 'row', alignItems: 'center', minHeight: 94, padding: 10, marginBottom: 8, gap: 12, borderRadius: 18, borderWidth: 2, borderColor: theme.line, backgroundColor: theme.surface },
  incompatible: { opacity: 0.25, backgroundColor: theme.soft },
  target: { borderColor: theme.yellow, backgroundColor: theme.yellowSoft }, source: { opacity: 0.45 },
  image: { width: 54, height: 62, borderRadius: 12 }, emptyImage: { backgroundColor: theme.soft, justifyContent: 'center', alignItems: 'center' },
  copy: { flex: 1, gap: 3 }, label: { fontFamily: 'CronosProBold', fontSize: 13, color: theme.muted },
  recipe: { fontFamily: 'CronosProBold', fontSize: 17, color: theme.ink, flexShrink: 1 }, meta: { fontFamily: 'CronosPro', fontSize: 13, color: theme.muted },
  handle: { width: 44, minHeight: 62, alignItems: 'center', justifyContent: 'center' },
  ghost: { position: 'absolute', backgroundColor: theme.yellowSoft, borderWidth: 2, borderColor: theme.yellow, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 8, shadowColor: theme.ink, shadowOpacity: 0.15, shadowRadius: 8 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,26,16,0.35)' },
  sheet: { maxHeight: '85%', backgroundColor: theme.background, borderTopLeftRadius: theme.radius, borderTopRightRadius: theme.radius, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  destinationImage: { width: 48, height: 48, borderRadius: 12 },
  destinationTitle: { fontFamily: 'CronosProBold', fontSize: 16, color: theme.ink },
  destinationType: { fontFamily: 'CronosPro', fontSize: 12, color: theme.muted },
  destinationDay: { marginTop: 20, marginBottom: 8 }, destination: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: theme.line },
});
