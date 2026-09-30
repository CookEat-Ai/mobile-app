import { feedback } from '../services/haptics';
import { EntranceView } from './motion/Entrance';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../constants/AppTheme';
import { weightChartPath, weightHistoryChart, type WeightChartPeriod } from '../services/weightChart';
import { weightDateKey, type WeightLog } from '../services/weightTracking';

const PERIODS: WeightChartPeriod[] = ['week', 'month', 'quarter', 'all'];
const PLOT_WIDTH = 300;
const PLOT_HEIGHT = 168;
// Keep reference rings and touch targets away from the viewport edges.
const plotPoint = (point: { x: number; y: number }) => ({
  x: 12 + (point.x - 44) / 282 * 276,
  y: 16 + (point.y - 24) / 110 * 128,
});

export function WeightProgressCard({ logs, initialWeight, initialDate, targetWeight, onLogWeight }: {
  logs: WeightLog[]; initialWeight: number; initialDate?: string; targetWeight?: number; onLogWeight: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState<WeightChartPeriod>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [plotHeight, setPlotHeight] = useState(0);
  const today = weightDateKey();
  const chart = useMemo(() => weightHistoryChart(logs, period, today, { initialWeight, initialDate, targetWeight }), [logs, period, today, initialWeight, initialDate, targetWeight]);
  const selectedIndex = Math.max(0, selectedDate && chart.points.some(point => point.date === selectedDate)
    ? chart.points.findIndex(point => point.date === selectedDate) : chart.points.length - 1);
  const selected = chart.points[selectedIndex];
  const displayWeight = (value: number) => value.toLocaleString(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  const shortDateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
  const dateTicks = (chart.startDate === chart.endDate ? [0] : [0, 0.5, 1]).map(fraction =>
    new Date(Date.parse(`${chart.startDate}T12:00:00Z`) + fraction * (Date.parse(`${chart.endDate}T12:00:00Z`) - Date.parse(`${chart.startDate}T12:00:00Z`))).toISOString().slice(0, 10));
  const selectAdjacent = (offset: number) => {
    const next = chart.points[selectedIndex + offset];
    if (next) { feedback.selection(); setSelectedDate(next.date); }
  };

  return <EntranceView entranceIndex={0} style={styles.card}>
    <Text style={appStyles.section}>{t('weightTracking.history')}</Text>
    <View style={styles.periods}>
      {PERIODS.map(option => <TouchableOpacity key={option} accessibilityRole="button"
        accessibilityLabel={t('weightTracking.periodLabel', { period: t(`weightTracking.periods.${option}`) })}
        accessibilityState={{ selected: period === option }}
        style={[styles.period, period === option && styles.periodSelected]}
        onPress={() => { if (period !== option) feedback.selection(); setPeriod(option); setSelectedDate(null); }}>
        <Text style={[styles.periodText, period === option && styles.periodTextSelected]}>{t(`weightTracking.periods.${option}`)}</Text>
      </TouchableOpacity>)}
    </View>
    <View accessible accessibilityRole={selected ? 'adjustable' : 'image'}
      accessibilityLabel={t(targetWeight === undefined ? 'weightTracking.graphInitialDescription' : 'weightTracking.graphGoalDescription', {
        initial: displayWeight(initialWeight), target: targetWeight === undefined ? '' : displayWeight(targetWeight),
      })}
      accessibilityValue={selected ? { min: 0, max: chart.points.length - 1, now: selectedIndex, text: `${dateLabel(selected.date)}, ${displayWeight(selected.weight)} kg` } : undefined}
      accessibilityActions={selected ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
      onAccessibilityAction={event => selectAdjacent(event.nativeEvent.actionName === 'increment' ? 1 : -1)}>
      <View style={styles.references}>
        <View style={styles.reference}>
          <View style={styles.referenceHeading}><View style={[styles.referenceDot, { backgroundColor: theme.ink }]} /><Text style={[styles.label, styles.referenceLabel]}>{t('weightTracking.initialWeight')}</Text></View>
          <Text style={styles.referenceWeight}>{displayWeight(initialWeight)} <Text style={styles.referenceUnit}>kg</Text></Text>
        </View>
        {targetWeight !== undefined && <View style={[styles.reference, styles.targetReference]}>
          <View style={styles.referenceHeading}><View style={[styles.referenceDot, { backgroundColor: theme.yellow }]} /><Text style={[styles.label, styles.referenceLabel]}>{t('goal.target')}</Text></View>
          <Text style={[styles.referenceWeight, styles.targetWeight]}>{displayWeight(targetWeight)} <Text style={[styles.referenceUnit, styles.targetUnit]}>kg</Text></Text>
        </View>}
      </View>
      <View style={styles.plotRow}>
        <View style={styles.yAxis} pointerEvents="none">
          <Text style={styles.axisUnit}>kg</Text>
          {chart.ticks.map(tick => <Text key={tick.y} maxFontSizeMultiplier={1.3}
            style={[styles.axisLabel, styles.yTick, { top: plotPoint({ x: 44, y: tick.y }).y / PLOT_HEIGHT * plotHeight - 8 }]}>{displayWeight(tick.weight)}</Text>)}
        </View>
        <View style={styles.plotColumn}>
          <View style={styles.plot} onLayout={event => setPlotHeight(event.nativeEvent.layout.height)}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}>
              {chart.ticks.map(tick => {
                const y = plotPoint({ x: 44, y: tick.y }).y;
                return <Path key={tick.y} d={`M 12 ${y} L 288 ${y}`} stroke={theme.line} strokeWidth="1" />;
              })}
              <Path d="M 12 8 L 12 154 L 288 154" stroke={theme.line} strokeWidth="1" fill="none" />
              {chart.initialPoint && <Circle cx={plotPoint(chart.initialPoint).x} cy={plotPoint(chart.initialPoint).y}
                r={5} fill={theme.surface} stroke={theme.ink} strokeWidth={2} />}
              {chart.targetPoint && <Circle cx={plotPoint(chart.targetPoint).x} cy={plotPoint(chart.targetPoint).y}
                r={6} fill={theme.surface} stroke={theme.yellow} strokeWidth={2.5} />}
              {chart.points.length > 1 && <Path d={weightChartPath(chart.points.map(plotPoint))} stroke={theme.yellow}
                strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" />}
              {chart.points.map(point => {
                const position = plotPoint(point);
                return <React.Fragment key={point.date}>
                  <Circle cx={position.x} cy={position.y} r={point.date === selected?.date ? 6 : 3.5} fill={theme.yellow} stroke={theme.surface} strokeWidth={2} />
                  <Circle cx={position.x} cy={position.y} r={12} fill="transparent" onPress={() => { if (selected?.date !== point.date) feedback.selection(); setSelectedDate(point.date); }} />
                </React.Fragment>;
              })}
            </Svg>
          </View>
          <View style={styles.dateTicks}>
            {dateTicks.map((date, index) => <Text key={`${date}-${index}`} maxFontSizeMultiplier={1.3}
              style={[styles.axisLabel, styles.dateTick, dateTicks.length === 1 ? styles.middleDate : index === 0 ? styles.startDate : index === dateTicks.length - 1 ? styles.endDate : styles.middleDate]}>{shortDateLabel(date)}</Text>)}
          </View>
          <Text style={styles.dateAxis}>{t('weightTracking.dateAxis')}</Text>
        </View>
      </View>
    </View>
    {selected && <>
      <View style={styles.reading}>
        <TouchableOpacity style={appStyles.iconButton} accessibilityRole="button" accessibilityLabel={t('weightTracking.previousMeasurement')}
          disabled={selectedIndex === 0} onPress={() => selectAdjacent(-1)} accessibilityState={{ disabled: selectedIndex === 0 }}>
          <Ionicons name="chevron-back" size={24} color={selectedIndex === 0 ? theme.line : theme.ink} />
        </TouchableOpacity>
        <View style={styles.readingCopy} accessibilityLiveRegion="polite">
          <Text style={styles.label}>{dateLabel(selected.date)}</Text>
          <Text style={styles.readingValue}>{displayWeight(selected.weight)} kg</Text>
        </View>
        <TouchableOpacity style={appStyles.iconButton} accessibilityRole="button" accessibilityLabel={t('weightTracking.nextMeasurement')}
          disabled={selectedIndex === chart.points.length - 1} onPress={() => selectAdjacent(1)} accessibilityState={{ disabled: selectedIndex === chart.points.length - 1 }}>
          <Ionicons name="chevron-forward" size={24} color={selectedIndex === chart.points.length - 1 ? theme.line : theme.ink} />
        </TouchableOpacity>
      </View>
    </>}
    <TouchableOpacity accessibilityRole="button" style={styles.logButton} onPress={() => { feedback.light(); onLogWeight(); }}>
      <Ionicons name="add" size={20} color={appStyles.buttonText.color} />
      <Text style={styles.logButtonText}>{t('goal.logWeight')}</Text>
    </TouchableOpacity>
    <Text style={styles.note}>{t('weightTracking.weighHint')}</Text>
  </EntranceView>;
}

const styles = StyleSheet.create({
  card: { ...appStyles.card, marginBottom: 16 },
  label: { fontFamily: 'CronosPro', fontSize: 14, lineHeight: 19, color: theme.muted },
  periods: { flexDirection: 'row', gap: 6, paddingVertical: 16 },
  period: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 6, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 17, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
  periodSelected: { backgroundColor: theme.yellow, borderColor: theme.yellow },
  periodText: { fontFamily: 'Degular', fontSize: 15, color: theme.muted, textAlign: 'center' },
  periodTextSelected: { color: appStyles.buttonText.color },
  references: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginTop: 4, marginBottom: 24 },
  reference: { flex: 1, minWidth: 0 },
  targetReference: { alignItems: 'flex-end' },
  referenceHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  referenceLabel: { flexShrink: 1 },
  referenceDot: { width: 6, height: 6, borderRadius: 3 },
  referenceWeight: { fontFamily: 'Degular', fontSize: 27, lineHeight: 32, color: theme.ink, marginTop: 4, maxWidth: '100%' },
  targetWeight: { textAlign: 'right', color: theme.yellow },
  targetUnit: { color: theme.yellow },
  referenceUnit: { fontFamily: 'CronosPro', fontSize: 16, color: theme.muted },
  plotRow: { flexDirection: 'row' },
  yAxis: { width: 46, position: 'relative' },
  axisUnit: { fontFamily: 'CronosPro', fontSize: 12, color: theme.muted, position: 'absolute', top: -16, right: 8 },
  axisLabel: { fontFamily: 'CronosPro', fontSize: 12, lineHeight: 16, color: theme.muted },
  yTick: { position: 'absolute', right: 8 },
  plotColumn: { flex: 1, minWidth: 0 },
  plot: { width: '100%', aspectRatio: PLOT_WIDTH / PLOT_HEIGHT },
  dateTicks: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, paddingHorizontal: '4%', marginTop: 2 },
  dateTick: { flex: 1 },
  startDate: { textAlign: 'left' },
  middleDate: { textAlign: 'center' },
  endDate: { textAlign: 'right' },
  dateAxis: { fontFamily: 'CronosPro', fontSize: 12, lineHeight: 16, color: theme.muted, textAlign: 'right', paddingRight: '4%', marginTop: 6 },
  reading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  readingCopy: { flex: 1, alignItems: 'center' },
  readingValue: { fontFamily: 'Degular', fontSize: 27, color: theme.ink },
  logButton: { ...appStyles.button, marginTop: 18 },
  logButtonText: { ...appStyles.buttonText, flexShrink: 1, textAlign: 'center' },
  note: { marginTop: 12, fontFamily: 'CronosPro', fontSize: 15, lineHeight: 21, color: theme.muted },
});
