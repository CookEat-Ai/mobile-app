import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';
import { ENTITLEMENT_ID } from '../config/revenuecat';
import i18n from '../i18n';
import analytics from './analytics';

const TRIAL_REMINDER_TYPE = 'trial_ending_reminder';
const TRIAL_REMINDER_CHANNEL = 'trial-reminders';
const INTENT_KEY = '@cookeat_trial_reminder_intent';
const SCHEDULED_ID_KEY = '@cookeat_trial_reminder_notification_id';
const SCHEDULED_EXPIRATION_KEY = '@cookeat_trial_reminder_expiration';

async function cancelPersistedReminder(reason: string): Promise<void> {
  const identifier = await AsyncStorage.getItem(SCHEDULED_ID_KEY);
  if (identifier) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // La notification a peut-être déjà été livrée ou supprimée par le système.
    }
  }
  await AsyncStorage.multiRemove([SCHEDULED_ID_KEY, SCHEDULED_EXPIRATION_KEY]);
  if (identifier) analytics.track('trial_reminder_cancelled', { reason });
}

export async function hasTrialReminderIntent(): Promise<boolean> {
  return (await AsyncStorage.getItem(INTENT_KEY)) === 'enabled';
}

export async function requestTrialReminderIntent(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  const response = existing.status === 'granted'
    ? existing
    : await Notifications.requestPermissionsAsync();
  const enabled = response.status === 'granted';

  await AsyncStorage.setItem(INTENT_KEY, enabled ? 'enabled' : 'denied');
  analytics.track('trial_reminder_intent_selected', { enabled });
  analytics.track('notification_permission_result', {
    context: 'trial_midpoint_reminder',
    status: response.status,
  });
  return enabled;
}

export async function declineTrialReminderIntent(): Promise<void> {
  await AsyncStorage.setItem(INTENT_KEY, 'declined');
  await cancelPersistedReminder('intent_declined');
  analytics.track('trial_reminder_intent_selected', { enabled: false, choice: 'continue_without' });
}

/**
 * Réconcilie le rappel local avec l'état RevenueCat.
 *
 * La notification n'est créée qu'après confirmation d'un vrai entitlement en
 * période TRIAL. Son horaire est le milieu exact entre la date d'achat connue
 * par RevenueCat et l'expiration. L'appel est idempotent et annule le rappel si
 * l'essai est converti, expiré ou révoqué.
 */
export async function syncTrialReminderWithCustomerInfo(customerInfo: CustomerInfo): Promise<void> {
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  const isTrial = entitlement && String(entitlement.periodType || '').toUpperCase() === 'TRIAL';

  if (!isTrial) {
    await cancelPersistedReminder('trial_inactive');
    return;
  }

  if (!(await hasTrialReminderIntent())) return;

  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') {
    await cancelPersistedReminder('permission_not_granted');
    analytics.track('trial_reminder_schedule_failed', { reason: 'permission_not_granted' });
    return;
  }

  const expiration = entitlement.expirationDate ? new Date(entitlement.expirationDate) : null;
  const purchaseDateValue = (entitlement as any).latestPurchaseDate
    || (entitlement as any).originalPurchaseDate;
  const purchaseDate = purchaseDateValue ? new Date(purchaseDateValue) : new Date();

  if (
    !expiration
    || Number.isNaN(expiration.getTime())
    || Number.isNaN(purchaseDate.getTime())
    || expiration.getTime() <= purchaseDate.getTime()
  ) {
    analytics.track('trial_reminder_schedule_failed', { reason: 'invalid_trial_dates' });
    return;
  }

  const reminderDate = new Date(
    purchaseDate.getTime() + (expiration.getTime() - purchaseDate.getTime()) / 2,
  );
  if (reminderDate.getTime() <= Date.now()) {
    await cancelPersistedReminder('midpoint_passed');
    analytics.track('trial_reminder_schedule_failed', { reason: 'midpoint_passed' });
    return;
  }

  const expirationIso = expiration.toISOString();
  const [storedIdentifier, storedExpiration] = await AsyncStorage.multiGet([
    SCHEDULED_ID_KEY,
    SCHEDULED_EXPIRATION_KEY,
  ]).then((pairs) => pairs.map(([, value]) => value));

  if (storedIdentifier && storedExpiration === expirationIso) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (scheduled.some((item) => item.identifier === storedIdentifier)) return;
  }

  await cancelPersistedReminder('reschedule');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(TRIAL_REMINDER_CHANNEL, {
      name: i18n.t('notifications.trialReminder.channelName'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const remainingDays = Math.max(
    1,
    Math.round((expiration.getTime() - reminderDate.getTime()) / 86_400_000),
  );
  const branch = (await analytics.getEntryFeature()) === 'import' ? 'import' : 'generate';

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t(`notifications.trialReminder.${branch}.title`, { count: remainingDays }),
        body: i18n.t(`notifications.trialReminder.${branch}.body`),
        data: {
          type: TRIAL_REMINDER_TYPE,
          expiration_date: expirationIso,
          entry_feature: branch,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
        ...(Platform.OS === 'android' ? { channelId: TRIAL_REMINDER_CHANNEL } : {}),
      },
    });

    await AsyncStorage.multiSet([
      [SCHEDULED_ID_KEY, identifier],
      [SCHEDULED_EXPIRATION_KEY, expirationIso],
    ]);
    analytics.track('trial_reminder_scheduled', {
      entry_feature: branch,
      remaining_days: remainingDays,
      trial_duration_days: Math.round(
        (expiration.getTime() - purchaseDate.getTime()) / 86_400_000,
      ),
    });
  } catch (error) {
    analytics.track('trial_reminder_schedule_failed', {
      reason: error instanceof Error ? error.name : 'unknown',
    });
    throw error;
  }
}
