import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../services/notificationService';
import { router } from 'expo-router';

export function useNotifications() {
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    // Initialiser les notifications
    initializeNotifications();

    // Écouter les notifications reçues
    notificationListener.current = notificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('📱 Notification reçue:', notification);
      }
    );

    // Écouter les interactions avec les notifications
    responseListener.current = notificationService.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification touchée:', response);
        handleNotificationResponse(response);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      await notificationService.registerForPushNotificationsAsync();
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des notifications:', error);
    }
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const { notification } = response;
    const data = notification.request.content.data;

    // Gérer différents types de notifications
    switch (data?.type) {
      case 'activity_reminder':
        // Rediriger vers l'écran principal pour encourager l'activité
        router.push('/(tabs)');
        break;
      default:
        // Comportement par défaut
        router.push('/(tabs)');
        break;
    }
  };

  const updateActivity = async () => {
    try {
      await notificationService.updateUserActivity();
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de l\'activité:', error);
    }
  };

  return {
    updateActivity,
  };
}
