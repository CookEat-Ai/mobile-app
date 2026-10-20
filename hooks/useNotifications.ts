import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../services/notificationService';
import { router, useRootNavigationState } from 'expo-router';
import analytics from '../services/analytics';

/** Refresh timezone/token on return without asking for permission at startup. */
export function useNotifications() {
  const rootNavigation = useRootNavigationState();
  const handled = useRef<string | null>(null), syncing = useRef(false);
  const sync = async () => {
    if (Platform.OS === 'web' || syncing.current) return;
    syncing.current = true;
    try {
      await notificationService.updateUserActivity();
      if (await notificationService.areNotificationsEnabled()) await notificationService.registerForPushNotificationsAsync(false);
    } catch { /* Retry on the next foreground transition. */ }
    finally { syncing.current = false; }
  };
  const syncRef = useRef(sync); syncRef.current = sync;
  useEffect(() => {
    void syncRef.current();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void syncRef.current(); });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (Platform.OS === 'web' || !rootNavigation?.key) return;
    let active = true;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!active || !response || handled.current === response.notification.request.identifier) return;
      handled.current = response.notification.request.identifier;
      const data = response.notification.request.content.data;
      if (data?.type === 'trial_ending_reminder') void analytics.track('trial_reminder_opened', {entry_feature: data?.entry_feature ?? null});
      router.push('/(tabs)/tracking');
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    const listener = notificationService.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => undefined);
    return () => { active = false; listener.remove(); };
  }, [rootNavigation?.key]);
  return { updateActivity: () => notificationService.updateUserActivity() };
}
