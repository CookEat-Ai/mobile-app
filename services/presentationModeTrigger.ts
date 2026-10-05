const listeners = new Set<() => void>();
export function subscribePresentationModePrompt(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function requestPresentationModePrompt() { listeners.forEach(listener => listener()); }

/** Seven consecutive Settings presses; another tab or a pause resets the sequence. */
export function createSettingsTapDetector() {
  let count = 0;
  let lastTap = 0;
  return (settings: boolean, now: number) => {
    if (!settings) { count = 0; lastTap = 0; return false; }
    count = now - lastTap > 1500 ? 1 : count + 1;
    lastTap = now;
    if (count < 7) return false;
    count = 0;
    return true;
  };
}
