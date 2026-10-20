import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { AppTheme } from '../../constants/AppTheme';

export function AppSlider({ minimum, maximum, step, value, onChange, label, valueText }: {
  minimum: number; maximum: number; step: number; value: number;
  onChange: (value: number) => void; label: string; valueText: string;
}) {
  const [width, setWidth] = useState(1);
  const track = useRef<View>(null), geometry = useRef({ x: 0, width: 1 });
  const current = useRef({ minimum, maximum, step, value, onChange });
  current.current = { minimum, maximum, step, value, onChange };
  const select = (raw: number) => {
    const c = current.current;
    c.onChange(Math.min(c.maximum, Math.max(c.minimum, c.minimum + Math.round((raw - c.minimum) / c.step) * c.step)));
  };
  const fromPoint = (x: number) => {
    const c = current.current, ratio = Math.max(0, Math.min(1, (x - geometry.current.x - 14) / Math.max(1, geometry.current.width - 28)));
    select(c.minimum + ratio * (c.maximum - c.minimum));
  };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => { const x = event.nativeEvent.pageX; track.current?.measureInWindow((left, _top, width) => { geometry.current = { x: left, width }; fromPoint(x); }); },
    onPanResponderMove: event => fromPoint(event.nativeEvent.pageX),
    onPanResponderTerminationRequest: () => false,
  // The gesture reads current values through the ref, without losing a drag on re-render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  const ratio = Math.max(0, Math.min(1, (value - minimum) / Math.max(1, maximum - minimum)));
  return <View ref={track} {...responder.panHandlers} style={styles.touch}
    onLayout={() => track.current?.measureInWindow((x, _top, width) => { geometry.current = { x, width }; setWidth(width); })}
    accessible accessibilityRole="adjustable" accessibilityLabel={label}
    accessibilityValue={{ min: minimum, max: maximum, now: value, text: valueText }}
    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    onAccessibilityAction={event => select(value + (event.nativeEvent.actionName === 'increment' ? step : -step))}>
    <View pointerEvents="none" style={styles.track}><View style={[styles.fill, { width: `${ratio * 100}%` }]} /></View>
    <View pointerEvents="none" style={[styles.thumb, { left: 14 + ratio * Math.max(0, width - 28), marginLeft: -14 }]} />
  </View>;
}
const styles = StyleSheet.create({
  touch: { height: 52, width: '100%', justifyContent: 'center' },
  track: { height: 8, marginHorizontal: 14, borderRadius: 4, backgroundColor: AppTheme.line, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: AppTheme.yellow },
  thumb: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: AppTheme.yellow, borderWidth: 3, borderColor: AppTheme.surface },
});
