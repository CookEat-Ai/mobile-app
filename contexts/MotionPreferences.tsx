import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';

const MotionContext = createContext({ enabled: false, foreground: false, ready: false });

/** One system subscription for all entrance animations in the app. */
export function MotionPreferencesProvider({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [foreground, setForeground] = useState(Platform.OS === 'web' || AppState.currentState === 'active');
  useEffect(() => {
    let active = true;
    let reduced: boolean | undefined;
    let reader: boolean | undefined;
    const update = () => { if (active && reduced !== undefined && reader !== undefined) { setAllowed(!reduced && !reader); setReady(true); } };
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reduced = value; update(); });
    const screenReader = AccessibilityInfo.addEventListener('screenReaderChanged', value => { reader = value; update(); });
    const appState = AppState.addEventListener('change', state => setForeground(state === 'active'));
    void Promise.all([AccessibilityInfo.isReduceMotionEnabled(), AccessibilityInfo.isScreenReaderEnabled()])
      .then(([reduceMotion, screenReaderEnabled]) => { reduced ??= reduceMotion; reader ??= screenReaderEnabled; update(); })
      .catch(() => { if (active) { setAllowed(false); setReady(true); } });
    return () => { active = false; motion.remove(); screenReader.remove(); appState.remove(); };
  }, []);
  return <MotionContext.Provider value={{enabled:allowed,foreground,ready}}>{children}</MotionContext.Provider>;
}

export function useMotionAllowed() {
  const {enabled,foreground}=useContext(MotionContext);
  return enabled && foreground;
}

/** Background suspension is different from an accessibility motion opt-out. */
export function useMotionPreferences() { return useContext(MotionContext); }
