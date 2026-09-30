import { useFocusEffect } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import { useCallback, useState } from 'react';
import { AppState, Platform } from 'react-native';

/** Never subscribes in release builds. A single bump cannot unlock the control. */
export function useDevShakeReveal(enabled: boolean) {
  const [unlocked, setUnlocked] = useState(false);
  useFocusEffect(useCallback(() => {
    if (!__DEV__ || !enabled || Platform.OS === 'web') return;
    let cancelled = false;
    let sensor: ReturnType<typeof Accelerometer.addListener> | undefined;
    let hits: number[] = [];
    const stop = () => { sensor?.remove(); sensor = undefined; hits = []; };
    const start = async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (cancelled || !available || sensor || AppState.currentState !== 'active') return;
        Accelerometer.setUpdateInterval(100);
        sensor = Accelerometer.addListener(({ x, y, z }) => {
          if (Math.sqrt(x * x + y * y + z * z) < 1.8) return;
          const now = Date.now();
          hits = [...hits.filter(at => now - at < 1200), now];
          if (hits.length < 3) return;
          setUnlocked(true);
          stop();
        });
      } catch { /* A simulator or denied sensor must not affect the planning. */ }
    };
    void start();
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') void start(); else stop();
    });
    return () => {
      cancelled = true;
      stop();
      appState.remove();
      setUnlocked(false);
    };
  }, [enabled]));
  return __DEV__ && unlocked;
}
