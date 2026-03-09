import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';
import I18n from '../i18n';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUniqueDeviceId } from './deviceStorage';
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
        // Demander les permissions système
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permission pour les notifications refusée par l\'utilisateur');
        return null;
      }

      try {
        // Récupérer le projectId depuis Constants
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                         Constants.easConfig?.projectId;

        if (!projectId) {
          console.error('❌ projectId EAS manquant dans app.json');
        }

        token = (await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        })).data;
        
        this.expoPushToken = token;

        // Sauvegarder le token localement
        await AsyncStorage.setItem('expoPushToken', token);

        // Envoyer le token au serveur
        await this.sendTokenToServer(token);

        console.log('✅ Token de notification obtenu:', token);
      } catch (error) {
        console.error('❌ Erreur lors de l\'obtention du token:', error);
        // Ne pas bloquer l'exécution si les notifications échouent
      }
    } else {
      console.log('❌ Les notifications push ne fonctionnent que sur un appareil physique');
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FEB50A',
        });
      } catch (e) {
        console.error('❌ Erreur lors de la configuration du canal Android:', e);
      }
    }

    return token;
  }

  /**
   * Envoie le token au serveur
   */
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      const mobileId = await this.getMobileId();
      const timezone = Localization.getCalendars()[0].timeZone || undefined;
      if (mobileId) {
        await apiService.updateNotificationToken(mobileId, token, timezone);
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
      return await getUniqueDeviceId();
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
      const timezone = Localization.getCalendars()[0].timeZone || undefined;
      if (mobileId) {
        await apiService.updateUserActivity(mobileId, timezone);
        console.log('✅ Activité utilisateur mise à jour');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de l\'activité:', error);
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
      ? I18n.t('notifications.manualInstructionIOS')
      : I18n.t('notifications.manualInstructionAndroid');

    Alert.alert(
      I18n.t('notifications.activateTitle'),
      `${I18n.t('notifications.activateMessage')}\n\n${instructions}`,
      [{ text: I18n.t('notifications.understood') }]
    );
  }
}

export const notificationService = new NotificationService();
