import appsFlyer from 'react-native-appsflyer';
import { AF_DEV_KEY, AF_APP_ID } from '../config/appsflyer';

class AppsFlyerService {
  private isInitialized = false;

  init() {
    if (this.isInitialized) return;

    appsFlyer.initSdk(
      {
        devKey: AF_DEV_KEY,
        isDebug: __DEV__,
        appId: AF_APP_ID,
        onInstallConversionDataListener: true,
        onDeepLinkListener: true,
        timeToWaitForATTUserAuthorization: 10, // Optionnel, si vous utilisez ATT plus tard
      },
      (result: unknown) => {
        console.log('✅ AppsFlyer initialisé:', result);
        this.isInitialized = true;
      },
      (error: any) => {
        console.error('❌ Erreur initialisation AppsFlyer:', error);
      }
    );
  }

  trackEvent(eventName: string, eventValues: Record<string, any> = {}) {
    if (!this.isInitialized) {
      console.warn('AppsFlyer non initialisé. Événement ignoré:', eventName);
      return;
    }

    appsFlyer.logEvent(
      eventName,
      eventValues,
      (result: unknown) => {
        console.log(`✅ AppsFlyer Event: ${eventName} envoyé`, result);
      },
      (error: any) => {
        console.error(`❌ Erreur AppsFlyer Event: ${eventName}`, error);
      }
    );
  }

  setCustomerUserId(userId: string) {
    appsFlyer.setCustomerUserId(userId, (res: unknown) => {
      console.log('✅ AppsFlyer Customer User ID défini');
    });
  }
}

const appsFlyerService = new AppsFlyerService();
export default appsFlyerService;
