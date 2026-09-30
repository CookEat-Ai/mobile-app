import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

const MotionContext = createContext(false);

/** One system subscription for all entrance animations in the app. */
export function MotionPreferencesProvider({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let active = true;
    let reduced = true;
    let reader = false;
    const update = () => { if (active) setAllowed(!reduced && !reader); };
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reduced = value; update(); });
    const screenReader = AccessibilityInfo.addEventListener('screenReaderChanged', value => { reader = value; update(); });
    const appState = AppState.addEventListener('change', state => setForeground(state === 'active'));
    void Promise.all([AccessibilityInfo.isReduceMotionEnabled(), AccessibilityInfo.isScreenReaderEnabled()])
      .then(([reduceMotion, screenReaderEnabled]) => { reduced = reduceMotion; reader = screenReaderEnabled; update(); })
      .catch(() => { if (active) setAllowed(false); });
    return () => { active = false; motion.remove(); screenReader.remove(); appState.remove(); };
  }, []);
  return <MotionContext.Provider value={allowed && foreground}>{children}</MotionContext.Provider>;
}

export function useMotionAllowed() {
  return useContext(MotionContext);
}
