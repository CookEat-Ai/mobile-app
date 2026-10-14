import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { planningGenerationWindow } from '../services/planning-time';

/** Refresh visible meal availability at cutoffs and after returning to the app. */
export function usePlanningClock() {
  const [timestamp, setTimestamp] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setTimestamp(Date.now());
    const timer = setInterval(refresh, 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  return useMemo(() => {
    const now = new Date(timestamp);
    return { ...planningGenerationWindow(undefined, now), now };
  }, [timestamp]);
}
