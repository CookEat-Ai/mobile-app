import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { AppTheme } from '../constants/AppTheme';

export function CameraBrand({ color = AppTheme.onPrimary }: { color?: string }) {
  return <View style={styles.row} pointerEvents="none"><Text style={[styles.text, { color }]}>CookEat</Text><Image source={require('../assets/images/mascot.png')} style={styles.mascot} contentFit="contain" accessible={false} /></View>;
}
const styles = StyleSheet.create({
  row: { flex: 1, gap: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  mascot: { width: 52, height: 52, transform: [{ rotate: '20deg' }] },
  text: { fontSize: 22, fontFamily: 'Degular', textShadowColor: 'rgba(0,0,0,.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});
