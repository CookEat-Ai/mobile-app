import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppTheme } from '../../constants/AppTheme';

/** Cream warmth in the top-right corner, fading to white towards the bottom. Render it first so content stays above. */
export function AppBackground({ height }: { height?: number }) {
  return <LinearGradient pointerEvents="none" colors={AppTheme.backgroundGradient} locations={[0, 0.42, 0.85]} start={{ x: 1, y: 0 }} end={{ x: 0.25, y: 1 }}
    style={height === undefined ? StyleSheet.absoluteFill : [styles.top, { height }]} />;
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
});
