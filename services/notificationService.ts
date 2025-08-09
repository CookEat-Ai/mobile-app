import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  /**
 * Demande les permissions pour les notifications et récupère le token
 */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    let token = null;

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        // Demander les permissions système (iOS affichera notre message personnalisé depuis Info.plist)
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permission pour les notifications refusée par l\'utilisateur');
        Alert.alert(
          "Notifications désactivées",
          "Vous pouvez activer les notifications plus tard dans Réglages > CookEat > Notifications pour ne pas rater nos rappels culinaires !",
          [{ text: "OK" }]
        );
        return null;
      }

      try {
        token = (await Notifications.getExpoPushTokenAsync()).data;
        this.expoPushToken = token;

        // Sauvegarder le token localement
        await AsyncStorage.setItem('expoPushToken', token);

        // Envoyer le token au serveur
        await this.sendTokenToServer(token);

        console.log('✅ Token de notification obtenu:', token);
      } catch (error) {
        console.error('❌ Erreur lors de l\'obtention du token:', error);
      }
    } else {
      console.log('❌ Les notifications push ne fonctionnent que sur un appareil physique');
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FEB50A',
      });
    }

    return token;
  }

  /**
   * Envoie le token au serveur
   */
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      const mobileId = await this.getMobileId();
      if (mobileId) {
        await apiService.updateNotificationToken(mobileId, token);
        console.log('✅ Token envoyé au serveur avec succès');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du token au serveur:', error);
    }
  }

  /**
   * Récupère l'ID mobile de l'appareil
   */
  private async getMobileId(): Promise<string | null> {
    try {
      const DeviceInfo = await import('react-native-device-info');
      return await DeviceInfo.default.getUniqueId();
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du mobileId:', error);
      return null;
    }
  }

  /**
   * Met à jour l'activité de l'utilisateur
   */
  async updateUserActivity(): Promise<void> {
    try {
      const mobileId = await this.getMobileId();
      if (mobileId) {
        await apiService.updateUserActivity(mobileId);
        console.log('✅ Activité utilisateur mise à jour');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de l\'activité:', error);
    }
  }

  /**
   * Planifie une notification locale
   */
  async scheduleLocalNotification(title: string, body: string, delayInSeconds: number = 0): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: { type: 'activity_reminder' },
        },
        trigger: delayInSeconds > 0 ? {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delayInSeconds
        } : null,
      });
      console.log('✅ Notification locale planifiée');
    } catch (error) {
      console.error('❌ Erreur lors de la planification de la notification:', error);
    }
  }

  /**
   * Écoute les notifications reçues
   */
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Écoute les interactions avec les notifications
   */
  addNotificationResponseReceivedListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Récupère le token stocké
   */
  getStoredToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Efface toutes les notifications
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Vérifie si les notifications sont autorisées
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Demande les notifications avec un dialogue personnalisé (peut être appelé plus tard)
   */
  async requestNotificationsWithContext(): Promise<boolean> {
    const isEnabled = await this.areNotificationsEnabled();
    if (isEnabled) {
      console.log('✅ Notifications déjà activées');
      return true;
    }

    const result = await this.registerForPushNotificationsAsync();
    return result !== null;
  }



  /**
   * Affiche les instructions pour activer manuellement les notifications
   */
  showManualNotificationInstructions(): void {
    const instructions = Platform.OS === 'ios'
      ? "Allez dans Réglages > CookEat > Notifications et activez 'Autoriser les notifications'"
      : "Allez dans Paramètres > Apps > CookEat > Notifications et activez les notifications";

    Alert.alert(
      "Activer les notifications",
      `Pour recevoir nos rappels culinaires :\n\n${instructions}`,
      [{ text: "Compris" }]
    );
  }
}

export const notificationService = new NotificationService();
