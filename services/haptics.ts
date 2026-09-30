import * as Haptics from 'expo-haptics';
import { AppState, Platform } from 'react-native';

type Feedback = 'selection' | 'light' | 'confirm' | 'success' | 'error' | 'heavy' | 'warning';
const lastFeedback = new Map<Feedback, number>();

/** Feedback never delays or changes the result of a user action. */
function emit(kind: Feedback) {
  if (Platform.OS === 'web' || AppState.currentState !== 'active') return Promise.resolve();
  const now = Date.now();
  if (now - (lastFeedback.get(kind) ?? -Infinity) < 100) return Promise.resolve();
  lastFeedback.set(kind, now);
  try {
    const androidType = kind === 'selection' ? Haptics.AndroidHaptics.Segment_Tick
      : kind === 'success' ? Haptics.AndroidHaptics.Confirm
      : kind === 'error' || kind === 'warning' ? Haptics.AndroidHaptics.Reject
      : kind === 'heavy' ? Haptics.AndroidHaptics.Long_Press
      : kind === 'confirm' ? Haptics.AndroidHaptics.Context_Click
      : Haptics.AndroidHaptics.Keyboard_Tap;
    const result = Platform.OS === 'android' ? Haptics.performAndroidHapticsAsync(androidType)
      : kind === 'selection' ? Haptics.selectionAsync()
      : kind === 'light' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : kind === 'confirm' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      : kind === 'heavy' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      : Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : kind === 'warning' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Error);
    void result.catch(() => {});
  } catch { /* Missing/unavailable hardware must not become an application error. */ }
  return Promise.resolve();
}

export const feedback = {
  selection: () => emit('selection'),
  light: () => emit('light'),
  confirm: () => emit('confirm'),
  success: () => emit('success'),
  error: () => emit('error'),
  heavy: () => emit('heavy'),
  warning: () => emit('warning'),
};
